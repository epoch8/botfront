import React, {
    useState, useEffect, useMemo, useContext,
} from 'react';
import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';
import {
    Popup, Input, Divider, Form, Button,
} from 'semantic-ui-react';
import { ProjectContext } from '../../../layouts/context';


const ActionPopupContent = (props) => {
    const {
        onSelect, trigger, initialValue, initialParams, trackOpenMenu,
    } = props;
    const [isOpen, setIsOpen] = useState();
    const [actionName, setActionName] = useState(initialValue || '');
    const [actionParams, setActionParams] = useState(initialParams || []);
    const [listOfActions, setListOfActions] = useState([]);
    const context = useContext(ProjectContext);
    const projectId = context.project._id;
    
    const updateParamName = (index, name) => {
        setActionParams(
            actionParams.map(([pName, pVal], i) => (i === index ? [name, pVal] : [pName, pVal])),
        );
    };

    const updateParamValue = (index, value) => {
        setActionParams(
            actionParams.map(([pName, pVal], i) => (i === index ? [pName, value] : [pName, pVal])),
        );
    };

    const removeParam = (index) => {
        setActionParams(
            actionParams.filter((value, i) => i !== index),
        );
    };

    const addParam = () => {
        setActionParams([...actionParams, ['', '']]);
    };

    const getListOfActions = () => {
        Meteor.call('actionServer.getListOfActions', projectId, (error, result) => {
            if (error) {
                console.error('Error fetching actions:', error);
            } else {
                setListOfActions(result);
            }
        });
    };

    useEffect(() => {
        getListOfActions();
    }, []);

    const actionsList = useMemo(() => listOfActions.map((action, index) => (
        <option key={index} value={action.name}>{action.name}</option>
    )), [listOfActions]);

    const params = actionParams.map(([pName, pVal], index) => (
        <Form.Group key={index}>
            <Form.Input
                placeholder='Name'
                value={pName}
                onChange={e => updateParamName(index, e.target.value.trim())}
                required
            />
            <Form.Input
                placeholder='Value'
                value={pVal}
                onChange={e => updateParamValue(index, e.target.value.trim())}
                required
            />
            <Button
                icon='delete'
                onClick={(e) => {
                    e.preventDefault();
                    removeParam(index);
                }
                }
            />
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
                    // setActionName('');
                    setIsOpen(false);
                    if (!actionName.trim()) return;
                    if (actionParams && actionParams.length) {
                        const sortedParams = [...actionParams].sort((a, b) => ((a[0] < b[0]) ? -1 : 1));
                        onSelect({ name: actionName, params: sortedParams });
                    } else {
                        onSelect(actionName);
                    }
                }}
            >
                <div>
                    <Input
                        value={actionName}
                        onChange={e => setActionName(e.target.value.trim())}
                        list='actions'
                        autoFocus
                    />
                    <datalist id='actions'>
                        {actionsList}
                    </datalist>
                </div>
                <Divider />
                <p className='all-caps-header'>Parameters</p>
                {params.length ? params : <></>}
                <Button icon='add' onClick={addParam} />
                <Form.Button primary type='submit' floated='right'>Save</Form.Button>
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
    initialParams: [],
    trackOpenMenu: () => {},
};

export default ActionPopupContent;
