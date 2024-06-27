import React from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { withTracker } from 'meteor/react-meteor-data';
import {
    AutoField, AutoForm, HiddenField, SubmitField,
} from 'uniforms-semantic';
import Alert from 'react-s-alert';
import SimpleSchema2Bridge from 'uniforms-bridge-simple-schema-2';
import uuidv4 from 'uuid/v4';
import { Button, Confirm } from 'semantic-ui-react';
import { InstanceSchema } from '../../../api/instances/instances.schema';
import { Instances as InstancesCollection } from '../../../api/instances/instances.collection';
import { wrapMeteorCallback } from '../utils/Errors';
import { can } from '../../../lib/scopes';
import restartRasa from './restartRasa';


class Instances extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            webhook: {},
            instance: {},
            copied: false,
            confirmOpen: false,
        };
    }

    componentDidMount() {
        const { projectId, instance } = this.props;
        this.setState({ instance });
        if (can('resources:w', projectId)) {
            Meteor.call('getRestartRasaWebhook', projectId, wrapMeteorCallback((err, result) => {
                if (err) return;
                const webhook = get(result, 'settings.private.webhooks.restartRasaWebhook', {});
                this.setState({ webhook });
            }));
        }
    }

    onValidate = (model, error, callback) => {
        InstancesCollection.simpleSchema().clean(model);
        callback();
    };

    generateAuthToken = () => {
        this.setState({ instance: { ...this.state.instance, token: uuidv4() } });
    }

    onSave = (updatedInstance) => {
        const { t } = this.props;
        Meteor.call('instance.update', updatedInstance, wrapMeteorCallback((err) => {
            if (err) Alert.error(`${t(Error)}: ${err.reason}`, { position: 'top-right', timeout: 'none' });
        }, t('Changes Saved')));
    }


    // eslint-disable-next-line class-methods-use-this
    copySnippet = () => {
        const copyText = document.getElementById('token');
        copyText.select();
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
    };

    handleCopy = () => {
        this.copySnippet();
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 1000);
    };

    openConfirm = () => {
        this.setState({ confirmOpen: true });
    }

    closeConfirm = () => {
        this.setState({ confirmOpen: false });
    }

    render() {
        const {
            ready, projectId, t,
        } = this.props;

        const {
            webhook, instance, copied, confirmOpen,
        } = this.state;
        const hasWritePermission = can('resources:w', projectId);
        return (
            <>
                {ready && (
                    <AutoForm
                        schema={new SimpleSchema2Bridge(InstanceSchema)}
                        model={instance}
                        onSubmit={updatedInstance => this.onSave(updatedInstance)}
                        onValidate={this.onValidate}
                        disabled={!hasWritePermission}
                    >
                        <HiddenField name='projectId' value={projectId} />
                        <AutoField name='host' />
                        <div className='token-generate'>
                            <AutoField action='Search' id='token' data-cy='token-field' name='token' label={t('Token')} />
                            <Button content={t('Generate')} onClick={(e) => { e.preventDefault(); this.openConfirm(); }} />
                            <Button
                                positive={copied}
                                onClick={(e) => {
                                    e.preventDefault();
                                    this.handleCopy();
                                }}
                                className='copy-button'
                                icon='copy'
                                content={copied ? t('Copied') : t('Copy')}
                            />
                            <Confirm
                                open={confirmOpen}
                                onCancel={this.closeConfirm}
                                onConfirm={() => { this.generateAuthToken(); this.closeConfirm(); }}
                            />
                        </div>
                        <AutoField name='audioRecordsUrl' label={t('Audio records URL')} />
                        <AutoField name='actionServerHost' label={t('Action Server Host')} />
                        <AutoField name='externalTraining' label={t('External training')} />

                        <br />
                        {hasWritePermission && (
                            <SubmitField
                                className='primary save-instance-info-button'
                                value={t('Save Changes')}
                                data-cy='save-instance'
                            />
                        )}
                        {hasWritePermission
                            && webhook
                            && webhook.url
                            && <Button content={t('Restart rasa')} onClick={(e) => { e.preventDefault(); restartRasa(projectId, webhook, 'development'); }} />}
                    </AutoForm>
                )}
            </>
        );
    }
}

Instances.propTypes = {
    instance: PropTypes.object,
    projectId: PropTypes.string.isRequired,
    ready: PropTypes.bool.isRequired,
    t: PropTypes.func.isRequired,
};

Instances.defaultProps = {
    instance: {},
};


const InstancesContainer = withTracker((props) => {
    const { projectId } = props;
    const handler = Meteor.subscribe('nlu_instances', projectId);
    const instance = InstancesCollection.findOne({ projectId });

    return {
        ready: handler.ready(),
        instance,
        webhook: {},
    };
})(Instances);

const mapStateToProps = state => ({
    projectId: state.settings.get('projectId'),
});

export default connect(mapStateToProps)(withTranslation('settings')(InstancesContainer));
