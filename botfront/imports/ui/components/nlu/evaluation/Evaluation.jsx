import React from 'react';
import PropTypes from 'prop-types';
import Alert from 'react-s-alert';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import {
    Button,
    Form,
    Icon,
    Message,
    Tab,
} from 'semantic-ui-react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';

import { activityQuery } from '../activity/queries';
import apolloClient from '../../../../startup/client/apollo';

import IntentReport from './IntentReport';
import EntityReport from './EntityReport';
import { InputButtons } from './InputButtons.jsx';
import { Evaluations } from '../../../../api/nlu_evaluation';
import UploadDropzone from '../../utils/UploadDropzone';
import { Loading } from '../../utils/Utils';
import { can } from '../../../../lib/scopes';
import { readNluFromCsv } from '../../../../lib/nlu.utils';
import { toUtf8 } from '../../../../lib/encoding.utils';
import 'react-select/dist/react-select.css';


class Evaluation extends React.Component {
    constructor(props) {
        super(props);
        const { evaluation, initialState, validationRender } = props;

        let defaultSelection = 0;
        if (validationRender()) defaultSelection = 2;

        this.state = {
            evaluation,
            data: null,
            loading: false,
            evaluating: false,
            exampleSet: 'train',
            errorMessage: null,
            selectedIndex: defaultSelection,
            ...initialState,
        };

        this.evaluate = this.evaluate.bind(this);
        this.loadData = this.loadData.bind(this);
    }

    componentWillReceiveProps(props) {
        const { evaluation } = props;
        this.setState({ evaluation });
    }

    getPrimaryPanes() {
        const {
            evaluation: {
                results: {
                    intent_evaluation: intentEvaluation,
                    entity_evaluation: entityEvaluation,
                } = {},
            } = {},
        } = this.state;

        const { t } = this.props;

        const menuItems = [];
        if (intentEvaluation) {
            menuItems.push({
                menuItem: t('Intents'),
                render: () => <IntentReport {...intentEvaluation} />,
            });
        }
        if (entityEvaluation && Object.keys(entityEvaluation).length > 0) {
            menuItems.push({
                menuItem: t('Entities'),
                render: () => <EntityReport {...entityEvaluation} />,
            });
        }

        return menuItems;
    }

    evaluate() {
        this.setState({ evaluating: true });
        const { projectId, workingLanguage, t } = this.props;

        const { data } = this.state;

        Meteor.apply('rasa.evaluate.nlu', [projectId, workingLanguage, data], { noRetry: true }, (err) => {
            this.setState({ evaluating: false });
            if (err) {
                Alert.error(`${t('Error')}: ${JSON.stringify(err.reason)}`, {
                    position: 'top-right',
                    timeout: 'none',
                });
            }
        });
    }

    useTestSet() {
        this.changeExampleSet('test', true);
    }

    useTrainingSet() {
        this.changeExampleSet('train');
    }

    async useValidatedSet() {
        this.changeExampleSet('validation', true);
        const { projectId, t, workingLanguage: language } = this.props;
        const { data: { getActivity: { activity: examples } } } = await apolloClient.query({
            query: activityQuery,
            variables: {
                projectId, language, validated: true, pageSize: 0,
            },
        });
        const validExamples = examples.filter(({ validated }) => validated);
        // Check that there are nonzero validated examples
        if (validExamples.length > 0) {
            this.setState({
                data: { rasa_nlu_data: { common_examples: validExamples, entity_synonyms: [], gazette: [] } },
                loading: false,
            });
        } else {
            const message = (
                <Message warning>
                    <Message.Header>{t('No validated examples')}</Message.Header>
                    <p>{t('See the activity section to manage incoming traffic to this model')}</p>
                </Message>
            );
            this.setState({ errorMessage: message, loading: false });
        }
    }

    changeExampleSet(exampleSet, loading = false) {
        this.setState({
            exampleSet,
            loading,
            data: null,
            errorMessage: null,
        });
    }

    loadData(data) {
        const { loading } = this.state;
        const { t } = this.props;
        const textData = toUtf8(Buffer.from(data));
        let parsed;
        try {
            parsed = JSON.parse(textData);
        } catch (e) {
            parsed = readNluFromCsv(textData);
            if (!parsed) {
                Alert.error(t('Error: you must upload a JSON or CSV file with the same format as an export'), {
                    position: 'top',
                    timeout: 'none',
                });
                return;
            }
        }
        if (/\ufffd/.test(parsed)) {
            // out of range char test
            Alert.error(t('Error: invalid file encoding'), {
                position: 'top',
                timeout: 'none',
            });
            return;
        }
        if (loading) this.setState({ data: parsed, loading: false });
    }

    render() {
        const {
            validationRender,
            evaluation,
            loading: reportLoading,
            projectId,
            t,
        } = this.props;

        const {
            data,
            exampleSet,
            errorMessage,
            evaluating,
            loading: dataLoading,
            selectedIndex,
        } = this.state;

        let defaultSelection = 0;
        if (validationRender()) {
            defaultSelection = 2;
        }

        return (
            <Tab.Pane textAlign='center'>
                <Loading loading={reportLoading}>
                    {errorMessage}
                    <br />
                    <Form>
                        {can('nlu-data:x', projectId) && (
                            <>
                                <div id='test_set_buttons'>
                                    <InputButtons
                                        labels={[t('Use training set'), t('Upload test set'), t('Use validated examples')]}
                                        operations={[this.useTrainingSet.bind(this), this.useTestSet.bind(this), this.useValidatedSet.bind(this)]}
                                        defaultSelection={defaultSelection}
                                        onDefaultLoad={defaultSelection === 2 ? this.evaluate : () => {}}
                                        selectedIndex={selectedIndex}
                                    />
                                </div>
                                {exampleSet === 'test' && <UploadDropzone success={!!data} onDropped={this.loadData} binary />}
                                {!dataLoading && !errorMessage && (
                                    <div>
                                        <Button type='submit' basic fluid color='green' loading={evaluating} onClick={this.evaluate} data-cy='start-evaluation'>
                                            <Icon name='percent' />
                                            {t('Start evaluation')}
                                        </Button>
                                        <br />
                                    </div>
                                )}
                            </>
                        )}
                        {!!evaluation && !evaluating && (
                            <Tab menu={{ pointing: true, secondary: true }} panes={this.getPrimaryPanes()} />
                        )}
                    </Form>
                </Loading>
            </Tab.Pane>
        );
    }
}

Evaluation.propTypes = {
    evaluation: PropTypes.object,
    projectId: PropTypes.string.isRequired,
    workingLanguage: PropTypes.string.isRequired,
    loading: PropTypes.bool.isRequired,
    validationRender: PropTypes.func,
    initialState: PropTypes.object,
};

Evaluation.defaultProps = {
    validationRender: () => false,
    evaluation: undefined,
    initialState: {},
};

const EvaluationContainer = withTracker((props) => {
    const {
        projectId,
        workingLanguage,
        validationRender,
    } = props;

    const evalsHandler = Meteor.subscribe('nlu_evaluations', projectId, workingLanguage);
    return {
        projectId,
        workingLanguage,
        validationRender,
        evaluation: Evaluations.findOne({ projectId, language: workingLanguage }),
        loading: !evalsHandler.ready(),
    };
})(withTranslation('nlu')(Evaluation));

const mapStateToProps = state => ({
    workingLanguage: state.settings.get('workingLanguage'),
    projectId: state.settings.get('projectId'),
});

export default connect(mapStateToProps)(EvaluationContainer);
