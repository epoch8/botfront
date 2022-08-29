import { Message } from 'semantic-ui-react';
import PropTypes from 'prop-types';
import React from 'react';
import { useTranslation } from 'react-i18next';

function ChangesSaved({
    title, content, onDismiss,
}) {
    const { t } = useTranslation('utils');
    return (
        <Message positive data-cy='changes-saved' onDismiss={onDismiss}>
            <Message.Header>{title || t('Your changes have been saved.')}</Message.Header>
            {content}
        </Message>
    );
}

ChangesSaved.propTypes = {
    title: PropTypes.string,
    content: PropTypes.element,
    onDismiss: PropTypes.func,
};

ChangesSaved.defaultProps = {
    content: <></>,
    title: '',
    onDismiss: null,
};

export default ChangesSaved;
