import React, { useEffect, useRef, useState } from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import SimpleSchema2Bridge from 'uniforms-bridge-simple-schema-2';
import { AutoForm, AutoField, NestField } from 'uniforms-semantic';
import Alert from 'react-s-alert';
import { useTranslation } from 'react-i18next';
import {
    Accordion,
    AccordionAccordion,
    Button,
    Confirm,
    Divider,
    Segment,
} from 'semantic-ui-react';
import _ from 'lodash';

import { Projects } from '../../../api/project/project.collection';
import { InfrastructureSchema } from '../../../api/project/project.schema';
import { wrapMeteorCallback } from '../utils/Errors';

const infrastructureSchemaBridge = new SimpleSchema2Bridge(InfrastructureSchema);

const Infrastructure = ({ projectId }) => {
    const {
        ready, infrastructureSettings, infrastructureStatus,
    } = useTracker(() => {
        const handler = Meteor.subscribe('projects', projectId);
        const project = Projects.findOne(
            { _id: projectId },
            { fields: { infrastructureSettings: 1, infrastructureStatus: 1 } },
        );
        console.log('DB Settings', project.infrastructureSettings);
        return {
            ready: handler.ready(),
            infrastructureSettings: project.infrastructureSettings,
            infrastructureStatus: project.infrastructureStatus,
        };
    }, [projectId]);

    const { t } = useTranslation('settings');
    const [saving, setSaving] = useState(false);
    const [deploying, setDeploying] = useState(false);
    const [deployConfirmOpen, setDeployConfirmOpen] = useState(false);
    const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
    const formRef = useRef();

    useEffect(() => {
        if (deploying) {
            setDeploying(false);
        }
    }, [infrastructureStatus]);

    const onSave = (newSettings) => {
        console.log('newSettings', newSettings);
        setSaving(true);
        Meteor.call(
            'project.update',
            { _id: projectId, infrastructureSettings: newSettings },
            wrapMeteorCallback((err) => {
                setSaving(false);
                if (!err) {
                    Alert.success(t('Saved'));
                } else {
                    Alert.error(t('Error while saving'));
                }
            }),
        );
    };

    const deploy = () => {
        setDeploying(true);
        Meteor.call(
            'project.deployInfrastructure',
            projectId,
            infrastructureSettings,
            wrapMeteorCallback((err) => {
                setDeploying(false);
                if (err) {
                    Alert.error(t('Error while starting infrastructure update'));
                } else {
                    Alert.success(t('Infrastructure update started'));
                }
            }),
        );
    };

    const remove = () => {
        setDeploying(true);
        Meteor.call(
            'project.removeInfrastructure',
            projectId,
            wrapMeteorCallback((err) => {
                setDeploying(false);
                if (err) {
                    Alert.success(t('Error while deleting infrastructure'));
                } else {
                    Alert.success(t('Infrastructure deleted'));
                }
            }),
        );
    };

    if (!ready) {
        return <></>;
    }

    const resourcesPanels = parentName => [
        {
            key: 'resources',
            title: 'Resources',
            content: {
                content: (
                    <NestField name={parentName} label={null}>
                        <AutoField name='resources' label={null} />
                    </NestField>
                ),
            },
        },
    ];

    const instanceContent = (
        <>
            <AutoField name='image' />
            <AutoField name='version' />
            <AutoField name='env' />
        </>
    );

    // const overridesContent = parentName => (
    //     <NestField name={parentName} label={null}>
    //         {instanceContent}
    //         <AccordionAccordion
    //             exclusive={false}
    //             panels={resourcesPanels(parentName)}
    //         />
    //     </NestField>
    // );

    // const instancePanels = parentName => [
    //     ...resourcesPanels(parentName),
    //     {
    //         key: 'dev',
    //         title: 'Dev overrides',
    //         content: {
    //             content: overridesContent(`${parentName}.dev`),
    //         },
    //     },
    //     {
    //         key: 'prod',
    //         title: 'Prod overrides',
    //         content: {
    //             content: overridesContent(`${parentName}.prod`),
    //         },
    //     },
    // ];

    // const chatwootContent = (
    //     <>
    //         <AutoField name='account_id' />
    //         <AutoField name='admin_access_token' />
    //         <AutoField name='agent_bot_access_token' />
    //         <AutoField name='website_token' />
    //     </>
    // );

    // const chatwootEnvPanels = [
    //     {
    //         key: 'dev',
    //         title: 'Dev',
    //         content: {
    //             content: (
    //                 <NestField name='chatwoot.dev' label={null}>
    //                     {chatwootContent}
    //                 </NestField>
    //             ),
    //         },
    //     },
    //     {
    //         key: 'prod',
    //         title: 'Prod',
    //         content: {
    //             content: (
    //                 <NestField name='chatwoot.dev' label={null}>
    //                     {chatwootContent}
    //                 </NestField>
    //             ),
    //         },
    //     },
    // ];

    // const telegramEnvPanels = [
    //     {
    //         key: 'dev',
    //         title: 'Dev',
    //         content: {
    //             content: (<AutoField name='telegram.dev' label={null} />),
    //         },
    //     },
    //     {
    //         key: 'prod',
    //         title: 'Prod',
    //         content: {
    //             content: (<AutoField name='telegram.prod' label={null} />),

    //         },
    //     },
    // ];

    const panels = [
        {
            key: 'rasa',
            title: 'Rasa',
            content: {
                content: (
                    <NestField name='rasa' label={null}>
                        {instanceContent}
                        {/* <AccordionAccordion
                            exclusive={false}
                            panels={instancePanels('rasa.dev')}
                        /> */}
                        <AccordionAccordion
                            exclusive={false}
                            panels={resourcesPanels('rasa')}
                        />
                    </NestField>
                ),
            },
        },
        {
            key: 'actions',
            title: 'Action server',
            content: {
                content: (
                    <NestField name='actions' label={null}>
                        {instanceContent}
                        {/* <AccordionAccordion
                            exclusive={false}
                            panels={instancePanels('actions')}
                        /> */}
                        <AccordionAccordion
                            exclusive={false}
                            panels={resourcesPanels('actions')}
                        />
                    </NestField>
                ),
            },
        },
        // {
        //     key: 'chatwoot',
        //     title: 'Chatwoot',
        //     content: {
        //         content: (
        //             <NestField name='chatwoot' label={null}>
        //                 <AutoField name='account_id' />
        //                 <AutoField name='admin_access_token' />
        //                 <AccordionAccordion
        //                     exclusive={false}
        //                     panels={chatwootEnvPanels}
        //                 />
        //             </NestField>
        //         ),
        //     },
        // },
        {
            key: 'telegram',
            title: 'Telegram',
            content: {
                content: (
                    <AutoField name='telegram.dev' label={null} />
                // <AccordionAccordion
                //     exclusive={false}
                //     panels={telegramEnvPanels}
                // />
                ),
            },
        },
    ];

    let statusColor = 'grey';
    let pending = false;
    let error = false;
    const deployStatus = infrastructureStatus?.status;
    const lastDeployed = infrastructureStatus?.lastDeployed;

    switch (deployStatus) {
    // case 'unknown':
    case 'deployed':
        pending = false;
        error = false;
        statusColor = 'green';
        break;
    // case 'uninstalled':
    // case 'superseded':
    case 'failed':
        pending = false;
        error = true;
        statusColor = 'red';
        break;
    case 'uninstalling':
    case 'pending-install':
    case 'pending-upgrade':
    case 'pending-rollback':
        pending = true;
        error = false;
        statusColor = 'yellow';
        break;

    default:
        break;
    }

    const renderProjectStatus = () => {
        if (pending) {
            return 'Project deploying';
        }
        if (error) {
            if (lastDeployed) {
                return `Error deploying. Last deployed at ${lastDeployed}`;
            }
            return 'Error deploying';
        }
        if (!lastDeployed) {
            return 'Not deployed';
        }
        return `Deployed at ${lastDeployed}`;
    };

    return (
        <>
            <Segment color={statusColor} inverted>{renderProjectStatus()}</Segment>
            <AutoForm
                schema={infrastructureSchemaBridge}
                model={infrastructureSettings}
                onSubmit={onSave}
                showInlineError
                ref={formRef}
                // disabled={pending}
            >
                {/* <AutoField name='prod_enabled' label={t('Production infra enabled')} /> */}
                {/* <Divider /> */}
                <Accordion exclusive={false} panels={panels} styled />
                <Divider />
                <Button
                    loading={saving}
                    disabled={saving}
                    primary
                    onClick={(e) => {
                        e.preventDefault();
                        if (!saving) formRef.current.submit();
                    }}
                >
                    {t('Save')}
                </Button>
                <Button
                    floated='right'
                    color='teal'
                    disabled={pending || deploying}
                    loading={pending || deploying}
                    onClick={(e) => {
                        e.preventDefault();
                        setDeployConfirmOpen(true);
                    }}
                >
                    {t('Deploy')}
                </Button>
                <Confirm
                    open={deployConfirmOpen}
                    onCancel={() => {
                        setDeployConfirmOpen(false);
                    }}
                    onConfirm={() => {
                        deploy();
                        setDeployConfirmOpen(false);
                    }}
                    content={t('Do you really want to deploy infrastucture?')}
                />
                <Button
                    floated='right'
                    color='red'
                    onClick={(e) => {
                        e.preventDefault();
                        setRemoveConfirmOpen(true);
                    }}
                    disabled={!lastDeployed || pending || deploying}
                >
                    {t('Remove')}
                </Button>
                <Confirm
                    open={removeConfirmOpen}
                    onCancel={() => {
                        setRemoveConfirmOpen(false);
                    }}
                    onConfirm={() => {
                        remove();
                        setRemoveConfirmOpen(false);
                    }}
                    content={t('Do you really want to remove infrastucture?')}
                />
            </AutoForm>
        </>
    );
};

Infrastructure.propTypes = {
    projectId: PropTypes.string.isRequired,
};

const mapStateToProps = state => ({
    projectId: state.settings.get('projectId'),
});

export default connect(mapStateToProps)(Infrastructure);
