import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Header, Modal, Message } from 'semantic-ui-react';
import { useDrag, useDrop } from 'react-dnd-cjs';
import TextareaAutosize from 'react-autosize-textarea';
import { useTranslation } from 'react-i18next';

import QuickReplies from './QuickReplies';
import ImageThumbnail from './ImageThumbnail';
import ResponseButtonEditor from './ResponseButtonEditor';

function CarouselSlide(props) {
    const {
        parentId, slideIndex, onDelete, onReorder, value, onChange,
    } = props;

    const [newValue, doSetNewValue] = useState(value);
    const {
        buttons = [],
        image_url: image = '',
        default_action: defaultAction = null,
    } = newValue;
    useEffect(() => doSetNewValue(value), [value]);
    const setNewValue = (update = {}) => doSetNewValue({ ...newValue, ...update });
    const [modalOpen, setModalOpen] = useState(false);
    const { t } = useTranslation('stories');

    const setValue = (update = {}) => onChange({ ...newValue, ...update });

    const [, drag] = useDrag({
        item: { type: `slide-for-${parentId}`, slideIndex },
    });
    const [{ canDrop, isOver }, drop] = useDrop({
        accept: `slide-for-${parentId}`,
        drop: ({ slideIndex: draggedSlideIndex }) => {
            if (draggedSlideIndex !== slideIndex) { onReorder(slideIndex, draggedSlideIndex); }
        },
        collect: monitor => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    const hasUrlOrPayload = ((defaultAction || {}).url || '').trim()
        || ((defaultAction || {}).payload || '').trim();

    const renderDefaultActionModal = () => (
        <div className='image-modal'>
            {(defaultAction || { type: 'web_url' }).type !== 'web_url' && (
                <Message
                    warning
                    content={t('Facebook Messenger only supports default actions with a Web URL payload. Carousels that have slides with Postback default actions will not render.')}
                />
            )}
            <ResponseButtonEditor
                noButtonTitle
                value={defaultAction || { type: 'web_url' }}
                onChange={v => setNewValue({ default_action: v })}
                onClose={() => {
                    setValue(hasUrlOrPayload ? {} : { default_action: null });
                    setModalOpen(false);
                }}
                valid
            />
        </div>
    );
    return (
        <div
            className={`carousel-slide ${
                canDrop ? (isOver ? 'upload-target' : 'faded-upload-target') : ''
            }`}
            ref={node => drag(drop(node))}
        >
            <ImageThumbnail
                value={image}
                onChange={url => setValue({ image_url: url })}
                otherActions={[
                    [
                        t('Set default action'),
                        () => setModalOpen(true),
                        'set-default-action',
                    ],
                    ...(onDelete
                        ? [[t('Delete card'), onDelete, 'delete-slide', 'red-text']]
                        : []),
                ]}
                className={hasUrlOrPayload ? 'highlight' : ''}
            />
            {modalOpen && (
                <Modal
                    open
                    size='tiny'
                    header={t('Change default action')}
                    onClose={() => {
                        setValue();
                        setModalOpen(false);
                    }}
                    content={renderDefaultActionModal()}
                />
            )}
            <Header as='h3'>
                <TextareaAutosize
                    placeholder={t('Title')}
                    value={newValue.title}
                    onChange={event => setNewValue({ title: event.target.value })}
                    onBlur={() => setValue()}
                />
                <Header.Subheader>
                    <TextareaAutosize
                        placeholder={t('Description')}
                        value={newValue.subtitle}
                        onChange={event => setNewValue({ subtitle: event.target.value })}
                        onBlur={() => setValue()}
                    />
                </Header.Subheader>
            </Header>
            <QuickReplies
                {...props}
                min={0}
                max={3}
                fluid
                value={buttons}
                onChange={v => setValue({ buttons: v })}
            />
        </div>
    );
}

CarouselSlide.propTypes = {
    parentId: PropTypes.string,
    slideIndex: PropTypes.number,
    onDelete: PropTypes.func,
    onReorder: PropTypes.func,
    value: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
};

CarouselSlide.defaultProps = {
    parentId: 'default',
    slideIndex: 0,
    onDelete: null,
    onReorder: () => {},
};

export default CarouselSlide;
