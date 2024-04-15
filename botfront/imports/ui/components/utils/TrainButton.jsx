import React from 'react';
import PropTypes from 'prop-types';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import {
    Button,
    Popup,
    Icon,
    Checkbox,
    Dropdown,
    Confirm,
    Modal,
} from 'semantic-ui-react';
import { get } from 'lodash';
import Alert from 'react-s-alert';
import 'react-s-alert/dist/s-alert-default.css';
import { withTranslation } from 'react-i18next';

import { wrapMeteorCallback } from './Errors';
import { StoryGroups } from '../../../api/storyGroups/storyGroups.collection';
import { Projects } from '../../../api/project/project.collection';
import RevertTable from './RevertTable';
import { ProjectContext } from '../../layouts/context';
import { can, Can } from '../../../lib/scopes';
import { languages } from '../../../lib/languages';
import { runTestCaseStories } from './runTestCaseStories';

class TrainButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            modalOpen: { production: false },
            webhooks: {},
        };
    }

    componentDidMount() {
        const {
            project: { _id: projectId },
        } = this.context;
        // TODO: use subscription
        // if (can('projects:w', projectId)) {
        //     Meteor.call(
        //         'getDeploymentWebhook',
        //         projectId,
        //         wrapMeteorCallback((err, result) => {
        //             if (err) return;
        //             const webhook = get(
        //                 result,
        //                 'settings.private.webhooks.deploymentWebhook',
        //                 {},
        //             );
        //             this.setState({ webhook });
        //         }),
        //     );
        // }
        this.commitMessage = React.createRef();
        this.revertTable = React.createRef();
    }

    copyToClipboard = () => {
        const {
            project: { _id: projectId },
        } = this.context;
        const dummy = document.createElement('textarea');
        document.body.appendChild(dummy);
        dummy.value = `${window.location.origin.toString()}/chat/${projectId}/`;
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
    };

    train = (target = 'development') => {
        const {
            project: { _id: projectId },
            language,
        } = this.context;
        Meteor.call('project.markTrainingStarted', projectId);
        Meteor.apply('rasa3.train', [projectId, target, language], { noRetry: true }, wrapMeteorCallback());
    };

    showModal = (env, visible) => {
        const modalOpen = this.state;
        this.setState({ modalOpen: { ...modalOpen, [env]: visible } });
    };

    commitAndPush = () => {
        const {
            project: { _id: projectId },
        } = this.context;
        this.setState({ gitWorking: true });
        Meteor.call(
            'commitAndPushToRemote',
            projectId,
            this.commitMessage?.current?.value,
            wrapMeteorCallback((err, { status: { code, msg } = {} } = {}) => {
                this.setState({ gitWorking: false });
                this.showModal('commit-and-push', false);
                if (err) return;
                Alert[code === 204 ? 'warning' : 'success'](msg, {
                    position: 'top-right',
                    timeout: 2 * 1000,
                });
            }),
        );
    };

    renderCommitModal = () => {
        const { gitWorking } = this.state;
        const { t } = this.props;
        return (
            <Modal
                open
                size='small'
                header={t('Commit and push')}
                onClick={e => e.stopPropagation()}
                content={(
                    <div
                        className='side-by-side middle ui form'
                        style={{ padding: '1em' }}
                    >
                        <input
                            className='ui input'
                            placeholder={t('Commit message')}
                            data-cy='commit-message-input'
                            ref={this.commitMessage}
                            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
                            onKeyDown={({ key }) => {
                                if (key === 'Enter') this.commitAndPush();
                                if (key === 'Escape') {
                                    if (!gitWorking) this.showModal('commit-and-push', false);
                                }
                            }}
                        />
                        <Button
                            type='submit'
                            onClick={() => this.commitAndPush()}
                            content={t('Push to remote')}
                            loading={gitWorking}
                            disabled={gitWorking}
                        />
                    </div>
                )}
                onClose={() => {
                    if (!gitWorking) this.showModal('commit-and-push', false);
                }}
            />
        );
    };

    renderRevertModal = () => {
        const { gitWorking } = this.state;
        const { t } = this.props;
        return (
            <Modal
                open
                size='small'
                header={t('Revert to previous')}
                onClick={e => e.stopPropagation()}
                content={(
                    <RevertTable
                        ref={this.revertTable}
                        useGitWorkingState={() => [
                            gitWorking,
                            v => this.setState({ gitWorking: v }),
                        ]}
                    />
                )}
                onClose={() => {
                    if (!gitWorking) {
                        this.showModal('revert-to-previous', false);
                    }
                }}
            />
        );
    };

    renderDropdownMenu = () => {
        const {
            project: { deploymentEnvironments: environments = [] },
            instance,
        } = this.context;
        const { status, t } = this.props;
        const trainingInProgress = status === 'training' || status === 'notReachable' || !instance;
        const { webhook } = this.state;
        const { modalOpen } = this.state;
        const deployOptions = !webhook?.url
            ? []
            : environments.map(env => ({
                key: env,
                value: env,
                text: `${t('Deploy to')} ${env}`,
            }));
        // explicitly define the dropdown so we don't get the highlighted selection
        return (
            <Dropdown
                className='button icon'
                data-cy='train-and-deploy'
                floating
                disabled={trainingInProgress}
                trigger={<React.Fragment />}
            >
                <Dropdown.Menu>
                    {this.renderTestingOptions()}
                    {deployOptions.map(opt => (
                        <React.Fragment key={opt.key}>
                            <Dropdown.Item
                                data-cy='trigger-deployment'
                                value={opt.value}
                                onClick={() => this.showModal(opt.value, true)}
                            >
                                {opt.text}
                            </Dropdown.Item>
                            <Confirm
                                data-cy='deployment-confirmation-modal'
                                open={modalOpen[opt.value]}
                                // we need to stop the propagation, otherwise it reopen the dropdown
                                onCancel={(e) => {
                                    this.showModal(opt.value, false);
                                    e.stopPropagation();
                                }}
                                onConfirm={(e) => {
                                    this.trainAndDeploy(opt.value);
                                    this.showModal(opt.value, false);
                                    e.stopPropagation();
                                }}
                                content={`${t('Do you really want to deploy your project to')} ${opt.value}`}
                            />
                        </React.Fragment>
                    ))}
                </Dropdown.Menu>
            </Dropdown>
        );
    };

    deploy = (target) => {
        const {
            project: { _id: projectId },
        } = this.context;
        const { webhook } = this.state;
        const isTest = !!window.Cypress;
        const { t } = this.props;

        try {
            if (!webhook.url || !webhook.method) {
                throw new Error(t('Deployment failed: the webhook parameters are missing'));
            }
            if (!target) {
                throw new Error(t('Deployment failed: the deployment target is missing'));
            }
            Meteor.call('deploy.model', projectId, target, isTest, (err, response) => {
                if (err || response === undefined || response.status !== 200) {
                    Alert.error(`${t('Deployment failed')}: ${err.message}`, {
                        position: 'top-right',
                        timeout: 120000,
                    });
                }
                if (response.status === 200) {
                    Alert.success(
                        response.data.message,
                        {
                            position: 'top-right',
                            timeout: 120000,
                        },
                    );
                }
            });
        } catch (e) {
            Alert.error(e.message, {
                position: 'top-right',
                timeout: 10000,
            });
        }
    };

    trainAndDeploy = async (target) => {
        try {
            const loadModel = target === 'development'; // automaticly load the model only if we are in development
            this.deploy(target);
        } catch (e) {
            const { t } = this.props;
            Alert.error(t('Cannot deploy, training failed'), {
                position: 'top-right',
                timeout: 3000,
            });
        }
    };

    renderTestingOptions = () => {
        const {
            project: { _id: projectId },
            language,
        } = this.context;
        const { t } = this.props;
        const languageName = languages[language]?.name;
        return (
            <>
                <Dropdown.Item
                    onClick={() => runTestCaseStories(projectId)}
                    data-cy='run-all-tests'
                >
                    {t('Run all tests')}
                </Dropdown.Item>
                {!!languageName && (
                    <Dropdown.Item
                        onClick={() => runTestCaseStories(projectId, { language })}
                        data-cy='run-lang-tests'
                    >
                        {t('Run all')} {languages[language]?.name} {t('tests')}
                    </Dropdown.Item>
                )}
            </>
        );
    };

    renderButton = () => {
        const { instance } = this.context;
        const {
            nSelectedStoryGroups, status, t,
        } = this.props;
        const partialTrainning = nSelectedStoryGroups > 0;
        let popupContent = '';
        if (partialTrainning && nSelectedStoryGroups > 1) {
            popupContent = `${t('Train NLU and stories from')} ${nSelectedStoryGroups} ${t('focused story groups')}.`;
        } else if (nSelectedStoryGroups && nSelectedStoryGroups === 1) {
            popupContent = t('Train NLU and stories from 1 focused story group.');
        } else if (status === 'notReachable') {
            popupContent = t('Rasa instance not reachable');
        }
        return (
            <Popup
                content={popupContent}
                trigger={(
                    <Button.Group color={partialTrainning ? 'yellow' : 'blue'}>
                        <Button
                            icon={partialTrainning ? 'eye' : 'grid layout'}
                            content={t('Train')}
                            labelPosition='left'
                            disabled={
                                status === 'training'
                                || status === 'notReachable'
                                || !instance
                            }
                            loading={status === 'training'}
                            onClick={() => {
                                this.train();
                            }}
                            data-cy='train-button'
                        />
                        {this.renderDropdownMenu()}
                    </Button.Group>
                )}
                // Popup is disabled while training
                disabled={status === 'training' || popupContent === ''}
                inverted
                size='tiny'
            />
        );
    };

    renderGitButton = () => {
        const {
            project: { gitSettings: { gitString } = {} },
            instance,
        } = this.context;
        const { status, t } = this.props;
        const rasaDown = !instance || status === 'notReachable';
        const { modalOpen, gitWorking } = this.state;
        if (!gitString) return null;
        const button = (
            <>
                <Dropdown
                    trigger={(
                        <Button
                            icon='git'
                            color='black'
                            basic
                            data-cy='git-dropdown'
                            loading={gitWorking}
                            disabled={gitWorking}
                        />
                    )}
                    disabled={rasaDown}
                    className='dropdown-button-trigger'
                >
                    <Dropdown.Menu direction='left'>
                        <Dropdown.Item
                            icon='cloud upload'
                            text={t('Commit and push')}
                            data-cy='commit-and-push'
                            onClick={() => this.showModal('commit-and-push', true)}
                        />
                        <Dropdown.Item
                            icon='step backward'
                            text={t('Revert to previous')}
                            data-cy='revert-to-previous'
                            onClick={() => this.showModal('revert-to-previous', true)}
                        />
                    </Dropdown.Menu>
                </Dropdown>
                {modalOpen['commit-and-push'] && this.renderCommitModal()}
                {modalOpen['revert-to-previous'] && this.renderRevertModal()}
            </>
        );
        if (!rasaDown) return button;
        return (
            <Popup
                size='tiny'
                trigger={<div>{button}</div>}
                inverted
                content={t('Rasa instance not reachable')}
            />
        );
    };

    renderShareLink = () => {
        const {
            project: { enableSharing, _id: projectId },
        } = this.context;
        const { t } = this.props;
        return (
            <Popup
                trigger={(
                    <Icon
                        name='mail forward'
                        data-cy='share-bot'
                        color='grey'
                        size='large'
                        link
                    />
                )}
                basic
                hoverable
                content={(
                    <div>
                        <Checkbox
                            toggle
                            disabled={!can('share:x', projectId)}
                            checked={enableSharing}
                            data-cy='toggle-bot-sharing'
                            onChange={() => Meteor.call(
                                'project.setEnableSharing',
                                projectId,
                                !enableSharing,
                            )
                            }
                            label={enableSharing ? t('Sharing enabled') : t('Sharing disabled')}
                        />
                        {enableSharing && (
                            <p>
                                <br />
                                <button
                                    type='button'
                                    className='link-like'
                                    data-cy='copy-sharing-link'
                                    onClick={this.copyToClipboard}
                                >
                                    <Icon name='linkify' /> {t('Copy link')}
                                </button>
                            </p>
                        )}
                    </div>
                )}
            />
        );
    };

    static contextType = ProjectContext;

    render() {
        const { ready } = this.props;
        return (
            ready && (
                <div className='side-by-side middle narrow'>
                    <Can I='nlu-data:x'>{this.renderButton()}</Can>
                    {this.renderGitButton()}
                    {this.renderShareLink()}
                </div>
            )
        );
    }
}

