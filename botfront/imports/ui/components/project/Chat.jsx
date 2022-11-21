import React from 'react';
import PropTypes from 'prop-types';
import Widget from 'rasa-webchat';

class Chat extends React.Component {
    // WARNING
    // Returns false, because for some uninvestigated reason, Widget creates
    // leaking connections on ComponentWillUpdate
    shouldComponentUpdate() {
        // WARNING
        // This component will never update itself
        return false;
    }

    render() {
        const {
            socketUrl,
            language,
            path,
            initialPayLoad,
            innerRef,
            voiceInputEnabled,
            voiceInputConfig,
            voiceInputStopOnSilence,
            ttsEnabled,
            ttsNewMessages,
            ttsConfig,
        } = this.props;
        return (
            <Widget
                ref={innerRef}
                interval={0}
                initPayload={initialPayLoad}
                socketUrl={socketUrl}
                socketPath={path}
                inputTextFieldHint='Try out your chatbot...'
                hideWhenNotConnected={false}
                customData={{ language }}
                embedded
                customMessageDelay={() => 0}
                customComponent={(message) => {
                    const {
                        dispatch, id, isLast, store, ...custom
                    } = message;
                    return (
                        <div className='rw-response'>
                            You have to define a custom component prop on the rasa webchat to display this message.
                            {JSON.stringify(custom)}
                        </div>
                    );
                }}
                withRules
                voiceInputEnabled={voiceInputEnabled}
                voiceInputConfig={voiceInputConfig}
                voiceInputStopOnSilence={voiceInputStopOnSilence}
                ttsEnabled={ttsEnabled}
                ttsNewMessages={ttsNewMessages}
                ttsConfig={ttsConfig}
            />
        );
    }
}

Chat.propTypes = {
    socketUrl: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    language: PropTypes.string,
    initialPayLoad: PropTypes.string,
    innerRef: PropTypes.shape({ current: PropTypes.any }).isRequired,
    voiceInputEnabled: PropTypes.bool,
    voiceInputConfig: PropTypes.shape({
        serverUrl: PropTypes.string,
        audioChunkSize: PropTypes.number,
        stopOnSilenceDuration: PropTypes.number,
    }),
    voiceInputStopOnSilence: PropTypes.bool,
    ttsEnabled: PropTypes.bool,
    ttsNewMessages: PropTypes.bool,
    ttsConfig: PropTypes.shape({
        serverUrl: PropTypes.string,
    }),
};

Chat.defaultProps = {
    language: '',
    initialPayLoad: '',
    voiceInputEnabled: false,
    voiceInputConfig: {
        serverUrl: 'ws://localhost:2700',
        audioChunkSize: 2048,
        stopOnSilenceDuration: 2000,
    },
    voiceInputStopOnSilence: false,
    ttsEnabled: false,
    ttsNewMessages: false,
    ttsConfig: {
        serverUrl: 'ws://localhost:2700',
    },
};

export default React.forwardRef((props, ref) => <Chat innerRef={ref} {...props} />);
