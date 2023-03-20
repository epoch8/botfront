import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'semantic-ui-react';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { useTranslation } from 'react-i18next';

import { Projects } from '../../../api/project/project.collection';
import { Can } from '../../../lib/scopes';

const TrainHierButton = ({ status, projectId }) => {
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
            {status === 'notConfigured' ? <></> : (
                <div className='side-by-side middle narrow train-hier-btn'>
                    <Button.Group color={training ? 'yellow' : 'blue'}>
                        {training ? <Button primary loading /> : <></>}
                        <Button
                            content={training ? t('Cancel HIER training') : t('Train HIER')}
                            primary
                            disabled={status === 'notReachable'}
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
    status: PropTypes.string,
    projectId: PropTypes.string.isRequired,
};

TrainHierButton.defaultProps = {
    status: 'notConfigured',
};

export default withTracker((props) => {
    const { projectId } = props;
    const trainingStatusHandler = Meteor.subscribe(
        'hierTraining.instanceStatus',
        projectId,
    );
    let { status } = props;
    if (trainingStatusHandler.ready()) {
        const instance = Projects.findOne(
            { _id: projectId },
            { fields: { 'hierTraining.instanceStatus': 1 } },
        );
        status = instance?.hierTraining?.instanceStatus;
    }
    return {
        status,
        projectId,
    };
})(TrainHierButton);
