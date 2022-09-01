import React from 'react';

import {
    AutoForm, AutoField, ErrorsField, SubmitField,
} from 'uniforms-semantic';
import PropTypes from 'prop-types';
import SimpleSchema2Bridge from 'uniforms-bridge-simple-schema-2';
import { withTranslation } from 'react-i18next';

import { accountSetupSchema } from '../../../api/setup';

// eslint-disable-next-line react/prefer-stateless-function
class StepAccountComponent extends React.Component {
    render() {
        const { onSubmit, data, t } = this.props;
        accountSetupSchema.messageBox.messages({
            en: {
                passwordMismatch: t('The passwords are not matching. Make sure you enter the same password in both fields'),
                passwordTooSimple: t('Your password should contain at least 9 characters and have uppercase, lowercase, digit and special characters'),
            },
        });
        const bridge = new SimpleSchema2Bridge(accountSetupSchema);
        return (
            <AutoForm model={data} schema={bridge} onSubmit={onSubmit}>
                <AutoField name='firstName' placeholder={t('Your first name')} label={null} />
                <AutoField name='lastName' placeholder={t('Your last name')} label={null} />
                <AutoField name='email' placeholder={t('Your email')} label={null} />
                <AutoField
                    name='password'
                    placeholder={t('Choose a password')}
                    label={null}
                    type='password'
                />
                <AutoField
                    name='passwordVerify'
                    placeholder={t('Confirm your password')}
                    label={null}
                    type='password'
                />
                <br />
                <ErrorsField />
                <div style={{ textAlign: 'center' }}>
                    <SubmitField
                        data-cy='account-create-button'
                        value={t('Create')}
                        className='primary'
                    />
                </div>
            </AutoForm>
        );
    }
}

StepAccountComponent.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    data: PropTypes.object,
};

StepAccountComponent.defaultProps = {
    data: undefined,
};

export default withTranslation('setup')(StepAccountComponent);
