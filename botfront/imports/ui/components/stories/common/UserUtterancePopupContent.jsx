import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
    Dropdown, Modal, Button,
} from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import PayloadEditor from './PayloadEditor';

const UserUtterancePopupContent = (props) => {
    const {
        onCreateFromPayload, onCreateFromInput, trigger, trackOpenMenu,
    } = props;
    const [modalOpen, setModalOpen] = useState(false);
    const [payload, setPayload] = useState({ intent: null, entities: [] });
    const [menuOpen, setMenuOpen] = useState();
    const { t } = useTranslation('stories');

    const payloadValid = () => {
        if (!payload.intent) return false;
        if (payload.entities.length > 0
            && payload.entities.some(e => !e.entity || !e.value || e.value.trim() === '')) return false;
        return true;
    };

    return (
        <>
            <Modal
                tabIndex={0}
                size='tiny'
                open={modalOpen}
            >
                <Modal.Content>
                    <PayloadEditor onChange={setPayload} value={payload} />
                </Modal.Content>
                <Modal.Actions>
                    <Button
                        content={t('Save')}
                        color='green'
                        disabled={!payloadValid()}
                        onClick={(e) => {
                            e.preventDefault();
                            setModalOpen(false);
                            onCreateFromPayload({ ...payload, entities: payload.entities.map(({ entity, value: v }) => ({ [entity]: v })) });
                        }}
                        data-cy='save-user-utterance'
                    />
                    <Button
                        content={t('Cancel')}
                        color='red'
                        basic
                        onClick={(e) => { e.preventDefault(); setModalOpen(false); }}
                    />
                </Modal.Actions>
            </Modal>
            <Dropdown
                trigger={trigger}
                className='dropdown-button-trigger'
                open={menuOpen}
                onOpen={() => {
                    setMenuOpen(true);
                    trackOpenMenu(() => setMenuOpen(false));
                }}
                onClose={() => setMenuOpen(false)}
            >
                <Dropdown.Menu className='first-column'>
                    <Dropdown.Item onClick={() => onCreateFromInput()} data-cy='user-line-from-input'>{t('Text')}</Dropdown.Item>
                    <Dropdown.Item onClick={() => setModalOpen(true)} data-cy='user-line-from-payload'>{t('Payload')}</Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </>
    );
};

UserUtterancePopupContent.propTypes = {
    trigger: PropTypes.element.isRequired,
    onCreateFromPayload: PropTypes.func,
    onCreateFromInput: PropTypes.func,
    trackOpenMenu: PropTypes.func,
};

UserUtterancePopupContent.defaultProps = {
    onCreateFromPayload: () => {},
    onCreateFromInput: () => {},
    trackOpenMenu: () => {},
};

export default UserUtterancePopupContent;
