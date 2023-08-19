import PropTypes from 'prop-types';
import { useTracker } from 'meteor/react-meteor-data';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import Alert from 'react-s-alert';
import {
    Container,
    Table,
    Icon,
    Modal,
    Button,
    Input,
    Segment,
    TextArea,
} from 'semantic-ui-react';

import TextareaAutosize from 'react-autosize-textarea';
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
                    openDetails(training._id);
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

const TrainingDetails = ({
    projectId, trainingId, open, setOpen, cancelTraining, checkoutProject,
}) => {
    const { t } = useTranslation('externalTraining');
    const { ready, training } = useTracker(() => {
        const trainingsHandler = Meteor.subscribe(
            'externalTrainingById',
            projectId,
            trainingId,
        );
        const externalTraining = ExternalTrainings.findOne({ _id: trainingId });
        return {
            ready: trainingsHandler.ready(),
            training: externalTraining,
        };
    }, [trainingId]);
    if (!ready) {
        return <></>;
    }
    const renderCancelButton = () => {
        if (training.status !== 'training') {
            return <></>;
        }
        return (
            <Can I='nlu-data:x' projectId={projectId}>
                <Button
                    onClick={() => {
                        cancelTraining(trainingId);
                    }}
                    color='yellow'
                >
                    <Icon name='stop' /> {t('Cancel')}
                </Button>
            </Can>
        );
    };
    const renderRollbackButton = () => (
        <Can I='import:x' projectId={projectId}>
            <Button
                onClick={() => {
                    checkoutProject(training.backupId);
                }}
                color='red'
            >
                <Icon name='code branch' /> {t('Checkout')}
            </Button>
        </Can>
    );

    return (
        <Modal size='large' open={open} onClose={() => setOpen(false)}>
            <Modal.Header className={`training-header-${training.status}`}>
                <div className='flex-row-container'>
                    <div className='flex-auto-item'>{training.name}</div>
                    <div className='flex-auto-item'>
                        {training.createdAt.toDateString()}
                    </div>
                    <div className='flex-auto-item'>{training.status}</div>
                </div>
            </Modal.Header>
            <Modal.Actions>
                {renderCancelButton()}
                {renderRollbackButton()}
            </Modal.Actions>
            <Modal.Content>
                <TextareaAutosize
                    style={{ width: '100%' }}
                    contentEditable={false}
                    value={training.logs}
                />
            </Modal.Content>
        </Modal>
    );
};

TrainingDetails.propTypes = {
    projectId: PropTypes.string.isRequired,
    trainingId: PropTypes.string.isRequired,
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    cancelTraining: PropTypes.func.isRequired,
    checkoutProject: PropTypes.func.isRequired,
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
    const [detailsTraining, setDetailsTraining] = useState(null);

    // const deploy = () => {
    //     Meteor.call('model.deploy', projectId, detailsTraining._id, (err, res) => {
    //         if (err) {
    //             Alert.error(`${t('Error deploying model')} ${detailsTraining.name}`);
    //             return;
    //         }
    //         if (res.errorMsg) {
    //             Alert.error(res.errorMsg);
    //             return;
    //         }
    //         Alert.success(`${t('Sucessfulyl deployed model')} ${detailsTraining.name}`);
    //     });
    // };

    const openDetails = (training) => {
        setDetailsTraining(training);
        setDetailsOpen(true);
    };
    const cancelTraining = () => {};
    const checkoutProject = () => {};

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
                        />
                    </Table>
                </Container>
                {detailsTraining && (
                    <TrainingDetails
                        projectId={projectId}
                        trainingId={detailsTraining}
                        open={detailsOpen}
                        setOpen={setDetailsOpen}
                        cancelTraining={cancelTraining}
                        checkoutProject={checkoutProject}
                    />
                )}
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
