import React from 'react';
import { Icon, Popup } from 'semantic-ui-react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';

const ExceptionWrapper = (props) => {
    const { children, exceptions } = props;
    const errors = exceptions.filter(({ type }) => type === 'error');
    const warnings = exceptions.filter(({ type }) => type === 'warning');
    const { t } = this.props;

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
                    header={t(`Error${errors.length > 1 ? 's' : ''}`)}
                    content={t(renderPopupContent(errors))}
                    trigger={
                        <Icon name='times circle' color='red' className='error-indicator' />
                    }
                />
            )}
            {!errors.length > 0 && warnings.length > 0 && (
                <Popup
                    wide
                    position='left center'
                    header={t(`Warning${warnings.length > 1 ? 's' : ''}`)}
                    content={t(renderPopupContent(warnings))}
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

export default withTranslation('stories')(ExceptionWrapper);
