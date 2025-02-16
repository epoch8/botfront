import React from 'react';
import { browserHistory } from 'react-router';
import { Segment } from 'semantic-ui-react';
import { withTracker } from 'meteor/react-meteor-data';
import SimpleSchema from 'simpl-schema';
import SimpleSchema2Bridge from 'uniforms-bridge-simple-schema-2';
import {
    AutoForm, ErrorsField, SubmitField, TextField,
} from 'uniforms-semantic';
import { withTranslation } from 'react-i18next';
import { Meteor } from 'meteor/meteor';
import ReCAPTCHA from 'react-google-recaptcha';
import PropTypes from 'prop-types';
import { passwordComplexityRegex } from '../../../api/user/user.methods';
import { wrapMeteorCallback } from '../utils/Errors';
import { GlobalSettings } from '../../../api/globalSettings/globalSettings.collection';


const resetPasswordSchema = new SimpleSchema(
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

const resetPasswordSchemaBridge = new SimpleSchema2Bridge(resetPasswordSchema);


class ResetPassword extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            reCaptcha: null,
        };
    }

    handleResetPassword = ({ password }) => {
        this.setState({ loading: true });
        // eslint-disable-next-line react/prop-types
        const {
            // eslint-disable-next-line react/prop-types
            params: { token },
        } = this.props;

        Accounts.resetPassword(
            token,
            password,
            wrapMeteorCallback((err) => {
                if (err) {
                    this.setState({ loading: false });
                } else {
                    Meteor.loginWithPassword(
                        Meteor.user().emails[0].address,
                        password,
                        wrapMeteorCallback((error) => {
                            this.setState({ loading: true });
                            if (!error) browserHistory.push('/');
                        }),
                    );
                }
            }),
        );
    };

    onCaptcha = reCaptcha => Meteor.call(
        'user.verifyReCaptcha',
        reCaptcha,
        wrapMeteorCallback((err) => {
            if (!err) return this.setState({ reCaptcha });
            return this.reCaptchaRef.reset();
        }),
    );

    // Todo: translate
    render() {
        const { t } = this.props;
        const reCaptchaRef = (el) => {
            this.reCaptchaRef = el;
        };
        const { loading, reCaptcha } = this.state;
        const { settings: { settings: { public: { reCatpchaSiteKey } = { reCatpchaSiteKey: null } } = {} } = {} } = this.props;

        resetPasswordSchema.messageBox.messages({
            en: {
                passwordMismatch: t('The passwords are not matching. Make sure you enter the same password in both fields'),
                passwordTooSimple: t('Your password should contain at least 9 characters and have uppercase, lowercase, digit and special characters'),
            },
        });

        return (
            <Segment>
                <AutoForm model={{}} schema={resetPasswordSchemaBridge} onSubmit={this.handleResetPassword} className='ui large' disabled={loading}>
                    <ErrorsField />
                    <TextField name='password' iconLeft='lock' placeholder={t('Password')} type='password' label={null} />
                    <TextField name='passwordVerify' iconLeft='lock' placeholder={t('Repeat password')} type='password' label={null} />
                    {reCatpchaSiteKey && (
                        <div>
                            <ReCAPTCHA sitekey={reCatpchaSiteKey} onChange={this.onCaptcha} ref={reCaptchaRef} />
                            <br />
                        </div>
                    )}
                    <SubmitField value={t('RESET YOUR PASSWORD')} className='black large basic fluid' disabled={reCatpchaSiteKey && !reCaptcha} />
                </AutoForm>
            </Segment>
        );
    }
}

ResetPassword.propTypes = {
    settings: PropTypes.object,
    t: PropTypes.func,
};

ResetPassword.defaultProps = {
    settings: {},
    t: text => text,
};

export default withTracker(() => {
    const settings = GlobalSettings.findOne({}, { fields: { 'settings.public.reCatpchaSiteKey': 1 } });
    return {
        settings,
    };
})(withTranslation('account')(ResetPassword));