TrainButton.propTypes = {
    nSelectedStoryGroups: PropTypes.number.isRequired,
    status: PropTypes.string,
    ready: PropTypes.bool.isRequired,
    t: PropTypes.func.isRequired,
};

TrainButton.defaultProps = {
    status: '',
};

export default withTracker((props) => {
    // Gets the required number of selected storygroups and sets the content and popup for the train button
    const { projectId } = props;
    const trainingStatusHandler = Meteor.subscribe('training.status', projectId);
    const storyGroupHandler = Meteor.subscribe('storiesGroup', projectId);
    const ready = storyGroupHandler.ready() && trainingStatusHandler.ready();

    let storyGroups;
    let selectedStoryGroups;
    let status;
    if (ready) {
        status = Projects.findOne(
            { _id: projectId },
            { fields: { 'training.instanceStatus': 1 } },
        );
        status = get(status, 'training.instanceStatus', 'notReachable'); // if it is undefined we consider it not reachable
        storyGroups = StoryGroups.find({ projectId }, { field: { _id: 1 } }).fetch();
        selectedStoryGroups = storyGroups.filter(storyGroup => storyGroup.selected);
    }

    return {
        ready,
        nSelectedStoryGroups: selectedStoryGroups?.length || 0,
        status,
    };
})(withTranslation('utils')(TrainButton));
