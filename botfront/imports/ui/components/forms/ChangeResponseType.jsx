import { Dropdown, Confirm, Button } from 'semantic-ui-react';
import React, { useContext, useState } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { defaultTemplate } from '../../../lib/botResponse.utils';
import { ProjectContext } from '../../layouts/context';
import { can } from '../../../lib/scopes';

const ChangeResponseType = (props) => {
    const {
        name, currentResponseType, projectId,
    } = props;
    const [selectedType, setSelectedType] = useState();

    const { upsertResponse } = useContext(ProjectContext);
    const { t } = useTranslation('forms');

    const options = [
        { value: 'TextPayload', text: t('text') },
        { value: 'QuickRepliesPayload', text: t('quick reply') },
        { value: 'TextWithButtonsPayload', text: t('buttons') },
        { value: 'CarouselPayload', text: t('carousel') },
        { value: 'CustomPayload', text: t('custom') },
    ];

    const handleChangeResponseType = () => {
        upsertResponse(name, { payload: defaultTemplate(selectedType) }, 0);
        setSelectedType(null);
    };

    const handleSelectType = (value) => {
        if (value === currentResponseType) return;
        setSelectedType(value);
    };

    if (!can('responses:w', projectId)) return (<></>);

    return (
        <>
            <Dropdown
                data-cy='change-response-type'
                icon=''
                className='change-response-type'
                text={t('Change response type')}
                onChange={handleSelectType}
            >
                <Dropdown.Menu>
                    {options.map((option, idx) => (
                        <Dropdown.Item
                            onClick={() => handleSelectType(option.value)}
                            active={currentResponseType === option.value}
                            key={idx}
                        >
                            {option.text}
                        </Dropdown.Item>
                    ))}
                </Dropdown.Menu>
            </Dropdown>
            <Confirm
                open={!!selectedType}
                header={t('Warning!')}
                content={t('Are you sure you want to change the response type? The current response will be deleted.')}
                onConfirm={handleChangeResponseType}
                onCancel={() => setSelectedType(null)}
                confirmButton={
                    <Button color='blue' data-cy='confirm-response-type-change'>Ok</Button>
                }
            />
        </>
    );
};

ChangeResponseType.propTypes = {
    name: PropTypes.string.isRequired,
    currentResponseType: PropTypes.string,
    projectId: PropTypes.string.isRequired,
};

ChangeResponseType.defaultProps = {
    currentResponseType: '',
};

const mapStateToProps = state => ({
    projectId: state.settings.get('projectId'),
});

export default connect(mapStateToProps)(ChangeResponseType);
