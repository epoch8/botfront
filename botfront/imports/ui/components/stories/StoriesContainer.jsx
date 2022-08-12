import { Loader, Menu } from 'semantic-ui-react';
import React from 'react';
import PropTypes from 'prop-types';
import LanguageDropdown from '../common/LanguageDropdown';
import SearchBar from './search/SearchBar';
import PageMenu from '../utils/PageMenu';
import { withTranslation } from "react-i18next";

const Stories = React.lazy(() => import('./Stories'));

const StoriesContainer = (props) => {
    const { params } = props;
    const { t } = this.props;
    return (
        <>
            <PageMenu title={t('Stories')} icon='book' withTraining>
                <Menu.Item>
                    <LanguageDropdown />
                </Menu.Item>
                <Menu.Item className='stories-page-menu-searchbar'>
                    <SearchBar />
                </Menu.Item>
            </PageMenu>
            <React.Suspense fallback={<Loader />}>
                <Stories projectId={params.project_id} />
            </React.Suspense>
        </>
    );
};

StoriesContainer.propTypes = {
    params: PropTypes.object.isRequired,
};

export default withTranslation('stories')(StoriesContainer);
