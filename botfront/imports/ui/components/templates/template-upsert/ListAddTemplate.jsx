/* eslint-disable react/prop-types */
import React from 'react';
import connectField from 'uniforms/connectField';
import { Dropdown, Button } from 'semantic-ui-react';
import yamljs from 'js-yaml';
import cloneDeep from 'lodash/cloneDeep';
import { useTranslation } from 'react-i18next';
import { examples } from './templateExamples';

const insert = (array, index, value) => {
    const arr2 = cloneDeep(array);
    arr2.splice(index, 0, value);
    return arr2;
};

function getExample(index) {
    return { content: yamljs.safeDump(examples[index]) };
}

const ListAddTemplate = ({
    className,
    disabled,
    parent,
    value,
    ...props
}) => {
    const { insert: isInsert, name } = props;
    const index = name.split(/[.]+/).pop();
    const limitNotReached = !disabled && !(parent.maxCount <= parent.value.length);
    const handleChange = (e, data) => {
        if (isInsert) {
            return limitNotReached && parent.onChange(insert(parent.value, index, getExample(data.value)));
        }
        return limitNotReached && parent.onChange(parent.value.concat([{ content: yamljs.safeDump(examples[data.value]) }]));
    };
    const indexClassName = `response-message-${isInsert ? index : 'next'}`;

    const { t } = useTranslation('templates');

    const messageTypesOptions = [
        { value: 0, text: t('Text') },
        { value: 1, text: t('Text with buttons (quick replies)') },
        { value: 2, text: t('Image') },
        { value: 3, text: t('Button template') },
        { value: 4, text: t('Generic template') },
        { value: 5, text: t('List template') },
        { value: 6, text: t('Messenger Handoff') },
    ];

    return (
        <Button.Group size='big'>
            <Dropdown
                basic
                size='big'
                icon='add'
                disabled={!limitNotReached}
                button
                className={`icon ${indexClassName} sequence-add-message`}
            >
                <Dropdown.Menu>
                    <Dropdown.Header content={t('Choose a message template')} className='sequence-add-message-menu-header' />
                    {messageTypesOptions.map(option => <Dropdown.Item key={option.value} onClick={handleChange} {...option} />)}
                </Dropdown.Menu>
            </Dropdown>
        </Button.Group>
    );
};

export default connectField(ListAddTemplate, { includeParent: true, initialValue: false });
