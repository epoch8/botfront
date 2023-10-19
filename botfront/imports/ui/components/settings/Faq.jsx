import React, { useState } from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import SimpleSchema2Bridge from 'uniforms-bridge-simple-schema-2';
import { AutoForm, AutoField } from 'uniforms-semantic';

import { useTranslation } from 'react-i18next';
import { Projects } from '../../../api/project/project.collection';
import { FaqSettingsSchema } from '../../../api/project/project.schema';
import SaveButton from '../utils/SaveButton';
import { wrapMeteorCallback } from '../utils/Errors';

const faqSettingsSchemaBridge = new SimpleSchema2Bridge(FaqSettingsSchema);

const Faq = ({ projectId }) => {
    const { ready, faqSettings } = useTracker(() => {
        const handler = Meteor.subscribe('projects', projectId);
        const project = Projects.findOne(
            { _id: projectId },
            { fields: { faqSettings: 1 } },
        );
        return {
            ready: handler.ready(),
            faqSettings: project.faqSettings,
        };
    }, [projectId]);

    const { t } = useTranslation('settings');
    const [saving, setSaving] = useState(false);

    const onSave = (newSettings) => {
        setSaving(true);
        Meteor.call(
            'project.update',
            { _id: projectId, faqSettings: newSettings },
            wrapMeteorCallback(() => {
                setSaving(false);
            }),
        );
    };

    if (!ready) {
        return <></>;
    }

    return (
        <AutoForm
            schema={faqSettingsSchemaBridge}
            model={faqSettings}
            onSubmit={newSettings => onSave(newSettings)}
        >
            <AutoField name='host' label={t('Host')} />
            <AutoField name='nExamples' label={t('Number of examples to fetch')} />
            <AutoField name='intentName' label={t('Intent name')} />
            <AutoField name='enabled' label={t('Enabled')} />
            <SaveButton saving={saving} />
            {/* <SaveButton saved={saved} saving={saving} /> */}
        </AutoForm>
    );
};

Faq.propTypes = {
    projectId: PropTypes.string.isRequired,
};

const mapStateToProps = state => ({
    projectId: state.settings.get('projectId'),
});

export default connect(mapStateToProps)(Faq);
