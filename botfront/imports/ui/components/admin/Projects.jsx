import { withTracker } from 'meteor/react-meteor-data';
import {
    Container, Menu, Button, Icon, Popup,
} from 'semantic-ui-react';
import { Link, browserHistory } from 'react-router';
import matchSorter from 'match-sorter';
import { Meteor } from 'meteor/meteor';
import ReactTable from 'react-table-v6';
import PropTypes from 'prop-types';
import React from 'react';
import { withTranslation } from 'react-i18next';

import { Projects } from '../../../api/project/project.collection';
import PageMenu from '../utils/PageMenu';
import { can } from '../../../lib/scopes';
import { wrapMeteorCallback } from '../utils/Errors';

class ProjectsList extends React.Component {
    filterItem = (filter, rows, filterKey) => {
        if (matchSorter([rows], filter.value, { keys: [filterKey] }).length > 0) return true;
        return false;
    }

    getColumns = () => {
        const { t } = this.props;
        return [
            {
                id: 'name',
                accessor: 'name',
                filterable: true,
                filterMethod: (filter, rows) => (this.filterItem(filter, rows, 'name')),
                Header: t('Name'),
                Cell: props => (
                    <Link to={`/project/${props.original._id}/nlu/models`}>{props.value}</Link>
                ),
            },
            {
                id: 'id',
                accessor: '_id',
                filterable: true,
                filterMethod: (filter, rows) => (this.filterItem(filter, rows, 'id')),
                Header: t('ID'),
            },
            ...(can('projects:w')
                ? [{
                    id: 'edit',
                    accessor: '_id',
                    width: 55,
                    Header: t('Edit'),
                    Cell: props => (
                        <div className='center'>
                            <Link to={`/admin/project/${props.value}`}>
                                <Icon name='edit' color='grey' link size='small' data-cy='edit-projects' />
                            </Link>
                        </div>
                    ),
                }]
                : []),
        ];
    }

    render() {
        const { loading, projects, t } = this.props;
        return (
            <div>
                <PageMenu icon='sitemap' title={t('Projects')} headerDataCy='projects-page-header'>
                    <Menu.Menu position='right'>
                        {can('projects:w') && (
                            <Menu.Item>

                                <div data-cy='new-project-trigger'>
                                    <Button
                                        data-cy='new-project'
                                        onClick={() => {
                                            browserHistory.push('/admin/project/add');
                                        }}
                                        primary
                                        disabled={loading}
                                        icon='add'
                                        content={t('Add project')}
                                        labelPosition='left'
                                    />
                                </div>
                            </Menu.Item>
                        )
                        }
                    </Menu.Menu>
                </PageMenu>
                <Container>
                    <ReactTable
                        data={projects}
                        columns={this.getColumns()}
                        getTrProps={() => ({
                            style: {
                                height: '37px',
                                paddingLeft: '10px',
                            },
                        })}
                    />
                </Container>
            </div>
        );
    }
}

ProjectsList.propTypes = {
    projects: PropTypes.arrayOf(PropTypes.object).isRequired,
    loading: PropTypes.bool.isRequired,
    t: PropTypes.func,
};

ProjectsList.defaultProps = {
    t: text => text,
};

const ProjectsListContainer = withTracker(() => {
    const projectsHandle = Meteor.subscribe('projects.names');
    const loading = !projectsHandle.ready();
    const projects = Projects.find({}, { fields: { name: 1, namespace: 1 } }).fetch() || [];
    return {
        loading,
        projects,
    };
})(withTranslation('admin')(ProjectsList));

export default ProjectsListContainer;
