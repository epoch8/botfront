import React from 'react';
import { Icon, Popup } from 'semantic-ui-react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const ExceptionWrapper = (props) => {
    const { children, exceptions } = props;
    const errors = exceptions.filter(({ type }) => type === 'error');
    const warnings = exceptions.filter(({ type }) => type === 'warning');
    const { t } = useTranslation('stories');

    if (!exceptions.length) return children;

    const className = `has-exceptions ${errors.length ? 'error' : warnings.length ? 'warning' : ''}`;

    const renderPopupContent = content => content.map(({ message, type }, index) => (
        <p key={`${type}-${index}`}>{message}</p>
    ));
    return (
        <span className={className}>
            {errors.length > 0 && (
                <Popup
                    wide
                    position='left center'
                    header={errors.length > 1 ? t('Errors') : t('Error')}
                    content={renderPopupContent(errors)}
                    trigger={
                        <Icon name='times circle' color='red' className='error-indicator' />
                    }
                />
            )}
            {!errors.length > 0 && warnings.length > 0 && (
                <Popup
                    wide
                    position='left center'
                    header={warnings.length > 1 ? t('Warnings') : t('Warning')}
                    content={renderPopupContent(warnings)}
                    trigger={(
                        <Icon name='exclamation circle' color='yellow' className='warning-indicator' />
                    )}
                />
            )}
            {children}
        </span>
    );
};

ExceptionWrapper.propTypes = {
    exceptions: PropTypes.array,
    children: PropTypes.node,
};

ExceptionWrapper.defaultProps = {
    children: <></>,
    exceptions: [{ type: null, message: '' }],
};

export default ExceptionWrapper;
