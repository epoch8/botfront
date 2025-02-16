import React from 'react';
import PropTypes from 'prop-types';
import { Input, Button, Label } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import IconButton from '../../common/IconButton';

function EntityValueEditor({
    entity,
    onChange,
    disallowAdvancedEditing,
    disallowValueEditing,
    disabled,
}) {
    const exists = field => field in entity && entity[field] !== null;
    const { t } = useTranslation('stories');

    const renderField = (label, key) => (
        <div className='side-by-side middle entity-value-input-container'>
            <Input
                disabled={disabled}
                data-cy={`entity-${key}-input`}
                value={entity[key]}
                onChange={(_, { value }) => onChange(
                    { ...entity, [key]: value },
                )}
                onMouseDown={e => e.stopPropagation()}
                size='small'
                labelPosition='left'
                className={`entity-${key}-input`}
            >
                <Label>{label}</Label>
                <input />
            </Input>
            {(key !== 'value' || exists('text')) && !disabled && (
                <div>
                    <IconButton
                        color='grey'
                        icon='trash'
                        onClick={key === 'value'
                            ? () => onChange({ ...entity, value: entity.text })
                            : () => { const { [key]: _, ...rest } = entity; onChange(rest); }
                        }
                    />
                </div>
            )}
        </div>
    );

    const renderAddButton = (label, key) => (
        <Button
            onClick={() => onChange({ ...entity, [key]: '' })}
            content={label}
            icon='add'
            disabled={disabled}
            data-cy={`add-entity-${key}`}
        />
    );

    const showValue = (!exists('text') || entity.text !== entity.value);
    const showRole = exists('role');
    const showGroup = exists('group');

    const renderAddButtons = () => {
        if (showValue && showRole && showGroup) return null;
        return (
            <Button.Group size='tiny' className='entity-option-buttons'>
                {!showValue && renderAddButton(t('Value'), 'value')}
                {!showRole && renderAddButton(t('Role'), 'role')}
                {!showGroup && renderAddButton(t('Group'), 'group')}
            </Button.Group>
        );
    };


    return (
        <div className='optional-entity-values-container'>
            {!disallowValueEditing && showValue && renderField(t('Value'), 'value')}
            {!disallowAdvancedEditing && showRole && renderField(t('Role'), 'role')}
            {!disallowAdvancedEditing && showGroup && renderField(t('Group'), 'group')}
            {!disallowAdvancedEditing && renderAddButtons()}
        </div>
    );
}

EntityValueEditor.propTypes = {
    entity: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    disallowAdvancedEditing: PropTypes.bool,
    disallowValueEditing: PropTypes.bool,
    disabled: PropTypes.bool,
};

EntityValueEditor.defaultProps = {
    disallowAdvancedEditing: false,
    disallowValueEditing: false,
    disabled: false,
};


export default EntityValueEditor;
