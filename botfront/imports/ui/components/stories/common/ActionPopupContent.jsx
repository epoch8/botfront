import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Popup, Input, Divider, Form, Button, Icon } from 'semantic-ui-react';

const ActionPopupContent = (props) => {
    const {
        onSelect, trigger, initialValue, initialParams, trackOpenMenu,
    } = props;
    const [isOpen, setIsOpen] = useState();
    const [actionName, setActionName] = useState(initialValue || '');
    const [actionParams, setActionParams] = useState(initialParams || []);

    const updateParamName = (index, name) => {
        setActionParams(
            actionParams.map(([p_name, p_val], i) => i === index ? [name, p_val] : [p_name, p_val])
        );
    };

    const updateParamValue = (index, value) => {
        setActionParams(
            actionParams.map(([p_name, p_val], i) => i === index ? [p_name, value] : [p_name, p_val])
        );
    };

    const removeParam = index => {
        setActionParams(
            actionParams.filter((value, i) => i !== index)
        );
    };

    const addParam = () => {
        setActionParams([...actionParams, ['', '']]);
    }

    const params = actionParams.map(([p_name, p_val], index) => (
        <Form.Group key={index}>
            <Form.Input
                placeholder='Name'
                value={p_name}
                onChange={e => updateParamName(index, e.target.value.trim())}
                required
            />
            <Form.Input
                placeholder='Value'
                value={p_val}
                onChange={e => updateParamValue(index, e.target.value.trim())}
                required
            />
            <Button icon='delete' onClick={e => {
                e.preventDefault();
                removeParam(index)}
            } />
        </Form.Group>
    ));

    return (
        <Popup
            tabIndex={0}
            trigger={trigger}
            wide
            on='click'
            open={isOpen}
            onOpen={() => {
                setIsOpen(true);
                // trackOpenMenu(() => setIsOpen(false));
            }}
            onClose={() => {
                setActionName(initialValue);
                setIsOpen(false);
            }}
        >
            <p className='all-caps-header'>Enter an action name</p>
            <Form
                onSubmit={(e) => {
                    e.preventDefault();
                    setActionName('');
                    setIsOpen(false);
                    if (actionName.trim()) onSelect(actionName);
                }}
            >
                <Input
                    value={actionName}
                    onChange={e => setActionName(e.target.value.trim())}
                    autoFocus
                />
                <Divider />
                <p className='all-caps-header'>Parameters</p>
                {params.length ? params : <></>}
                <Button icon='add' onClick={addParam} />
            </Form>
        </Popup>
    );
};

ActionPopupContent.propTypes = {
    onSelect: PropTypes.func,
    trigger: PropTypes.element.isRequired,
    initialValue: PropTypes.string,
    initialParams: PropTypes.array,
    trackOpenMenu: PropTypes.func,
};

ActionPopupContent.defaultProps = {
    onSelect: () => {},
    initialValue: '',
    initialParams: [['param1', 'val1']],
    trackOpenMenu: () => {},
};

export default ActionPopupContent;
