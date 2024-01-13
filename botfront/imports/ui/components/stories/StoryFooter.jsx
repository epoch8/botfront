import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
    Segment,
    Breadcrumb,
    Icon,
    Menu,
    Dropdown,
    Checkbox,
    Modal,
    ModalHeader,
    ModalContent,
    List,
    ListItem,
    Input,
} from 'semantic-ui-react';
import { connect } from 'react-redux';
import { withTranslation, useTranslation } from 'react-i18next';

import StoryPathPopup from './StoryPathPopup.jsx';
import { ConversationOptionsContext } from './Context';
import { can } from '../../../lib/scopes';


const LinkSelectModal = ({
    open, onClose, linkTargets, currentValue, onSelect,
}) => {
    const { t } = useTranslation('stories');

    const [searchStr, setSearchStr] = useState('');

    const listItems = useMemo(() => {
        const searchStrNormalized = searchStr.trim().toLowerCase();
        const filterdTargets = searchStrNormalized
            ? linkTargets.filter(({ text }) => text.toLowerCase().includes(searchStrNormalized))
            : linkTargets;
        return filterdTargets.map(({ value, text }) => (
            <ListItem
                key={value}
                className={value === currentValue ? 'current-link-target' : null}
                onClick={e => onSelect(e, { value, text })}
            >
                <h3>{text}</h3>
            </ListItem>
        ));
    }, [linkTargets, searchStr]);

    return (
        <Modal open={open} onClose={onClose}>
            <ModalHeader>{t('Link to')}</ModalHeader>
            <ModalContent>
                <Input
                    placeholder={t('Search...')}
                    icon='search'
                    fluid
                    value={searchStr}
                    onChange={(e, { value }) => setSearchStr(value)}
                />
                <List divided selection relaxed='very'>
                    {listItems}
                </List>
            </ModalContent>
        </Modal>
    );
};

LinkSelectModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    linkTargets: PropTypes.array,
};

LinkSelectModal.defaultProps = {
    open: false,
    onClose: () => {},
    linkTargets: [],
};


