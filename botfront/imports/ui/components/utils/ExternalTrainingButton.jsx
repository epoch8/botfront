/* eslint-disable no-console */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'semantic-ui-react';
import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { useTranslation } from 'react-i18next';

import { Projects } from '../../../api/project/project.collection';
import { Can } from '../../../lib/scopes';

const ExternalTrainingButton = ({ projectId, trainingConfig }) => {
    const { status, jobId } = useTracker(() => {
        const trainingStatusHandler = Meteor.subscribe(
            'project.externalTraining',
            projectId,
        );
        if (trainingStatusHandler.ready()) {
            const { externalTraining } = Projects.findOne(
                { _id: projectId },
                { fields: { externalTraining: 1 } },
            );
            if (externalTraining) {
                const trainingInfo = externalTraining.find(
                    ({ host }) => host === trainingConfig.host,
                );
                if (trainingInfo) {
                    return trainingInfo;
                }
            }
        }
        return { status: 'notReachable', jobId: null };
    });

    const { t } = useTranslation('utils');

    const training = status === 'training';
    const [clicked, setClicked] = useState(false);
    const [timeout, setTimeout] = useState(null);

    useEffect(() => {
        setClicked(false);
        if (timeout !== null) Meteor.clearTimeout(timeout);
        setTimeout(null);
    }, [status, projectId]);

    const onTrainClick = async () => {
        if (clicked || status === 'notReachable') {
            return;
        }
        setClicked(true);
        const { type: trainType } = trainingConfig;
        console.log({ trainingConfig }); // Получаем trainType из конфигурации
        try {
            if (training) {
                const { host } = trainingConfig;
                await Meteor.callWithPromise(
                    trainType === 'rasa' ? 'externalTraining.cancel' : 'hierTraining.cancel',
                    jobId,
                    host,
                );
            } else {
                const { host, name } = trainingConfig;
                await Meteor.callWithPromise(
                    trainType === 'rasa' ? 'externalTraining.train' : 'hierTraining.train',
                    projectId,
                    host,
                    name,
                    trainType,
                );
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
            <div className='side-by-side middle narrow external-training-btn'>
                <Button.Group color={training ? 'yellow' : 'blue'}>
                    {training ? <Button primary loading /> : <></>}
                    <Button
                        content={
                            training
                                ? t('Cancel {name} training').replace(
                                    '{name}',
                                    trainingConfig.name,
                                )
                                : `${t('Train')} ${trainingConfig.name}`
                        }
                        primary
                        disabled={status === 'notReachable'}
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
        image: PropTypes.string,
        rasaExtraArgs: PropTypes.string,
        node: PropTypes.string,
        type: PropTypes.string,
    }).isRequired,
};

export default ExternalTrainingButton;
