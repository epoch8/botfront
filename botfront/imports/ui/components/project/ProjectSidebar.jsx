/* eslint-disable react/prefer-stateless-function */
import React from 'react';
import PropTypes from 'prop-types';
import DocumentTitle from 'react-document-title';
import { Menu, Divider, Dropdown } from 'semantic-ui-react';
import { Link } from 'react-router';
import { withTracker } from 'meteor/react-meteor-data';
import { withTranslation } from 'react-i18next';

import { Projects } from '../../../api/project/project.collection';
import ProjectsDropdown from './ProjectsDropdown';
import { can, isUserPermissionGlobal } from '../../../lib/scopes';
import Can from '../roles/Can';

import { GlobalSettings } from '../../../api/globalSettings/globalSettings.collection';

const packageJson = require('/package.json');

const languageOptoins = [
    { text: 'Russian', value: 'ru' },
    { text: 'English', value: 'en' },
];


class ProjectSidebar extends React.Component {
    constructor(props) {
        super(props);
        const { i18n } = props;
        this.state = { language: localStorage.getItem('language') || i18n.language };
    }

    onLanguageChange = (lng) => {
        const { i18n } = this.props;
        this.setState({ language: lng });
        localStorage.setItem('language', lng);
        i18n.changeLanguage(lng);
    };

    render() {
        const {
            projectName, projectId, handleChangeProject, settingsReady, settings, t,
        } = this.props;
        const { language } = this.state;

        const canViewProjectsTab = can('projects:r', projectId)
            || can('export:x', projectId)
            || can('import:x', projectId)
            || can('git-credentials:r', projectId);

        return (
            <DocumentTitle title={projectName}>
                <Menu vertical inverted pointing className='project-menu' data-cy='project-menu'>
                    <Menu.Item>
                        <Menu.Header style={{ marginBottom: '20px' }}>{t('Project')}</Menu.Header>
                        <ProjectsDropdown currentProjectId={projectId} onProjectChange={handleChangeProject} />
                    </Menu.Item>
                    <Can I='stories:r' projectId={projectId}>
                        <Link to={`/project/${projectId}/dialogue`}>
                            <Menu.Item name={t('Dialogue')} icon='book' data-cy='dialogue-sidebar-link' />
                        </Link>
                    </Can>
                    <Can I='nlu-data:r' projectId={projectId}>
                        <Link to={`/project/${projectId}/nlu/models`}>
                            <Menu.Item name={t('NLU')} icon='grid layout' data-cy='nlu-sidebar-link' />
                        </Link>
                    </Can>
                    <Can I='incoming:r' projectId={projectId}>
                        <Link to={`/project/${projectId}/incoming`}>
                            <Menu.Item name={t('Incoming')} icon='inbox' data-cy='incoming-sidebar-link' />
                        </Link>
                    </Can>
                    <Can I='responses:r' projectId={projectId}>
                        <Link to={`/project/${projectId}/responses`}>
                            <Menu.Item name={t('Responses')} icon='comment' />
                        </Link>
                    </Can>
                    <Can I='models:r' projectId={projectId}>
                        <Link to={`/project/${projectId}/models`}>
                            <Menu.Item name={t('Models')} icon='list' />
                        </Link>
                    </Can>
                    {(settingsReady && settings.settings.public.metabaseUrl) ? (
                        <a href={settings.settings.public.metabaseUrl} target='_blank' rel='noopener noreferrer'>
                            <Menu.Item name={t('Analytics')} icon='chart line' />
                        </a>
                    ) : (
                        <Can I='analytics:r' projectId={projectId}>
                            <Link to={`/project/${projectId}/analytics`}>
                                <Menu.Item name={t('Analytics')} icon='chart line' />
                            </Link>
                        </Can>
                    )}
                    {settingsReady && settings.settings.public.chatbotAdminUrl && (
                        <a href={settings.settings.public.chatbotAdminUrl} target='_blank' rel='noopener noreferrer'>
                            <Menu.Item name={t('Chatbot Admin')} icon='cogs' />
                        </a>
                    )}
                    {canViewProjectsTab && (
                        <Link to={`/project/${projectId}/settings`}>
                            <Menu.Item name={t('Settings')} icon='setting' data-cy='settings-sidebar-link' />
                        </Link>
                    )}
                    <a href={settingsReady ? settings.settings.public.docUrl : ''} target='_blank' rel='noopener noreferrer'>
                        <Menu.Item name={t('documentation')} icon='question' />
                    </a>
                    <Divider inverted />
                    {(can('roles:r', { anyScope: true })
                    || can('users:r', { anyScope: true })
                    || can('global-settings:r', { anyScope: true })
                    // we need to check if there is not scope for this 'projects:r, because without scope it can create/edit projects
                    || isUserPermissionGlobal(Meteor.userId(), 'projects:r')) && (
                        <Link to='/admin/'>
                            <Menu.Item name={t('Admin')} icon='key' />
                        </Link>
                    )}
                    <Link to='/login'>
                        <Menu.Item data-cy='signout' name='Sign out' icon='sign-out' />
                    </Link>
                    <Menu.Item>
                        <Menu.Header style={{ marginBottom: '20px' }}>{t('Language')}</Menu.Header>
                        <div>
                            <Dropdown
                                button
                                // loading={loading}
                                fluid
                                selection
                                value={language}
                                name='language'
                                options={languageOptoins}
                                onChange={(_, data) => this.onLanguageChange(data.value)}
                            />
                        </div>
                    </Menu.Item>
                    <span className='force-bottom'>{packageJson.version}</span>
                </Menu>
            </DocumentTitle>
        );
    }
}

ProjectSidebar.propTypes = {
    projectId: PropTypes.string.isRequired,
    projectName: PropTypes.string.isRequired,
    handleChangeProject: PropTypes.func.isRequired,
    settingsReady: PropTypes.bool.isRequired,
    settings: PropTypes.object,
    i18n: PropTypes.any.isRequired,
};

ProjectSidebar.defaultProps = {
    settings: null,
};

const ProjectSidebarContainer = withTracker((props) => {
    const { projectId } = props;
    const settingsHandler = Meteor.subscribe('settings');
    const settings = GlobalSettings.findOne({}, {
        fields: {
            'settings.public.docUrl': 1,
            'settings.public.metabaseUrl': 1,
            'settings.public.chatbotAdminUrl': 1,
        },
    });
    const currentProject = Projects.find({ _id: projectId }).fetch();
    const projectName = currentProject.length > 0 ? `${currentProject[0].name}` : 'Botfront.';

    return {
        projectName,
        settingsReady: settingsHandler.ready(),
        settings,
    };
})(withTranslation('project')(ProjectSidebar));

export default ProjectSidebarContainer;
