/* eslint-disable jsx-a11y/click-events-have-key-events */
import { Menu, Icon, Popup } from 'semantic-ui-react';
import PropTypes from 'prop-types';
import React from 'react';
import { withTranslation } from 'react-i18next';

import { can } from '../../../lib/scopes';
import ConfirmPopup from '../common/ConfirmPopup';
import ToolTipPopup from '../common/ToolTipPopup';
import { ProjectContext } from '../../layouts/context';

class BranchTabLabel extends React.Component {
    constructor(props) {
        super(props);
        const { value } = this.props;
        this.state = {
            newTitle: value,
            deletePopupOpened: false,
        };
    }

    onTextInput = (event) => {
        this.setState({ newTitle: event.target.value.replace('_', '') });
    };

    submitNewTitle = () => {
        const { newTitle } = this.state;
        const {
            onChangeName, active, onSelect, siblings, value,
        } = this.props;
        if (value === newTitle) return;
        if (
            !newTitle.replace(/\s/g, '').length
            || siblings.map(s => s.title).includes(newTitle)
        ) {
            this.setState({ newTitle: value });
            return;
        }
        if (active) {
            onSelect(newTitle);
        }
        onChangeName(newTitle);
    };

    handleKeyDown = (event) => {
        const { value } = this.props;
        if (event.key === 'Enter') {
            event.stopPropagation();
            event.preventDefault();
            this.submitNewTitle();
            return;
        }
        if (event.key === 'Escape') {
            event.stopPropagation();
            event.preventDefault();
            this.setState({
                newTitle: value,
            });
        }
    };

    renderAlertIcons = () => {
        const { errors, warnings } = this.props;
        const alertList = [];
        if (warnings) {
            alertList.push(
                <Icon
                    key='warning-icon'
                    name='exclamation circle'
                    color='yellow'
                    data-cy='branch-tab-warning-alert'
                />,
            );
        }
        if (errors) {
            alertList.push(
                <Icon
                    key='error-icon'
                    name='times circle'
                    color='red'
                    data-cy='branch-tab-error-alert'
                />,
            );
        }
        return <>{alertList}</>;
    };

    renderDeleteButton = () => {
        const {
            isLinked, siblings, isParentLinked, hasLinksTo,
        } = this.props;
        const { project: { _id: projectId } } = this.context;
        if (can('stories:w', projectId)) {
            return (
                // <Icon name='trash' disabled={isLinked || (siblings.length < 3 && isParentLinked === true)} size='small' data-cy='delete-branch' />
                <Icon name='trash' disabled={isLinked || hasLinksTo} size='small' data-cy='delete-branch' />
            );
        }
        return (<></>);
    };

    handleOnClick = () => {
        const { onSelect, active, value } = this.props;
        if (!active) onSelect(value);
    };

    renderDeletePopup = () => {
        const { deletePopupOpened } = this.state;
        const {
            onDelete, siblings, isLinked, isParentLinked, hasLinksTo, value, t,
        } = this.props;
        const confirmMessage = {};
        if (siblings.length < 3) {
            const strandedBranchName = siblings.filter(s => s.title !== value)[0]?.title;
            confirmMessage.content = (
                <>
                    {t('Add content of')} <strong>{strandedBranchName}</strong> {
                        t('to the previous story or leave single branch?')}
                </>
            );
        }
        if (isLinked) {
            return (
                <ToolTipPopup
                    header={t('This story cannot be deleted')}
                    toolTipText={[
                        t('A story that is linked to another story cannot be deleted'),
                    ]}
                    trigger={this.renderDeleteButton()}
                />
            );
        }
        if (hasLinksTo) {
            return (
                <ToolTipPopup
                    header={t('This branch cannot be deleted')}
                    toolTipText={[
                        t('There are one or more branches linked to this branch'),
                    ]}
                    trigger={this.renderDeleteButton()}
                />
            );
        }
        // if (siblings.length < 3 && isParentLinked) {
        //     return (
        //         <ToolTipPopup
        //             header={t('This story cannot be deleted')}
        //             toolTipText={[
        //                 t('A story that has a only one sibling branch which is linked cannot be deleted'),
        //             ]}
        //             trigger={this.renderDeleteButton()}
        //         />
        //     );
        // }
        return (
            <Popup
                trigger={this.renderDeleteButton()}
                content={(
                    <ConfirmPopup
                        title={t('Delete branch?')}
                        {...confirmMessage}
                        onYes={() => {
                            this.setState({ deletePopupOpened: false });
                            onDelete(false);
                        }}
                        onNo={() => this.setState({ deletePopupOpened: false })}
                        confirmText={t('Add')}
                        onExtra={() => {
                            this.setState({ deletePopupOpened: false });
                            onDelete(true);
                        }}
                        extraBtnText={t('Leave')}
                    />
                )}
                on='click'
                open={deletePopupOpened}
                onOpen={() => this.setState({ deletePopupOpened: true })}
                onClose={() => this.setState({ deletePopupOpened: false })}
            />
        );
    };

    renderTitle = () => {
        const { newTitle } = this.state;
        const { project: { _id: projectId } } = this.context;
        return (
            <>
                <input
                    data-cy='branch-title-input'
                    value={newTitle}
                    disabled={!can('stories:w', projectId)}
                    onChange={this.onTextInput}
                    onBlur={this.submitNewTitle}
                    onKeyDown={this.handleKeyDown}
                    style={{ width: `${Math.max(3, newTitle.length + 1)}ch` }}
                />
                {this.renderDeletePopup()}
            </>
        );
    };

    static contextType = ProjectContext;

    render() {
        const { active, hasLinksTo } = this.props;
        return (
            <Menu.Item
                active={active}
                onClick={this.handleOnClick}
                content={(
                    <>
                        {this.renderAlertIcons()}
                        {this.renderTitle()}
                    </>
                )}
                role='textbox'
                data-cy='branch-label'
                className={hasLinksTo ? 'target-branch' : null}
            />
        );
    }
}

BranchTabLabel.propTypes = {
    value: PropTypes.string,
    onChangeName: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    warnings: PropTypes.number,
    errors: PropTypes.number,
    active: PropTypes.bool,
    onSelect: PropTypes.func.isRequired,
    siblings: PropTypes.array.isRequired,
    isLinked: PropTypes.bool,
    isParentLinked: PropTypes.bool.isRequired,
    hasLinksTo: PropTypes.bool,
};

BranchTabLabel.defaultProps = {
    value: '',
    active: false,
    warnings: 0,
    errors: 0,
    isLinked: true,
    hasLinksTo: false,
};

export default withTranslation('stories')(BranchTabLabel);
