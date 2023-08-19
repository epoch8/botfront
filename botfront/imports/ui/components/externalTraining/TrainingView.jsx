import PropTypes from 'prop-types';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import Alert from 'react-s-alert';
import {
    Container, Table, Icon, Modal, Button, Input, Segment,
} from 'semantic-ui-react';

import { ExternalTrainings } from '../../../api/externalTrainings/collection';
import PageMenu from '../utils/PageMenu';
import { Loading } from '../utils/Utils';
import Can from '../roles/Can';

const Trainings = ({ trainings, openDetails }) => (
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
                <Table.Cell>{training.betUrl}</Table.Cell>
                <Table.Cell>{training.createdAt.toDateString()}</Table.Cell>
                <Table.Cell>{training.status}</Table.Cell>
            </Table.Row>
        ))}
    </Table.Body>
);

Trainings.propTypes = {
    trainings: PropTypes.arrayOf(
        PropTypes.shape({
            name: PropTypes.string.isRequired,
            betUrl: PropTypes.string.isRequired,
            createdAt: PropTypes.instanceOf(Date).isRequired,
            status: PropTypes.string.isRequired,
        }),
    ).isRequired,
    openDetails: PropTypes.func.isRequired,
};

const TrainingDetails = ({ training, open, setOpen }) => {
    const { t } = useTranslation('externalTraining');
    return (
        <Modal open={open} onClose={() => setOpen(false)}>
            <Modal.Header className={`training-header-${training.status}`}>
                <div className='flex-row-container'>
                    <div className='flex-auto-item'>
                        {training.name}
                    </div>
                    <div className='flex-auto-item'>
                        {training.createdAt.toDateString()}
                    </div>
                    <div className='flex-auto-item'>
                        {training.status}
                    </div>
                </div>
            </Modal.Header>
            <Modal.Content>
                {/* <Input
                    label={t('Comment')}
                    ref={commentRef}
                    defaultValue={detailsTraining.comment}
                    fluid
                /> */}
            </Modal.Content>
            {/* <Modal.Actions>
                <Can I='models:x' projectId={projectId}>
                    <Button
                        onClick={() => setConfirmDeployOpen(true)}
                        color='red'
                        disabled={detailsTraining.deployed}
                    >
                        <Icon name='external' /> {t('Deploy')}
                    </Button>
                </Can>
                <Button onClick={updateComment} primary>
                    <Icon name='save' /> {t('Save')}
                </Button>
            </Modal.Actions> */}
        </Modal>
    );
};

TrainingDetails.propTypes = {
    training: PropTypes.shape({
        name: PropTypes.string.isRequired,
        betUrl: PropTypes.string.isRequired,
        createdAt: PropTypes.instanceOf(Date).isRequired,
        status: PropTypes.string.isRequired,
        logs: PropTypes.string,
    }).isRequired,
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
};

function TrainingView({ projectId }) {
    const { ready, trainings } = useTracker(() => {
        const trainingsHandler = Meteor.subscribe('externalTrainings', projectId);
        const externalTrainings = ExternalTrainings.find(
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
    const [detailsTraining, setDetailsTraining] = useState({});
    const [confirmDeployOpen, setConfirmDeployOpen] = useState(false);
    const commentRef = useRef();

    useEffect(() => {
        if (detailsTraining._id) {
            setDetailsTraining(
                trainings.find(training => detailsTraining._id === training._id) || {},
            );
        }
    }, [trainings]);

    const updateComment = () => {
        const comment = commentRef.current?.inputRef?.current?.value || '';
        Meteor.call(
            'model.updateComment',
            projectId,
            detailsTraining._id,
            comment,
            (err) => {
                if (err) {
                    Alert.error(
                        `${t('Error updating comment for model')} ${
                            detailsTraining.name
                        }`,
                    );
                }
            },
        );
    };

    const deploy = () => {
        Meteor.call('model.deploy', projectId, detailsTraining._id, (err, res) => {
            if (err) {
                Alert.error(`${t('Error deploying model')} ${detailsTraining.name}`);
                return;
            }
            if (res.errorMsg) {
                Alert.error(res.errorMsg);
                return;
            }
            Alert.success(`${t('Sucessfulyl deployed model')} ${detailsTraining.name}`);
        });
    };

    const openDetails = (training) => {
        setDetailsTraining(training);
        setDetailsOpen(true);
    };
    const onCancel = () => {};

    return (
        <div data-cy='trainings-screen'>
            <PageMenu title={t('Trainings')} icon='list' withTraining />
            <Loading loading={!ready}>
                <Container>
                    <Table>
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
                    {detailsTraining._id && (
                        <TrainingDetails
                            training={detailsTraining}
                            open={detailsOpen}
                            setOpen={setDetailsOpen}
                        />
                    )}
                    <Can I='models:x' projectId={projectId}>
                        <Modal
                            open={confirmDeployOpen}
                            onClose={() => setConfirmDeployOpen(false)}
                        >
                            <Modal.Header>{t('Deploy model')}</Modal.Header>
                            <Modal.Content>
                                <b>
                                    {t('Are your shure you want to deploy model')}{' '}
                                    {detailsTraining.name}?
                                </b>
                                {detailsTraining.comment ? (
                                    <Segment>{detailsTraining.comment}</Segment>
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
