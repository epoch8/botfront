import PropTypes from 'prop-types';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useRef, useState } from 'react';
import { connect } from 'react-redux';
import {
    Container, Table, Icon, Modal, Button, Input,
} from 'semantic-ui-react';

import { Models } from '../../../api/model/model.collection';
import { Loading } from '../utils/Utils';
import Can from '../roles/Can';
import { can } from '../../../lib/scopes';

function ModelsContainer({ projectId }) {
    const { ready, models } = useTracker(() => {
        const modelsHandler = Meteor.subscribe('models', projectId);
        const projectModels = Models.find({ projectId }).fetch();
        return {
            ready: modelsHandler.ready(),
            models: projectModels,
        };
    }, [projectId]);

    const [editorOpen, setEditorOpen] = useState(false);
    const [editorModel, setEditorModel] = useState({});
    const [confirmDeployOpen, setConfirmDeployOpen] = useState(false);
    const commentRef = useRef();

    const renderModel = model => (
        <Table.Row key={model._id}>
            <Table.Cell>{model.deployed}</Table.Cell>
            <Table.Cell>{model.name}</Table.Cell>
            <Table.Cell>{model.comment}</Table.Cell>
            <Can I='models:c' projectId={projectId}>
                <Table.Cell>
                    <Icon
                        link
                        data-cy={`edit-model-${model._id}`}
                        name='edit'
                        color='grey'
                        // size='small'
                        onClick={() => {
                            setEditorModel(model);
                            setEditorOpen(true);
                        }}
                    />
                </Table.Cell>
            </Can>
        </Table.Row>
    );

    const updateComment = () => {
        console.log(commentRef.current.inputRef.current.value);
    };

    const deploy = () => {};

    return (
        <div data-cy='models-screen'>
            <Loading loading={!ready}>
                <Container>
                    <Table striped>
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell />
                                <Table.HeaderCell>Name</Table.HeaderCell>
                                <Table.HeaderCell>Comment</Table.HeaderCell>
                                <Can I='models:c' projectId={projectId}>
                                    <Table.HeaderCell />
                                </Can>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {models.map(renderModel)}
                        </Table.Body>
                    </Table>
                    <Modal
                        open={editorOpen}
                        onClose={() => setEditorOpen(false)}
                    >
                        <Modal.Header>{editorModel.name}</Modal.Header>
                        <Modal.Content>
                            <Input
                                label='Comment'
                                ref={commentRef}
                                defaultValue={editorModel.comment}
                                fluid
                            />
                        </Modal.Content>
                        <Modal.Actions>
                            <Can I='models:x' projectId={projectId}>
                                <Button
                                    onClick={() => setConfirmDeployOpen(true)}
                                    color='red'
                                    disabled={editorModel.deployed}
                                >
                                    <Icon name='external' /> Deploy
                                </Button>
                            </Can>
                            <Button onClick={updateComment} primary>
                                <Icon name='save' /> Save
                            </Button>
                        </Modal.Actions>
                    </Modal>
                    <Can I='models:x' projectId={projectId}>
                        <Modal
                            open={confirmDeployOpen}
                            onClose={() => setConfirmDeployOpen(false)}
                        >
                            <Modal.Header>{editorModel.name}</Modal.Header>
                            <Modal.Actions>
                                <Button
                                    onClick={() => setConfirmDeployOpen(false)}
                                    color='green'
                                >
                                    No
                                </Button>
                                <Button
                                    onClick={() => {
                                        deploy();
                                        setConfirmDeployOpen(false);
                                    }}
                                    color='red'
                                >
                                    Yes
                                </Button>
                            </Modal.Actions>
                        </Modal>
                    </Can>
                </Container>
            </Loading>
        </div>
    );
}

ModelsContainer.propTypes = {
    projectId: PropTypes.string.isRequired,
};

function mapStateToProps(state) {
    return {
        projectId: state.settings.get('projectId'),
    };
}

export default connect(mapStateToProps)(ModelsContainer);
