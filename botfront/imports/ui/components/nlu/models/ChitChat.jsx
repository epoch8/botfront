import React from 'react';
import PropTypes from 'prop-types';
import Alert from 'react-s-alert';
import { Meteor } from 'meteor/meteor';
import {
    Dropdown, Confirm, Button,
    Loader, Message, Icon,
} from 'semantic-ui-react';
import { withTranslation } from 'react-i18next';

import { ProjectContext } from '../../../layouts/context';
import 'react-s-alert/dist/s-alert-default.css';

import { wrapMeteorCallback } from '../../utils/Errors';

class ChitChat extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            chitChatIntents: null,
            notConfiguredError: null,
            confirmOpen: false,
            selectedIntents: [],
        };
    }

    componentDidMount() {
        this.loadChitChatIntents();
    }

    handleIntentSelectorChange = (e, { value }) => {
        this.setState({ selectedIntents: value });
    };

    loadChitChatIntents = () => {
        const { t, model: { language } } = this.props;

        Meteor.call('nlu.getChitChatIntents', language, (e, intents) => {
            if (e) {
                if (e instanceof ReferenceError) {
                    this.setState({ notConfiguredError: e.message });
                } else {
                    Alert.error(`${t('Couldn\'t fetch chit chat intents')}: ${JSON.stringify(e.reason)}`, {
                        position: 'top',
                        timeout: 'none',
                    });
                }
            } else {
                this.setState({ chitChatIntents: intents });
            }
        });
    };

    addToTrainingData = () => {
        const { t, model: { language } } = this.props;
        const { project: { _id: projectId } } = this.context;
        const { selectedIntents } = this.state;
        this.close();

        Meteor.call('nlu.addChitChatToTrainingData', projectId, language, selectedIntents, wrapMeteorCallback(() => {
            this.setState({ selectedIntents: [] });
        }, t('imported chitchat examples to training data.')));
    };

    open = () => this.setState({ confirmOpen: true });

    close = () => this.setState({ confirmOpen: false });

    static contextType = ProjectContext;

    render() {
        const {
            notConfiguredError, chitChatIntents, confirmOpen, selectedIntents,
        } = this.state;
        const { t } = this.props;

        return (
            <div className='glow-box extra-padding no-margin'>
                {notConfiguredError && <Message error content={notConfiguredError} />}
                {chitChatIntents && chitChatIntents.length === 0 && <Message info content={t('Chitchat intents are not available in your model\'s language.')} />}
                {chitChatIntents && chitChatIntents.length > 0 && (
                    <div className='chitchat' style={{ minHeight: 300 }}>
                        {/* minHeight to make sure there is enough space for the dropdown */}
                        <Message info data-cy='chit-chat-message'>
                            <Icon name='lightbulb' size='small' />
                            {t('Chit chat intents are general conversation pre-trained intents. Select those you want to integrate in your model, add and re-train.')}
                        </Message>
                        <br />

                        <Dropdown
                            data-cy='select-chit-chat'
                            placeholder={t('Select chit chat intents')}
                            multiple
                            selection
                            fluid
                            value={selectedIntents}
                            search
                            onChange={this.handleIntentSelectorChange}
                            options={chitChatIntents.map(i => ({ text: i, value: i }))}
                        />
                        <br />
                        <br />
                        <Button
                            primary
                            disabled={selectedIntents.length === 0}
                            content={t('Add to training data')}
                            onClick={this.open}
                            data-cy='add-chit-chat'
                        />
                        <Confirm
                            header={t('Add to training data?')}
                            content={`${t('This will add chitchat examples to your training data matching the following intents')}: ${selectedIntents.join(' ')}`}
                            open={confirmOpen}
                            onCancel={this.close}
                            onConfirm={this.addToTrainingData}
                        />
                    </div>
                )}

                {!chitChatIntents && <Loader active inline='centered' />}
            </div>
        );
    }
}

ChitChat.propTypes = {
    model: PropTypes.object.isRequired,
};

export default withTranslation('nlu')(ChitChat);
