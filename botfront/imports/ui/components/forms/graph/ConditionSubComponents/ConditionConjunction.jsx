import React from 'react';
import PropTypes from 'prop-types';
import ToggleButtonGroup from '../../../common/ToggleButtonGroup';
import { useTranslation } from "react-i18next";

const ConditionConjunction = (props) => {
    const {
        selectedConjunction, not, setNot, setConjunction,
    } = props;

    const { t } = useTranslation('forms');

    return (
        <div className='conjunction-container'>
            <ToggleButtonGroup
                className='condition-conjunction-buttons'
                options={[
                    { value: 'NOT', text: t('Not') },
                ]}
                onChange={() => setNot(!not)}
                value={{
                    NOT: not,
                }}
                compact
            />
            <ToggleButtonGroup
                className='condition-conjunction-buttons'
                options={[
                    { value: 'AND', text: t('And') },
                    { value: 'OR', text: t('Or') },
                ]}
                onChange={conjunction => setConjunction(conjunction)}
                optionsAreExclusive
                value={selectedConjunction}
                compact
            />
        </div>
    );
};

ConditionConjunction.propTypes = {
    not: PropTypes.bool,
    selectedConjunction: PropTypes.string,
    setConjunction: PropTypes.func.isRequired,
    setNot: PropTypes.func.isRequired,
};

ConditionConjunction.defaultProps = {
    not: false,
    selectedConjunction: 'AND',
};
export default ConditionConjunction;
