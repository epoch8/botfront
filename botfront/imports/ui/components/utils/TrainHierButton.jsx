import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'semantic-ui-react';
import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { useTranslation } from 'react-i18next';

import { Projects } from '../../../api/project/project.collection';
import { Can } from '../../../lib/scopes';

const TrainHierButton = ({ projectId }) => {
    const { trainingStatus } = useTracker(() => {
        const trainingStatusHandler = Meteor.subscribe(
            'hierTraining.instanceStatus',
            projectId,
        );
        let { status } = 'notConfigured';
        if (trainingStatusHandler.ready()) {
            const instance = Projects.findOne(
                { _id: projectId },
                { fields: { 'hierTraining.instanceStatus': 1 } },
            );
            status = instance?.hierTraining?.instanceStatus;
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
                await Meteor.callWithPromise('hier.cancel', projectId);
            } else {
                await Meteor.callWithPromise('hier.train', projectId);
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
            {trainingStatus === 'notConfigured' ? <></> : (
                <div className='side-by-side middle narrow train-hier-btn'>
                    <Button.Group color={training ? 'yellow' : 'blue'}>
                        {training ? <Button primary loading /> : <></>}
                        <Button
                            content={training ? t('Cancel HIER training') : t('Train HIER')}
                            primary
                            disabled={trainingStatus === 'notReachable'}
                            loading={clicked}
                            onClick={onTrainClick}
                        />
                    </Button.Group>
                </div>
            )}
        </Can>
    );
};

TrainHierButton.propTypes = {
    projectId: PropTypes.string.isRequired,
};

export default TrainHierButton;
