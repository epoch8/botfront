import React, { useRef, useState } from 'react';
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
    Header,
} from 'semantic-ui-react';

import { Projects } from '../../../api/project/project.collection';
import { InfrastructureSchema } from '../../../api/project/project.schema';
import SaveButton from '../utils/SaveButton';
import { wrapMeteorCallback } from '../utils/Errors';

const infrastructureSchemaBridge = new SimpleSchema2Bridge(InfrastructureSchema);

const Infrastructure = ({ projectId }) => {
    const { ready, infrastructureSettings } = useTracker(() => {
        const handler = Meteor.subscribe('projects', projectId);
        const project = Projects.findOne(
            { _id: projectId },
            { fields: { infrastructureSettings: 1 } },
        );
        return {
            ready: handler.ready(),
            infrastructureSettings: project.infrastructureSettings,
        };
    }, [projectId]);

    const { t } = useTranslation('settings');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(true);
    const [deploying, setDeploying] = useState(false);
    const [deployed, setDeployed] = useState(false);
    const [deployConfirmOpen, setDeployConfirmOpen] = useState(false);
    const formRef = useRef();

    const onSave = (newSettings) => {
        setSaving(true);
        Meteor.call(
            'project.update',
            { _id: projectId, infrastructureSettings: newSettings },
            wrapMeteorCallback((err) => {
                setSaving(false);
                if (!err) {
                    setSaved(true);
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
                setDeployed(!err);
                Alert.success('Infrastructure update started');
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

    const overridesContent = parentName => (
        <NestField name={parentName} label={null}>
            {instanceContent}
            <AccordionAccordion
                exclusive={false}
                panels={resourcesPanels(parentName)}
                styled
            />
        </NestField>
    );

    const instancePanels = parentName => [
        ...resourcesPanels(parentName),
        {
            key: 'dev',
            title: 'Dev overrides',
            content: {
                content: overridesContent(`${parentName}.dev`),
            },
        },
        {
            key: 'prod',
            title: 'Prod overrides',
            content: {
                content: overridesContent(`${parentName}.prod`),
            },
        },
    ];

    const panels = [
        {
            key: 'rasa',
            title: 'Rasa',
            content: {
                content: (
                    <NestField name='rasa' label={null}>
                        {instanceContent}
                        <AccordionAccordion
                            exclusive={false}
                            panels={instancePanels('rasa')}
                            styled
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
                        <AccordionAccordion
                            exclusive={false}
                            panels={instancePanels('actions')}
                            styled
                        />
                    </NestField>
                ),
            },
        },
    ];

    return (
        <AutoForm
            schema={infrastructureSchemaBridge}
            model={infrastructureSettings}
            onSubmit={newSettings => onSave(newSettings)}
            onChange={() => {
                setSaved(false);
                setDeployed(false);
            }}
            ref={formRef}
        >
            <AutoField name='prod_enabled' label={t('Production infra enabled')} />
            <Divider />
            <Accordion exclusive={false} panels={panels} styled />
            <Divider />
            <Header as='h3'>{t('Chatwoot')}</Header>
            <AutoField name='chatwoot' label={null} />
            <Divider />
            <Header as='h3'>{t('Telegram')}</Header>
            <AutoField name='telegram' label={null} />
            <SaveButton saving={saving} saved={saved} />
            <Button
                floated='right'
                color='teal'
                disabled={!saved || deployed}
                loading={deploying}
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
        </AutoForm>
    );
};

Infrastructure.propTypes = {
    projectId: PropTypes.string.isRequired,
};

const mapStateToProps = state => ({
    projectId: state.settings.get('projectId'),
});

export default connect(mapStateToProps)(Infrastructure);
