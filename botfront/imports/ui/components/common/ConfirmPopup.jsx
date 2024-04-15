import { Segment, Header, Button } from 'semantic-ui-react';
import PropTypes from 'prop-types';
import React from 'react';
import { useTranslation } from 'react-i18next';

const ConfirmPopup = ({
    title,
    onYes,
    onNo,
    description,
    content,
    negative,
    confirmText,
    onExtra,
    extraBtnText,
}) => {
    const { t } = useTranslation('common');
    return (
        <Segment basic className='confirm-popup' data-cy='confirm-popup'>
            <Header as='h4'>{title}</Header>
            {description}
            {content}
            <div className='popup-buttons'>
                <Button
                // basic{negative}
                    primary
                    onClick={onNo}
                    size='tiny'
                    data-cy='confirm-no'
                >
                    {t('Cancel')}
                </Button>
                <Button
                    primary
                    negative={negative}
                    basic
                    onClick={onYes}
                    size='tiny'
                    data-cy='confirm-yes'
                >
                    {confirmText || t('Confirm')}
                </Button>
                {onExtra && extraBtnText && (
                    <Button
                        primary
                        negative={negative}
                        basic
                        onClick={onExtra}
                        size='tiny'
                        data-cy='confirm-extra'
                    >
                        {extraBtnText}
                    </Button>
                )}
            </div>
        </Segment>
    );
};


ConfirmPopup.propTypes = {
    title: PropTypes.string,
    onYes: PropTypes.func,
    description: PropTypes.string,
    content: PropTypes.node,
    onNo: PropTypes.func,
    negative: PropTypes.bool,
    confirmText: PropTypes.string,
    onExtra: PropTypes.func,
    extraBtnText: PropTypes.string,
};

ConfirmPopup.defaultProps = {
    description: '',
    onYes: () => {},
    onNo: () => {},
    content: null,
    title: '',
    negative: false,
    confirmText: '',
    onExtra: () => {},
    extraBtnText: '',
};

export default ConfirmPopup;
