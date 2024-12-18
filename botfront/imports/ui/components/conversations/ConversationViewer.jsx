import React, {
    useState, useEffect, useRef, useMemo,
} from 'react';
import PropTypes from 'prop-types';
import {
    Icon, Menu, Segment, Placeholder,
} from 'semantic-ui-react';
import Alert from 'react-s-alert';
import { useQuery, useMutation } from '@apollo/react-hooks';
import { connect } from 'react-redux';
import { withTracker } from 'meteor/react-meteor-data';
import { safeLoad } from 'js-yaml/lib/js-yaml';
import { GET_CONVERSATION } from './queries';
import { MARK_READ, LABEL_EVENT } from './mutations';
import { getEventLabel } from './utils';
import { GET_BOT_RESPONSES } from '../templates/queries';
import ConversationJsonViewer from './ConversationJsonViewer';
import ConversationDialogueViewer from './ConversationDialogueViewer';
import Can from '../roles/Can';
import { Cache } from '../../../lib/utils';
import { Instances } from '../../../api/instances/instances.collection';

const audioCache = new Cache(20);

function ConversationViewer(props) {
    const [active, setActive] = useState('Text');
    const [savedTest, setSavedTest] = useState(false);

    const timeout = useRef(null);

    useEffect(() => () => clearTimeout(timeout.current), []);

    const {
        tracker,
        ready,
        onDelete,
        removeReadMark,
        optimisticlyRemoved,
        onCreateTestCase,
        labeling,
        onLabelChange,
        audioAvailable,
        botResponsesComments,
    } = props;

    const [markRead, { data }] = useMutation(MARK_READ);

    function handleItemClick(event, item) {
        setActive(item.name);
    }
    /*
    function handleItemStatus(event, { name: status }) {
        Meteor.call('conversations.updateStatus', tracker._id, status);
    }
    */

    function handleItemDelete() {
        onDelete(tracker._id);
    }

    const handleSaveAsTestCase = () => {
        setSavedTest(false);
        onCreateTestCase(tracker._id, (err) => {
            if (!err) {
                timeout.current = setTimeout(() => setSavedTest(true), 50);
            }
        });
    };

    function renderSegment() {
        const style = {
            maxHeight: '82vh',
            overflowY: 'scroll',
        };

        if (!ready) {
            return (
                <Segment style={style} attached>
                    <Placeholder>
                        <Placeholder.Header image>
                            <Placeholder.Line />
                            <Placeholder.Line />
                        </Placeholder.Header>
                        <Placeholder.Paragraph>
                            <Placeholder.Line />
                            <Placeholder.Line />
                            <Placeholder.Line />
                            <Placeholder.Line />
                        </Placeholder.Paragraph>
                    </Placeholder>
                    <Placeholder>
                        <Placeholder.Header image>
                            <Placeholder.Line />
                            <Placeholder.Line />
                        </Placeholder.Header>
                        <Placeholder.Paragraph>
                            <Placeholder.Line />
                            <Placeholder.Line />
                            <Placeholder.Line />
                            <Placeholder.Line />
                        </Placeholder.Paragraph>
                    </Placeholder>
                </Segment>
            );
        }

        return (
            <Segment style={style} attached>
                {active === 'Text' && (
                    <ConversationDialogueViewer
                        conversation={tracker}
                        labeling={labeling}
                        onLabelChange={onLabelChange}
                        mode='text'
                        botResponsesComments={botResponsesComments}
                    />
                )}
                {active === 'Debug' && (
                    <ConversationDialogueViewer
                        conversation={tracker}
                        labeling={labeling}
                        onLabelChange={onLabelChange}
                        mode='debug'
                        botResponsesComments={botResponsesComments}
                    />
                )}
                {active === 'JSON' && (
                    <ConversationJsonViewer tracker={tracker.tracker} />
                )}
            </Segment>
        );
    }

    useEffect(() => {
        if (
            tracker
            && tracker.status !== 'read'
            && !optimisticlyRemoved.has(tracker._id)
        ) {
            removeReadMark(tracker._id);
            markRead({ variables: { id: tracker._id } });
        }
    }, [props]);

    useEffect(() => {
        if (data && !data.markAsRead.success) {
            Alert.warning(
                'Something went wrong, the conversation was not marked as read',
                {
                    position: 'top-right',
                    timeout: 5000,
                },
            );
        }
    }, [data]);

    const [audioLoading, setAudioLoading] = useState(true);
    const [audioDataUrl, setAudioDataUrl] = useState(null);

    const renderAudioPlayer = () => {
        if (!audioDataUrl) {
            return 'No audio available';
        }
        return <audio controls src={audioDataUrl} />;
    };

    useEffect(() => {
        const senderId = tracker?.tracker?.sender_id;
        if (!senderId) return undefined;
        let cancelled = false;
        const cachedAudio = audioCache.get(senderId);
        if (cachedAudio) {
            setAudioDataUrl(URL.createObjectURL(cachedAudio));
            setAudioLoading(false);
        } else {
            setAudioLoading(true);
            Meteor.call('conversations.getAudio', senderId, (err, res) => {
                if (cancelled) {
                    return;
                }
                let newUrl = null;
                if (res && !err) {
                    const audioData = new Blob([res], { type: 'audio/wav' });
                    audioCache.set(senderId, audioData);
                    newUrl = URL.createObjectURL(audioData);
                }
                setAudioDataUrl(newUrl);
                setAudioLoading(false);
            });
        }
        return () => {
            cancelled = true;
            if (audioDataUrl) {
                URL.revokeObjectURL(audioDataUrl);
                setAudioDataUrl(null);
            }
        };
    }, [tracker]);

    return (
        <div className='conversation-wrapper'>
            <Menu compact attached='top'>
                {/* <Menu.Item name='new' disabled={!ready} active={ready && tracker.status === 'new'} onClick={this.handleItemStatus}>
                        <Icon name='mail' />
                    </Menu.Item>
                    <Menu.Item name='flagged' disabled={!ready} active={ready && tracker.status === 'flagged'} onClick={this.handleItemStatus}>
                        <Icon name='flag' />
                    </Menu.Item> */}
                <Can I='incoming:w'>
                    <>
                        <Menu.Item
                            name='archived'
                            disabled={!ready}
                            active={ready && tracker.status === 'archived'}
                            onClick={handleItemDelete}
                        >
                            <Icon name='trash' data-cy='conversation-delete' />
                        </Menu.Item>
                        <Menu.Item
                            name='archived'
                            disabled={!ready}
                            active={ready && tracker.status === 'archived'}
                            onClick={handleSaveAsTestCase}
                        >
                            <Icon
                                name='clipboard check'
                                data-cy='save-as-test'
                                color={savedTest ? 'green' : 'black'}
                                className={savedTest ? 'saved-test' : ''}
                            />
                        </Menu.Item>
                    </>
                </Can>
                <Menu.Menu position='right'>
                    <Menu.Item
                        name='Text'
                        disabled={!ready}
                        active={ready && active === 'Text'}
                        onClick={handleItemClick}
                    >
                        <Icon name='comments' />
                    </Menu.Item>
                    <Menu.Item
                        name='Debug'
                        disabled={!ready}
                        active={ready && active === 'Debug'}
                        onClick={handleItemClick}
                    >
                        <Icon name='bug' />
                    </Menu.Item>
                    <Menu.Item
                        name='JSON'
                        disabled={!ready}
                        active={ready && active === 'JSON'}
                        onClick={handleItemClick}
                    >
                        <Icon name='code' />
                    </Menu.Item>
                </Menu.Menu>
            </Menu>
            {audioAvailable && (
                <Segment loading={audioLoading}>{renderAudioPlayer()}</Segment>
            )}
            {renderSegment(ready, active, tracker)}
        </div>
    );
}

