import React from 'react';
import { Header, Button } from 'semantic-ui-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('setup');
    return (
        <div style={{ textAlign: 'center' }}>
            <Header as='h1' content={t('Welcome to Botfront')} className='setup-welcome-header' />
            <br />
            <span className='step-text'>{t('Let&apos;s create your admin account')}</span>
            <br />
            <br />
            <br />
            <br />
            <Link to='/setup/account'><Button data-cy='start-setup' size='big' primary content={t('Let&apos;s get started')} /></Link>
        </div>
    );
};
