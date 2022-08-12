import { Dropdown } from 'semantic-ui-react';
import React, { useState, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import IconButton from '../../common/IconButton';
import { ProjectContext } from '../../../layouts/context';
import { withTranslation } from "react-i18next";

// eslint-disable-next-line no-control-regex
const asciiChar = /^[\x21-\x7E]+$/;

function EntityDropdown({
    entity, onAddItem, onChange, onClear, allowAdditions, disabled,
}) {
    const { entities = [] } = useContext(ProjectContext);
    const options = useMemo(
        () => [
            ...new Set(
                [
                    ...(entity && entity.entity ? [entity] : []),
                    ...entities,
                ].map(option => (typeof option === 'string' ? option : option.entity)),
            ),
        ]
            .filter(o => o)
            .map(value => ({
                text: value,
                value,
            })),
        [entities, entity],
    );
    const { t } = this.props;
    const [searchInputState, setSearchInputState] = useState('');

    const handleSearchChange = (_e, { searchQuery }) => {
        // !searchQuery means emtpy string
        if (asciiChar.test(searchQuery) || !searchQuery) {
            setSearchInputState(searchQuery);
        }
    };

    return (
        <div className='side-by-side middle'>
            <Dropdown
                disabled={disabled}
                icon='code'
                basic
                fluid
                button
                labeled
                className='icon entity-dropdown'
                placeholder={t('Select an entity... ')}
                search
                selection
                value={entity && entity.entity}
                allowAdditions={allowAdditions}
                additionLabel='Add entity: '
                onAddItem={(_, { value }) => onAddItem(value)}
                onChange={(_, { value }) => onChange(value)}
                onSearchChange={handleSearchChange}
                searchQuery={searchInputState}
                options={options}
                data-cy='entity-dropdown'
            />
            {onClear && !disabled && (
                <div>
                    <IconButton onClick={onClear} color='grey' icon='trash' />
                </div>
            )}
        </div>
    );
}

EntityDropdown.propTypes = {
    entity: PropTypes.object.isRequired,
    onAddItem: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    onClear: PropTypes.func,
    allowAdditions: PropTypes.bool,
    disabled: PropTypes.bool,
};

EntityDropdown.defaultProps = {
    allowAdditions: true,
    onClear: null,
    disabled: false,
};

export default withTranslation('nlu')(EntityDropdown);
