import PropTypes from 'prop-types';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import Alert from 'react-s-alert';
import {
    Container, Table, Icon, Modal, Button, Input, Segment,
} from 'semantic-ui-react';

import { Models } from '../../../api/model/model.collection';
import PageMenu from '../utils/PageMenu';
import { Loading } from '../utils/Utils';
import Can from '../roles/Can';

function ModelsContainer({ projectId }) {
    const { ready, models } = useTracker(() => {
        const modelsHandler = Meteor.subscribe('models', projectId);
        const projectModels = Models.find({ projectId }, { sort: { createdAt: -1 } }).fetch();
        return {
            ready: modelsHandler.ready(),
            models: projectModels,
        };
    }, [projectId]);

    const { t } = useTranslation('models');

    const [editorOpen, setEditorOpen] = useState(false);
    const [editorModel, setEditorModel] = useState({});
    const [confirmDeployOpen, setConfirmDeployOpen] = useState(false);
    const commentRef = useRef();

    useEffect(() => {
        if (editorModel._id) {
            setEditorModel(models.find(model => editorModel._id === model._id) || {});
        }
    }, [models]);

    const renderModel = model => (
        <Table.Row key={model._id}>
            <Table.Cell textAlign='center'>{
                model.deployed ? <Icon name='star' color='green' /> : <></>}
            </Table.Cell>
            <Table.Cell>{model.name}</Table.Cell>
            <Table.Cell>{model.comment}</Table.Cell>
            <Can I='models:c' projectId={projectId}>
                <Table.Cell textAlign='center'>
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
        const comment = commentRef.current?.inputRef?.current?.value || '';
        Meteor.call('model.updateComment', projectId, editorModel._id, comment, (err) => {
            if (err) {
                Alert.error(`${t('Error updating comment for model')} ${editorModel.name}`);
            }
        });
    };

    const deploy = () => {
        Meteor.call('model.deploy', projectId, editorModel._id, (err, res) => {
            if (err) {
                Alert.error(`${t('Error deploying model')} ${editorModel.name}`);
                return;
            }
            if (res.error) {
                Alert.error(res.error);
                return;
            }
            Alert.success(`${t('Sucessfulyl deployed model')} ${editorModel.name}`);
        });
    };

    return (
        <div data-cy='models-screen'>
            <PageMenu title={t('Models')} icon='list' withTraining />
            <Loading loading={!ready}>
                <Container>
                    <Table striped>
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell />
                                <Table.HeaderCell>{t('Name')}</Table.HeaderCell>
                                <Table.HeaderCell>{t('Comment')}</Table.HeaderCell>
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
                                label={t('Comment')}
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
                                    <Icon name='external' /> {t('Deploy')}
                                </Button>
                            </Can>
                            <Button onClick={updateComment} primary>
                                <Icon name='save' /> {t('Save')}
                            </Button>
                        </Modal.Actions>
                    </Modal>
                    <Can I='models:x' projectId={projectId}>
                        <Modal
                            open={confirmDeployOpen}
                            onClose={() => setConfirmDeployOpen(false)}
                        >
                            <Modal.Header>{t('Deploy model')}</Modal.Header>
                            <Modal.Content>
                                <b>{t('Are your shure you want to deploy model')} {editorModel.name}?</b>
                                {editorModel.comment ? <Segment>{editorModel.comment}</Segment> : <></>}
                            </Modal.Content>
                            <Modal.Actions>
                                <Button
                                    onClick={() => setConfirmDeployOpen(false)}
                                    color='green'
                                >
                                    {t('No')}
                                </Button>
                                <Button
                                    onClick={() => {
                                        deploy();
                                        setConfirmDeployOpen(false);
                                    }}
                                    color='red'
                                >
                                    {t('Yes')}
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
