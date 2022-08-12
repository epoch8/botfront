import React from 'react';
import PropTypes from 'prop-types';
import { Popup } from 'semantic-ui-react';
import IconButton from '../../common/IconButton';
import { withTranslation } from "react-i18next";

const ButtonTypeToggle = (props) => {
    const { className, responseType, onToggleButtonType } = props;
    const { t } = this.props;

    const renderPopupContent = () => {
        if (responseType === 'TextWithButtonsPayload') {
            return t('the button will disappear when a new message is added to the conversation');
        }
        if (responseType === 'QuickRepliesPayload') {
            return t('the button will remain visible and clickable');
        }
        return <></>;
    };

    const renderPopupHeader = () => {
        if (responseType === 'TextWithButtonsPayload') {
            return t('Disable persistence');
        }
        if (responseType === 'QuickRepliesPayload') {
            return t('Enable persistence');
        }
        return <></>;
    };
    
    return (
        <>
            {(responseType === 'TextWithButtonsPayload' || responseType === 'QuickRepliesPayload') && (
                <Popup
                    className='toggle-button-type-tooltip'
                    on='hover'
                    trigger={(
                        <span className='button-type-toggle'>
                            <IconButton
                                icon='pin'
                                color={null}
                                className={`${responseType === 'TextWithButtonsPayload' ? 'light-green' : 'grey'} ${className}`}
                                onClick={onToggleButtonType}
                            />
                        </span>
                    )}
                    header={t(renderPopupHeader())}
                    content={t(renderPopupContent())}
                />
            )}
        </>
    );
};

ButtonTypeToggle.propTypes = {
    onToggleButtonType: PropTypes.func.isRequired,
    responseType: PropTypes.string,
    className: PropTypes.string,
};

ButtonTypeToggle.defaultProps = {
    className: '',
    responseType: null,
};

export default withTranslation('templates')(ButtonTypeToggle);
