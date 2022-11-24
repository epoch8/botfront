import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'semantic-ui-react';
import { withTracker } from 'meteor/react-meteor-data';
import { useTranslation } from 'react-i18next';

import { Projects } from '../../../api/project/project.collection';
import { can, Can } from '../../../lib/scopes';

const TrainHierButton = ({ status }) => {
    const { t } = useTranslation('utils');
    return (
        <Can I='nlu-data:x'>
            <div className='side-by-side middle narrow train-hier-btn'>
                <Button.Group>
                    <Button
                        primary={status !== 'training'}
                        negative={status === 'training'}
                        content={status === 'training' ? t('Cancel HIER training') : t('Train HIER')}
                        disabled={status === 'notReachable'}
                    />
                </Button.Group>
            </div>
        </Can>
    );
};

TrainHierButton.propTypes = {
    status: PropTypes.string,
};

TrainHierButton.defaultProps = {
    status: 'notReachable',
};


export default withTracker((props) => {
    const { projectId } = props;
    const trainingStatusHandler = Meteor.subscribe('hierTraining.instanceStatus', projectId);
    let status;
    if (trainingStatusHandler.ready()) {
        status = Projects.findOne(
            { _id: projectId },
            { field: { 'hierTraining.instanceStatus': 1 } },
        );
    }
    return {
        status,
    };
})(TrainHierButton);