class StoryFooter extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            linkSelectOpen: false,
        };
    }

    renderPath = () => {
        const { storyPath } = this.props;
        let pathBreadcrumbs = [];
        // we create that shallow copy, because we may need to modify it if it is too long
        let computedStoryPath = [...storyPath];
        const maxLength = 5;

        if (storyPath.length > maxLength) {
            computedStoryPath = storyPath.slice(storyPath.length - maxLength, storyPath.length);
            pathBreadcrumbs = [
                ...pathBreadcrumbs,
                <StoryPathPopup
                    key='ellipsis'
                    storyPath={storyPath.join('>')}
                    trigger={(
                        <Breadcrumb.Section className='collapsed-path'>
                            <Icon disabled color='grey' name='ellipsis horizontal' size='small' />
                        </Breadcrumb.Section>
                    )}
                />,
                <Breadcrumb.Divider key='ellipsis-divider'>{' > '}</Breadcrumb.Divider>,
            ];
        }
        computedStoryPath.forEach((location, index) => {
            pathBreadcrumbs = [
                ...pathBreadcrumbs,
                <Breadcrumb.Section key={`popup-location-${index}`}>{location}</Breadcrumb.Section>,
                <Breadcrumb.Divider key={`popup-divider-${index}`}>{'>'}</Breadcrumb.Divider>,
            ];
        });
        // remove the latest divider, as we don't want to display it
        pathBreadcrumbs.pop();
        return pathBreadcrumbs;
    };

    handleBranchClick = () => {
        const { onBranch, canBranch } = this.props;
        if (canBranch) {
            onBranch();
        }
    };

    handlerContinueClick = () => {
        const { onContinue } = this.props;
        onContinue();
    };

    selectIconColor = (active) => {
        if (active) {
            return 'blue';
        }
        return 'grey';
    }

    selectMenuClass = () => {
        const { canContinue } = this.props;
        if (canContinue) {
            return '';
        }
        return ' linked';
    }

    filterDestinations = (data, _id) => data.filter((story) => {
        if (story._id === _id) {
            if (story.branches && story.branches.length > 0 && !(story.rules && story.rules.length > 0)) return true;
            return false;
        }
        if (story.smart) return false;
        if (story.rules && story.rules.length > 0) return false;
        return true;
    }).map(({ value, text }) => ({ value, text }));

    getTargetsFromBranches = (parentPath, parentName, branches) => {
        if (!branches) return [];
        return branches.map(({ _id, title, branches: subBranches }) => {
            const value = `${parentPath}.${_id}`;
            const text = `${parentName}.${title}`;
            return [
                { value, text },
                this.getTargetsFromBranches(value, text, subBranches),
            ];
        });
    };

    getLinkTargets = (stories) => {
        // console.log(stories);
        const filteredStories = stories.filter(story => !(story.rules && story.rules.length > 0));
        const linkTargets = filteredStories.map(({ value, text, branches }) => [
            { value, text }, this.getTargetsFromBranches(value, text, branches),
        ]).flat(Infinity);
        // console.log(linkTargets);
        return linkTargets;
    };


    renderContinue = () => {
        const { canContinue, disableContinue, t } = this.props;
        if (disableContinue) {
            return <></>;
        }
        if (canContinue) {
            return (
                <Menu.Item className='footer-option-button' onClick={this.handlerContinueClick}>
                    <Icon name='arrow alternate circle right outline' color='blue' />
                    {t('Connect')}
                </Menu.Item>
            );
        }
        return (
            <Menu.Item className='footer-option-button' onClick={this.handlerContinueClick}>
                <Icon className='long' name='arrow alternate circle right outline' color='blue' />
                {t('Continue To Linked Story')}
            </Menu.Item>
        );
    }

    renderBranchMenu = () => {
        const {
            canBranch,
            fragment,
            destinationStory,
            t,
        } = this.props;
        if (destinationStory || fragment.type === 'rule') return null;
        return (
            <Menu.Item
                onClick={this.handleBranchClick}
                className={`footer-option-button color-${this.selectIconColor(
                    canBranch,
                )}`}
                data-cy='create-branch'
            >
                <Icon
                    disabled={!canBranch}
                    name='code branch'
                    color={this.selectIconColor(canBranch)}
                />
                {t('Branch Story')}
            </Menu.Item>
        );
    }

    renderWaitForUserInputToggle = () => {
        const { fragment, projectId } = this.props;
        const { updateStory } = this.context;
        const { _id, type, wait_for_user_input: waitInput = true } = fragment;
        if (type !== 'rule') return null;
        return (
            <Menu.Item position='right'>
                <Checkbox
                    disabled={!can('stories:w', projectId)}
                    toggle
                    label='wait for user input'
                    className='story-box-toggle'
                    checked={waitInput}
                    onChange={() => updateStory({ _id, wait_for_user_input: !waitInput })}
                />
            </Menu.Item>
        );
    }

    renderLinkMenu = () => {
        const {
            canBranch,
            fragment,
            destinationStory,
            onDestinationStorySelection,
            t,
        } = this.props;
        const { stories } = this.context;
        if (!canBranch || fragment.type === 'rule') return null;
        const { linkSelectOpen } = this.state;
        const linkTargets = this.getLinkTargets(stories);
        const currentLinkValue = destinationStory ? destinationStory.path : '';
        return (
            <Menu.Item
                className={`footer-option-button remove-padding color-${this.selectIconColor(
                    canBranch,
                )}`}
                data-cy='link-to'
                position={this.positionStoryLinker(destinationStory)}
            >
                <Icon
                    disabled={!canBranch}
                    name='arrow right'
                    color='green'
                />
                    Link&nbsp;to:
                <Dropdown
                    placeholder={t('Select story')}
                    value={currentLinkValue}
                    fluid
                    search
                    selection
                    clearable
                    selectOnBlur={false}
                    className='stories-linker'
                    options={linkTargets}
                    data-cy='stories-linker'
                    disabled={!canBranch}
                    onChange={onDestinationStorySelection}
                    onClick={() => this.setState({ linkSelectOpen: true })}
                />
                <LinkSelectModal
                    open={linkSelectOpen}
                    onClose={() => this.setState({ linkSelectOpen: false })}
                    linkTargets={linkTargets}
                    currentValue={currentLinkValue}
                    onSelect={onDestinationStorySelection}
                />
            </Menu.Item>
        );
    };

    positionStoryLinker = destinationStory => (destinationStory === null ? 'right' : 'left');

    static contextType = ConversationOptionsContext;

    render() {
        const { destinationStory, fragment: { type } = {}, projectId } = this.props;
        return (
            <Segment data-cy='story-footer' className={`footer-segment ${destinationStory === null ? '' : 'linked'}`} size='mini' attached='bottom'>
                <div className='breadcrumb-container'>{this.renderPath()}</div>

                <Menu fluid size='mini' borderless>
                    {type !== 'test_case' && (
                        <>
                            {can('stories:w', projectId) && this.renderBranchMenu()}
                            {can('stories:w', projectId) && this.renderLinkMenu()}
                            {this.renderContinue()}
                            {this.renderWaitForUserInputToggle()}
                        </>
                    )}
                </Menu>

            </Segment>
        );
    }
}

StoryFooter.propTypes = {
    storyPath: PropTypes.array,
    canBranch: PropTypes.bool,
    fragment: PropTypes.object.isRequired,
    canContinue: PropTypes.bool,
    onBranch: PropTypes.func.isRequired,
    onContinue: PropTypes.func.isRequired,
    onDestinationStorySelection: PropTypes.func.isRequired,
    disableContinue: PropTypes.bool,
    destinationStory: PropTypes.object,
    projectId: PropTypes.string.isRequired,
};

StoryFooter.defaultProps = {
    storyPath: [],
    canBranch: true,
    canContinue: true,
    disableContinue: true,
    destinationStory: null,
};

const mapStateToProps = state => ({
    projectId: state.settings.get('projectId'),
});

export default connect(mapStateToProps)(withTranslation('stories')(StoryFooter));
