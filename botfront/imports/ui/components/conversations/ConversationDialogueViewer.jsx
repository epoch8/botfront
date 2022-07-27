import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import ReactJson from 'react-json-view';
import {
    Button, Comment, Grid, Message,
} from 'semantic-ui-react';
import { generateTurns } from './utils';

import UserUtteredEventViewer from '../example_editor/UserUtteredEventViewer';

function BotResponse({
    type, text, data,
}) {
    if (!text && !data) {
        return null;
    }
    // remove empty attributes
    if (data) Object.keys(data).forEach(key => (data[key] == null) && delete data[key]);

    const dataEmpty = !data || !Object.keys(data).length;
    return (
        <div className='bot-response-message'>
            {text && <p className='bot-response-text'>{text}</p>}
            {!dataEmpty && <ReactJson className='bot-response-json' src={data} collapsed name={type} />}
        </div>
    );
}

BotResponse.propTypes = {
    type: PropTypes.string.isRequired,
    text: PropTypes.string,
    data: PropTypes.object,
};

BotResponse.defaultProps = {
    text: '',
    data: null,
};

function Turn({
    userSays,
    userId,
    botResponses,
    userRef,
    eventIndex,
    label,
    labeling,
    onLabelChange,
}) {
    if (!userSays && botResponses.length === 0) {
        return null;
    }

    const { t } = useTranslation('conversation');

    const renderLabelButtons = () => {
        const buttons = [
            [t('полный ответ'), 'full answer'],
            [t('нет сценария'), 'no story'],
            [t('ошибка распознавания'), 'misclassification'],
            [t('сложная формулировка'), 'complicated wording'],
            [t('мусор'), 'trash'],
            [t('баг в сценарии'), 'bug in story'],
        ].map(([text, value]) => {
            const active = label === value;
            const labelValue = active ? null : value;
            return (
                <Button
                    onClick={() => onLabelChange && onLabelChange(eventIndex, labelValue)}
                    key={value}
                    active={active}
                    color={active ? 'blue' : null}
                >
                    {text}
                </Button>
            );
        });
        return (
            <Button.Group vertical>
                {buttons}
            </Button.Group>
        );
    };

    const comment = (
        <Comment>
            {userSays && (
                <>
                    <div ref={userRef} />
                    <Comment.Avatar src='/images/avatars/matt.jpg' />
                    <UserUtteredEventViewer
                        event={userSays}
                        author={userId}
                    />
                </>
            )}
            <Comment.Group>
                <Comment>
                    <Comment.Avatar src='/images/avatars/mrbot.png' />
                    <Comment.Content>
                        <Comment.Author as='a'>Bot</Comment.Author>
                        <Comment.Metadata>
                        </Comment.Metadata>
                        <Comment.Text>
                            {botResponses.map((response, index) => (
                                <React.Fragment key={`bot-response-${index}`}>
                                    <BotResponse {...response} />
                                </React.Fragment>
                            ))}
                        </Comment.Text>
                        <Comment.Actions>
                        </Comment.Actions>
                    </Comment.Content>
                </Comment>
            </Comment.Group>
        </Comment>
    );

    if (labeling) {
        return (
            <Grid>
                <Grid.Column width={12}>
                    {comment}
                </Grid.Column>
                <Grid.Column textAlign='center'>
                    {renderLabelButtons()}
                </Grid.Column>
            </Grid>
        );
    }

    return comment;
}

Turn.propTypes = {
    userSays: PropTypes.object,
    userId: PropTypes.string,
    botResponses: PropTypes.arrayOf(PropTypes.object).isRequired,
    userRef: PropTypes.object,
    onLabelChange: PropTypes.func,
};

Turn.defaultProps = {
    userSays: null,
    userId: null,
    userRef: null,
    onLabelChange: null,
};

function ConversationDialogueViewer({
    conversation: { tracker, userId },
    mode,
    messageIdInView,
    labeling,
    onLabelChange,
}) {
    const toScrollTo = React.createRef();

    const turns = useMemo(() => generateTurns(tracker, mode === 'debug'), [tracker]);
    useEffect(() => {
        if (toScrollTo.current) {
            toScrollTo.current.scrollIntoView({ block: 'center' });
        }
    }, []);

    return (
        <Comment.Group>
            {turns.length > 0 ? (
                turns.map(({
                    userSays, botResponses, messageId, label, eventIndex,
                }, index) => (
                    <React.Fragment key={`dialogue-turn-${index}`}>
                        <Turn
                            userSays={userSays}
                            userId={userId}
                            botResponses={botResponses}
                            eventIndex={eventIndex}
                            label={label}
                            labeling={labeling}
                            onLabelChange={onLabelChange}
                            // eslint-disable-next-line camelcase
                            userRef={messageId === messageIdInView ? toScrollTo : null}
                        />
                    </React.Fragment>
                ))
            ) : (
                <Message
                    info
                    icon='warning'
                    header='No events to show'
                    content={(() => {
                        if (mode !== 'debug') {
                            return 'check debug mode for non-dialogue events.';
                        }

                        return 'check JSON mode to view the full tracker object.';
                    })()}
                />
            )}
        </Comment.Group>
    );
}

ConversationDialogueViewer.propTypes = {
    conversation: PropTypes.object.isRequired,
    mode: PropTypes.string,
    messageIdInView: PropTypes.string,
    labeling: PropTypes.bool,
    onLabelChange: PropTypes.func,
};

ConversationDialogueViewer.defaultProps = {
    mode: 'text',
    messageIdInView: '',
    labeling: false,
    onLabelChange: null,
};

export default ConversationDialogueViewer;
