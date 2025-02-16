import React from 'react';
import PropTypes from 'prop-types';

import { Menu, Tab } from 'semantic-ui-react';

import { connect } from 'react-redux';

import { withTranslation } from 'react-i18next';

import ImportRasaFiles from './ImportRasaFiles.jsx';
import ExportProject from './ExportProject.jsx';
import { can } from '../../../lib/scopes';

class ImportExportProject extends React.Component {
    constructor (props) {
        super(props);
        const { projectId, t } = props;
        this.state = { activeMenuItem: can('import:x', projectId) ? t('Import') : t('Export'), loading: false };
    }

    renderMenuItem = (itemText, itemKey = itemText) => {
        const { activeMenuItem, loading } = this.state;
        return (
            <Menu.Item
                disabled={loading}
                key={itemKey}
                active={activeMenuItem === itemKey}
                onClick={() => { this.setState({ activeMenuItem: itemKey }); }}
            >
                {itemText}
            </Menu.Item>
        );
    };

    setLoading = (newLoadingState) => {
        this.setState({ loading: newLoadingState });
    }

    getMenuPanes = () => {
        const { loading } = this.state;
        const { projectId, t } = this.props;
        const panes = [];
        if (can('import:x', projectId)) {
            panes.push({
                menuItem: this.renderMenuItem(t('Import')),
                render: () => (
                    <Tab.Pane loading={loading} key={t('Import')} data-cy='import-project-tab'>
                        <ImportRasaFiles />
                    </Tab.Pane>
                ),
            });
        }
        if (can('export:x', projectId)) {
            panes.push({
                menuItem: this.renderMenuItem(t('Export')),
                render: () => (
                    <Tab.Pane loading={loading} key={t('Export')} data-cy='export-project-tab'>
                        <ExportProject setLoading={this.setLoading} />
                    </Tab.Pane>
                ),
            });
        }
        return panes;
    }

    render () {
        return (
            <Tab className='import-export-project' menu={{ pointing: true, secondary: true, 'data-cy': 'port-project-menu' }} panes={this.getMenuPanes()} />
        );
    }
}

ImportExportProject.propTypes = {
    projectId: PropTypes.string.isRequired,
};

const mapStateToProps = state => ({
    projectId: state.settings.get('projectId'),
});

export default connect(mapStateToProps)(withTranslation('settings')(ImportExportProject));
