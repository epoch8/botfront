import PropTypes from 'prop-types';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import Alert from 'react-s-alert';
import {
    Container, Table, Icon, Modal, Button, Input, Segment,
} from 'semantic-ui-react';

import { ExternalTraining } from '../../../api/externalTraining/collection';
import PageMenu from '../utils/PageMenu';
import { Loading } from '../utils/Utils';
import Can from '../roles/Can';

const Trainings = ({ trainings, openDetails, onCancel }) => (
    <Table.Body>
        {trainings.map(training => (
            <Table.Row
                key={training._id}
                className={`training-row-${training.status}`}
                onClick={() => {
                    openDetails(training);
                }}
            >
                <Table.Cell>{training.name}</Table.Cell>
                <Table.Cell>{training.host}</Table.Cell>
                <Table.Cell>{training.createdAt}</Table.Cell>
                <Table.Cell>{training.status}</Table.Cell>
                <Can I='nlu-data:x' projectId={training.projectId}>
                    <Table.Cell textAlign='center'>
                        <Icon
                            link
                            data-cy={`cancel-training-${training._id}`}
                            name='cancel'
                            // color='grey'
                            // size='small'
                            onClick={() => {
                                onCancel(training);
                            }}
                        />
                    </Table.Cell>
                </Can>
            </Table.Row>
        ))}
    </Table.Body>
);

Trainings.propTypes = {
    trainings: PropTypes.arrayOf(PropTypes.object).isRequired,
    openDetails: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};

function TrainingView({ projectId }) {
    const { ready, trainings } = useTracker(() => {
        const trainingsHandler = Meteor.subscribe('externalTraining', projectId);
        const externalTrainings = ExternalTraining.find(
            { projectId },
            { sort: { createdAt: -1 } },
        ).fetch();
        return {
            ready: trainingsHandler.ready(),
            trainings: externalTrainings,
        };
    }, [projectId]);

    const { t } = useTranslation('externalTraining');

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsModel, setDetailsModel] = useState({});
    const [confirmDeployOpen, setConfirmDeployOpen] = useState(false);
    const commentRef = useRef();

    useEffect(() => {
        if (detailsModel._id) {
            setDetailsModel(
                trainings.find(training => detailsModel._id === training._id) || {},
            );
        }
    }, [trainings]);

    const updateComment = () => {
        const comment = commentRef.current?.inputRef?.current?.value || '';
        Meteor.call(
            'model.updateComment',
            projectId,
            detailsModel._id,
            comment,
            (err) => {
                if (err) {
                    Alert.error(
                        `${t('Error updating comment for model')} ${detailsModel.name}`,
                    );
                }
            },
        );
    };

    const deploy = () => {
        Meteor.call('model.deploy', projectId, detailsModel._id, (err, res) => {
            if (err) {
                Alert.error(`${t('Error deploying model')} ${detailsModel.name}`);
                return;
            }
            if (res.errorMsg) {
                Alert.error(res.errorMsg);
                return;
            }
            Alert.success(`${t('Sucessfulyl deployed model')} ${detailsModel.name}`);
        });
    };

    const openDetails = () => {};
    const onCancel = () => {};

    return (
        <div data-cy='trainings-screen'>
            <PageMenu title={t('Trainings')} icon='list' withTraining />
            <Loading loading={!ready}>
                <Container>
                    <Table striped>
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell>{t('Name')}</Table.HeaderCell>
                                <Table.HeaderCell>{t('Host')}</Table.HeaderCell>
                                <Table.HeaderCell>{t('Star time')}</Table.HeaderCell>
                                <Table.HeaderCell>{t('Status')}</Table.HeaderCell>
                                <Can I='nlu-data:x' projectId={projectId}>
                                    <Table.HeaderCell />
                                </Can>
                            </Table.Row>
                        </Table.Header>
                        <Trainings
                            trainings={trainings}
                            openDetails={openDetails}
                            onCancel={onCancel}
                        />
                    </Table>
                    <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)}>
                        <Modal.Header>{detailsModel.name}</Modal.Header>
                        <Modal.Content>
                            <Input
                                label={t('Comment')}
                                ref={commentRef}
                                defaultValue={detailsModel.comment}
                                fluid
                            />
                        </Modal.Content>
                        <Modal.Actions>
                            <Can I='models:x' projectId={projectId}>
                                <Button
                                    onClick={() => setConfirmDeployOpen(true)}
                                    color='red'
                                    disabled={detailsModel.deployed}
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
                                <b>
                                    {t('Are your shure you want to deploy model')}{' '}
                                    {detailsModel.name}?
                                </b>
                                {detailsModel.comment ? (
                                    <Segment>{detailsModel.comment}</Segment>
                                ) : (
                                    <></>
                                )}
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

TrainingView.propTypes = {
    projectId: PropTypes.string.isRequired,
};

function mapStateToProps(state) {
    return {
        projectId: state.settings.get('projectId'),
    };
}

export default connect(mapStateToProps)(TrainingView);
