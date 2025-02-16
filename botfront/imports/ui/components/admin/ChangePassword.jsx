import { AutoForm, AutoField, ErrorsField } from 'uniforms-semantic';
import SimpleSchema from 'simpl-schema';
import SimpleSchema2Bridge from 'uniforms-bridge-simple-schema-2';
import PropTypes from 'prop-types';
import React from 'react';
import {
    Button, Header,
} from 'semantic-ui-react';
import { withTranslation } from 'react-i18next';

import Alert from 'react-s-alert';
import 'react-s-alert/dist/s-alert-default.css';
import { passwordComplexityRegex } from '../../../api/user/user.methods';


const changePasswordSchema = new SimpleSchema(
    {
        password: {
            type: String,
            custom() {
                return !this.value.match(passwordComplexityRegex) ? 'passwordTooSimple' : null;
            },
        },
        passwordVerify: {
            type: String,
            custom() {
                return this.value !== this.field('password').value ? 'passwordMismatch' : null;
            },
        },
    },
    { tracker: Tracker },
);

const changePasswordSchemaBridge = new SimpleSchema2Bridge(changePasswordSchema);

class ChangePassword extends React.Component {
    constructor(props) {
        super(props);
        this.state = this.getInitialState();
    }

    getInitialState() {
        return {
            password: '',
            passwordConfirm: '',
        };
    }

    handleChange = (e, { value }) => {
        if (e.target.name === 'password') this.setState({ password: value });
        else if (e.target.name === 'passwordConfirm') this.setState({ passwordConfirm: value });
    };

    handleChangePassword = (formData) => {
        const { userId, t } = this.props;
        const { password, passwordVerify } = formData;
        if (password !== passwordVerify) {
            Alert.error(t('Passwords don\'t match'), {
                position: 'bottom',
                timeout: 2000,
            });
            return;
        }

        Meteor.call('user.changePassword', userId, password, (err) => {
            if (err) {
                Alert.error(`${t('Error:')} ${err.reason}`, {
                    position: 'bottom',
                    timeout: 'none',
                });
            } else {
                this.setState(this.getInitialState());
                Alert.success(t('Password changed'), {
                    position: 'bottom',
                    timeout: 2000,
                });
            }
        });
    };

    render () {
        const { t } = this.props;
        changePasswordSchema.messageBox.messages({
            en: {
                passwordMismatch: t('The passwords are not matching. Make sure you enter the same password in both fields'),
                passwordTooSimple: t('Your password should contain at least 9 characters and have uppercase, lowercase, digit and special characters'),
            },
        });
        return (
            <AutoForm schema={changePasswordSchemaBridge} onSubmit={this.handleChangePassword}>
                <Header>{t('Change Password')}</Header>
                <AutoField name='password' placeholder={t('password')} type='password' label={null} />
                <AutoField name='passwordVerify' placeholder={t('password')} type='password' label={null} />
                <Button data-cy='change-password'>{t('Change')}</Button>
                <ErrorsField />
            </AutoForm>
        );
    }
}

ChangePassword.propTypes = {
    userId: PropTypes.string.isRequired,
    t: PropTypes.func,
};

ChangePassword.defaultProps = {
    t: text => text,
};

export default withTranslation('admin')(ChangePassword);
