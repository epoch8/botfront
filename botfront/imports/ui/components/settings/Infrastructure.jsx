import React, { useRef, useState } from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import SimpleSchema2Bridge from 'uniforms-bridge-simple-schema-2';
import { AutoForm, AutoField } from 'uniforms-semantic';

import { useTranslation } from 'react-i18next';
import {
    Button, Divider, Header,
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
        Meteor.call(
            'project.deploy',
            projectId,
            infrastructureSettings,
            wrapMeteorCallback((err) => {}),
        );
    };

    if (!ready) {
        return <></>;
    }

    return (
        <AutoForm
            schema={infrastructureSchemaBridge}
            model={infrastructureSettings}
            onSubmit={newSettings => onSave(newSettings)}
            onChange={() => setSaved(false)}
            ref={formRef}
        >
            <AutoField name='prod_enabled' label={t('Production infra enabled')} />
            <Divider />
            <Header as='h3'>{t('Rasa')}</Header>
            <AutoField name='rasa' label={null} />
            <Divider />
            <Header as='h3'>{t('Action server')}</Header>
            <AutoField name='actions' label={null} />
            <Divider />
            <Header as='h3'>{t('Chatwoot')}</Header>
            <AutoField name='chatwoot' label={null} />
            <Divider />
            <Header as='h3'>{t('Telegram')}</Header>
            <AutoField name='telegram' label={null} />
            <SaveButton saving={saving} saved={saved} />
            <Button
                floated='right'
                color='red'
                disabled={!saved}
                onClick={(e) => {
                    e.preventDefault();
                    deploy();
                }}
            >
                {t('Deploy')}
            </Button>
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