ConversationViewer.defaultProps = {
    tracker: null,
    optimisticlyRemoved: new Set(),
    labeling: false,
    onLabelChange: null,
};

ConversationViewer.propTypes = {
    tracker: PropTypes.object,
    onDelete: PropTypes.func.isRequired,
    ready: PropTypes.bool.isRequired,
    removeReadMark: PropTypes.func.isRequired,
    optimisticlyRemoved: PropTypes.instanceOf(Set),
    onCreateTestCase: PropTypes.func.isRequired,
    labeling: PropTypes.bool,
    onLabelChange: PropTypes.func,
    audioAvailable: PropTypes.bool.isRequired,
};

const ConversationViewerContainer = withTracker((props) => {
    const {
        conversationId,
        projectId,
        onDelete,
        removeReadMark,
        optimisticlyRemoved,
        onCreateTestCase,
        labeling,
        onHasLabeledEventChange,
    } = props;

    const tracker = useRef(null);

    const {
        loading, error, data, refetch,
    } = useQuery(GET_CONVERSATION, {
        variables: { projectId, conversationId },
        pollInterval: 2000,
    });

    const handler = Meteor.subscribe('nlu_instances', projectId);
    const instance = Instances.findOne({ projectId }, { fields: { audioRecordsUrl: 1 } });
    const audioAvailable = !!instance?.audioRecordsUrl;

    const { data: resp } = useQuery(GET_BOT_RESPONSES, {
        variables: { projectId },
        pollInterval: 2000,
    });

    const botResponsesComments = useMemo(
        () => resp?.botResponses.map(r => ({
            id: r.key,
            comment: safeLoad(r.comment)?.text,
        })),
        [resp],
    );
    const [labelEvent, { data: labelEventData }] = useMutation(LABEL_EVENT);

    const newTracker = !loading && !error && data ? data.conversation : null;

    const compareLabels = () => {
        const currentTracker = tracker.current;
        if (!newTracker || !currentTracker) return false;
        return newTracker.tracker.events.every(
            (newEvent, index) => getEventLabel(currentTracker.tracker.events[index])
                === getEventLabel(newEvent),
        );
    };

    if (
        newTracker
        && ((tracker.current ? tracker.current.tracker.events : []).length
            !== newTracker.tracker.events.length
            || (tracker.current || {})._id !== newTracker._id
            || !compareLabels())
    ) {
        tracker.current = newTracker;
        if (onHasLabeledEventChange) {
            onHasLabeledEventChange(newTracker.tracker.events.some(getEventLabel));
        }
    }

    const onLabelChange = (eventIndex, label) => {
        labelEvent({ variables: { id: conversationId, eventIndex, label } }).then(() => refetch());
    };

    return {
        ready: !!tracker.current && handler.ready(),
        onDelete,
        tracker: tracker.current,
        removeReadMark,
        optimisticlyRemoved,
        onCreateTestCase,
        labeling,
        onLabelChange,
        audioAvailable,
        botResponsesComments,
    };
})(ConversationViewer);

const mapStateToProps = state => ({
    projectId: state.settings.get('projectId'),
});

export default connect(mapStateToProps)(ConversationViewerContainer);
