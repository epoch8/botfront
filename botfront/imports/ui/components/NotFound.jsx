import React from 'react';
import { Link } from 'react-router';
import { Container, Header } from 'semantic-ui-react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

export default function NotFound({ code }) {
    const { t } = useTranslation();
    return (
        <Container style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
            <div>
                <Header as='h1' style={{ fontFamily: 'Hind, sans-serif', fontSize: '160px' }}>{code}</Header>
                <Link to='/'>{t('&#8617; home')}</Link>
            </div>
        </Container>
    );
}

NotFound.propTypes = {
    code: PropTypes.number.isRequired,
};
