import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation } from '@apollo/react-hooks';
import Alert from 'react-s-alert';
import { browserHistory } from 'react-router';
import {
    Button, Radio,
    Grid, Icon, Menu, Message, Pagination,
} from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import { DELETE_CONV, LABEL_CONV } from './mutations';
import ConversationViewer from './ConversationViewer';
import ConversationFilters from './ConversationFilters';
import { updateIncomingPath } from '../incoming/incoming.utils';
import { ConversationBrowserContext } from './context';
import { wrapMeteorCallback } from '../utils/Errors';

const LS_LABELING_KEY = 'labeling';

function ConversationsBrowser(props) {
    const {
        page,
        pages,
        trackers,
        activeConversationId,
        refetch,
        router,
        activeFilters,
        changeFilters,
        handleDownloadConversations,
        projectId,
    } = props;

    const [deleteConv, { data }] = useMutation(DELETE_CONV);
    const [labelConv, { labelConvData }] = useMutation(LABEL_CONV);
    const [optimisticRemoveReadMarker, setOptimisticRemoveReadMarker] = useState(
        new Set(),
    );
    const [labeling, setLabeling] = useState(!!window.localStorage.getItem(LS_LABELING_KEY));
    const [newLabels, setNewLabels] = useState({});
    const [newHasEventLabels, setNewHasEventLabels] = useState({});

    const currentTrackerIdx = trackers ? trackers.findIndex(tracker => tracker._id === activeConversationId) : -1;
    const currentTracker = currentTrackerIdx !== -1 ? trackers[currentTrackerIdx] : null;
    const currentLabel = (
        Object.hasOwn(newLabels, activeConversationId) ? newLabels[activeConversationId]
            : ((currentTracker && currentTracker.label) ? currentTracker.label.value : null)
    );
    const isFirstConv = (page === 1) && (currentTrackerIdx === 0);
    const isLastConv = (page === pages) && trackers && (currentTrackerIdx === (trackers.length - 1));

    useEffect(() => {
        if (data && !data.delete.success) {
            Alert.warning('Something went wrong, the conversation was not deleted', {
                position: 'top-right',
                timeout: 5000,
            });
        }
    }, [data]);

    useEffect(() => {
        if (labelConvData && !labelConvData.setConversationLabel.success) {
            Alert.warning('Something went wrong, the conversation was not labeled', {
                position: 'top-right',
                timeout: 5000,
            });
        }
    }, [labelConvData]);

    useEffect(() => {
        // empty the optimistic marking of read message when new data arrive
        setOptimisticRemoveReadMarker(new Set());
        setNewLabels({});
        setNewHasEventLabels({});
    }, [trackers]);

    const { t } = useTranslation('conversations');

    function optimisticRemoveMarker(id) {
        setOptimisticRemoveReadMarker(new Set([...optimisticRemoveReadMarker, id]));
    }

    function renderIcon(tracker) {
        if (tracker.status === 'new') {
            return <Icon name='mail' />;
        }

        if (tracker.status === 'flagged') {
            return <Icon name='flag' color='red' />;
        }

        return '';
    }

    const goToConversation = (newPage, conversationId, replace = false) => {
        // let url = `/project/${projectId}/incoming/${modelId}/conversations/${page || 1}`;
        const {
            location: { query },
        } = router;
        const url = updateIncomingPath({
            ...router.params,
            page: newPage || 1,
            selected_id: conversationId,
        });
        if (replace) return browserHistory.replace({ pathname: url, query });
        return browserHistory.push({ pathname: url, query });
    };

    function handleItemClick(event, { name }) {
        goToConversation(page, name);
    }

    const handleModifyFilters = (updatedFilters) => {
        changeFilters({ ...activeFilters, ...updatedFilters });
    };

    function pageChange(newPage) {
        const {
            location: { query },
        } = router;
        const url = updateIncomingPath(
            { ...router.params, page: newPage || 1 },
            'selected_id',
        );
        return browserHistory.push({ pathname: url, query });
    }

    function renderMenuItems() {
        const getLabel = t => (Object.hasOwn(newLabels, t._id) ? newLabels[t._id] : t.label && t.label.value);
        const getHasLabeledEvent = t => (Object.hasOwn(newHasEventLabels, t._id) ? newHasEventLabels[t._id] : t.hasLabeledEvent);
        const items = trackers.map((t, index) => (
            <Menu.Item
                key={index.toString(10)}
                name={t._id}
                active={activeConversationId === t._id}
                onClick={handleItemClick}
                data-cy='conversation-item'
            >
                <span style={{ fontSize: '10px' }}>{t._id}</span>
                {labeling ? (
                    <>
                        <Icon name='tag' disabled={!getHasLabeledEvent(t)} />
                        <Icon name='tag' disabled={!getLabel(t)} />
                    </>
                ) : <></>}
                {optimisticRemoveReadMarker.has(t._id)
                    ? renderIcon({ status: 'read' })
                    : renderIcon(t)}
            </Menu.Item>
        ));
        return items;
    }

    function deleteConversation(conversationId) {
        const index = trackers.map(t => t._id).indexOf(conversationId);
        // deleted convo is not the last of the current page
        if (index < trackers.length - 1) {
            goToConversation(page, trackers[index + 1]._id, true);
            // or deleted convo is the last but there is a next page
        } else if (index === trackers.length - 1 && trackers.length > 1) {
            goToConversation(page, trackers[index - 1]._id, true);
            // deleted convo is the last but not the only one and there is no next page
        } else if (index === 0 && trackers.length === 1) {
            goToConversation(Math.max(page - 1, 1), undefined, true);
        } else {
            goToConversation(Math.min(page - 1, 1), undefined, true);
        }
        deleteConv({ variables: { id: conversationId } }).then(() => refetch());
    }

    const createTestCase = (trackerId, callback) => {
        Meteor.call(
            'stories.addTestCase',
            projectId,
            trackerId,
            wrapMeteorCallback(err => callback(err)),
        );
    };

    const renderNoMessages = () => (
        <Grid.Row>
            <Message data-cy='no-conv' info>
                No conversation to load
            </Message>
        </Grid.Row>
    );

    const handleConversationLabelChange = (label) => {
        setNewLabels({
            ...newLabels,
            [activeConversationId]: label,
        });
        labelConv({ variables: { id: activeConversationId, label } });
    };

    const handleHasLabeledEventChange = (hasLabeledEvent) => {
        setNewHasEventLabels({
            ...newHasEventLabels,
            [activeConversationId]: hasLabeledEvent,
        });
    };

    const handlePrevClick = () => {
        if (isFirstConv) return;
        if (currentTrackerIdx > 0) {
            goToConversation(page, trackers[currentTrackerIdx - 1]._id);
        } else {
            goToConversation(page - 1, 'last');
        }
    };

    const handleNextClick = () => {
        if (isLastConv) return;
        if (currentTrackerIdx < (trackers.length - 1)) {
            goToConversation(page, trackers[currentTrackerIdx + 1]._id);
        } else {
            pageChange(page + 1);
        }
    };

    const handleLabelingChange = (active) => {
        setLabeling(active);
        if (active) {
            window.localStorage.setItem(LS_LABELING_KEY, 'true');
        } else {
            window.localStorage.removeItem(LS_LABELING_KEY);
        }
    };

    const renderConversationLabelButtons = () => {
        const buttons = [
            [t('Запрос удовлетворён'), 'success'],
            [t('Провал'), 'fail'],
            [t('Непонятно'), 'unclear'],
            [t('Мусор'), 'trash'],
        ].map(([text, value]) => {
            const active = value === currentLabel;
            const labelValue = active ? null : value;
            return (
                <Button
                    onClick={() => handleConversationLabelChange(labelValue)}
                    key={value}
                    active={active}
                    color={active ? 'blue' : null}
                >
                    {text}
                </Button>
            );
        });
        return (
            <Grid.Row>
                <Button.Group fluid>
                    <Button
                        onClick={() => handlePrevClick()}
                        key='prev'
                        disabled={isFirstConv}
                    >
                        <Icon name='angle left' />
                    </Button>
                    {buttons}
                    <Button
                        onClick={() => handleNextClick()}
                        key='next'
                        disabled={isLastConv}
                    >
                        <Icon name='angle right' />
                    </Button>
                </Button.Group>
            </Grid.Row>
        );
    };
    const renderBody = () => (
        <>
            <Grid.Column width={5}>
                {pages > 1 ? (
                    <Pagination
                        totalPages={pages}
                        onPageChange={(e, { activePage }) => pageChange(activePage)}
                        activePage={page}
                        boundaryRange={0}
                        siblingRange={0}
                        size='mini'
                        firstItem='1'
                        lastItem={`${pages}`}
                        data-cy='pagination'
                    />
                ) : (
                    <></>
                )}
                <Menu pointing vertical fluid className='conversation-browser'>
                    {renderMenuItems()}
                </Menu>
            </Grid.Column>
            <Grid.Column width={11}>
                <ConversationViewer
                    conversationId={activeConversationId}
                    onDelete={deleteConversation}
                    removeReadMark={optimisticRemoveMarker}
                    optimisticlyRemoved={optimisticRemoveReadMarker}
                    onCreateTestCase={createTestCase}
                    labeling={labeling}
                    onHasLabeledEventChange={handleHasLabeledEventChange}
                />
                {(labeling && currentTracker) ? renderConversationLabelButtons() : <></>}
            </Grid.Column>
        </>
    );

    return (
        <ConversationBrowserContext.Provider
            value={{
                modifyFilters: handleModifyFilters,
            }}
        >
            <Grid>
                <Grid.Row>
                    <Radio
                        toggle
                        label={t('Labeling')}
                        checked={labeling}
                        onChange={(_, checkbox) => handleLabelingChange(checkbox.checked)}
                    />
                </Grid.Row>
                <Grid.Row>
                    <ConversationFilters
                        activeFilters={activeFilters}
                        changeFilters={changeFilters}
                        onDownloadConversations={handleDownloadConversations}
                    />
                </Grid.Row>
                {trackers.length ? renderBody() : renderNoMessages()}
            </Grid>
        </ConversationBrowserContext.Provider>
    );
}

ConversationsBrowser.propTypes = {
    trackers: PropTypes.array,
    activeConversationId: PropTypes.string,
    page: PropTypes.number.isRequired,
    pages: PropTypes.number,
    refetch: PropTypes.func.isRequired,
    router: PropTypes.object.isRequired,
    activeFilters: PropTypes.object.isRequired,
    changeFilters: PropTypes.func.isRequired,
    handleDownloadConversations: PropTypes.func.isRequired,
    projectId: PropTypes.string.isRequired,
};

ConversationsBrowser.defaultProps = {
    pages: 1,
    trackers: [],
    activeConversationId: null,
};

export default ConversationsBrowser;
