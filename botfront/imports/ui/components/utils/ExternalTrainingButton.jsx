import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'semantic-ui-react';
import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { useTranslation } from 'react-i18next';

import { Projects } from '../../../api/project/project.collection';
import { Can } from '../../../lib/scopes';

const ExternalTrainingButton = ({ projectId, trainingConfig }) => {
    const { trainingStatus } = useTracker(() => {
        const trainingStatusHandler = Meteor.subscribe(
            'externalTraining.instanceStatuses',
            projectId,
        );
        let { status } = 'notReachable';
        if (trainingStatusHandler.ready()) {
            const instance = Projects.findOne(
                { _id: projectId },
                { fields: { 'externalTraining.instanceStatuses': 1 } },
            );
            const { externalTraining: { instanceStatuses } } = instance;
            if (instanceStatuses) {
                const statusIdx = instanceStatuses.findIndex(({ host }) => host === trainingConfig.host);
                if (statusIdx !== -1) {
                    ({ status } = instanceStatuses[statusIdx]);
                }
            }
        }
        return {
            trainingStatus: status,
        };
    });

    const { t } = useTranslation('utils');

    const training = trainingStatus === 'training';
    const [clicked, setClicked] = useState(false);
    const [timeout, setTimeout] = useState(null);

    useEffect(() => {
        setClicked(false);
        if (timeout !== null) Meteor.clearTimeout(timeout);
        setTimeout(null);
    }, [trainingStatus, projectId]);

    const onTrainClick = async () => {
        if (clicked || trainingStatus === 'notReachable') {
            return;
        }
        setClicked(true);
        try {
            if (training) {
                await Meteor.callWithPromise('externalTraining.cancel', projectId, trainingConfig.host);
            } else {
                await Meteor.callWithPromise('externalTraining.train', projectId, trainingConfig.host);
            }
        } catch (error) {
            console.error(error);
            setClicked(false);
            return;
        }
        setTimeout(
            Meteor.setTimeout(() => {
                setClicked(false);
            }, 10000),
        );
    };

    return (
        <Can I='nlu-data:x'>
            <div className='side-by-side middle narrow train-hier-btn'>
                <Button.Group color={training ? 'yellow' : 'blue'}>
                    {training ? <Button primary loading /> : <></>}
                    <Button
                        content={training ? t('Cancel {name} training').replace('{name}', trainingConfig.name)
                            : `${t('Train')} ${trainingConfig.name}`}
                        primary
                        disabled={trainingStatus === 'notReachable'}
                        loading={clicked}
                        onClick={onTrainClick}
                    />
                </Button.Group>
            </div>
        </Can>
    );
};

ExternalTrainingButton.propTypes = {
    projectId: PropTypes.string.isRequired,
    trainingConfig: PropTypes.shape({
        name: PropTypes.string.isRequired,
        host: PropTypes.string.isRequired,
    }).isRequired,
};

export default ExternalTrainingButton;
