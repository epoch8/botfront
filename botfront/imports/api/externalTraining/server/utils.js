import { ExternalTraining } from '../collection';
import { BetApi } from './betApi';
import { saveModel } from '../../model/server/model.utils';

const betApi = new BetApi();


/**
 * @param {string} host
 * @returns {Promise<boolean>}
 */
export const checkBet = async host => await betApi.ping(host);

/**
 * @param {string} etId
 * @returns {Promise<boolean>}
 */
export const checkAndUpdateExternalTraining = async (etId) => {
    const et = ExternalTraining.findOne(
        { _id: etId },
        {
            fields: {
                jobId: 1,
                projectId: 1,
                betUrl: 1,
                status: 1,
            },
        },
    );
    if (!et) {
        return false;
    }
    const {
        jobId, projectId, betUrl, status,
    } = et;
    if (status !== 'training') {
        return false;
    }
    const newStatus = await betApi.status(jobId, betUrl);
    const logs = await betApi.logs(jobId, betUrl);
    if (newStatus === 'success') {
        const resultStream = await betApi.result(jobId, betUrl);
        await saveModel(projectId, resultStream);
    }
    ExternalTraining.update({ _id: etId }, { $set: { status: newStatus, logs } });
    return true;
};

/**
 * @param {string} projectId
 * @returns {Document[]}
 */
export const activeTrainings = (projectId) => {
    const trainings = ExternalTraining.find(
        { projectId, status: 'training' },
        {
            fields: {
                jobId: 1,
                projectId: 1,
                betUrl: 1,
                status: 1,
            },
        },
    );
    return trainings.fetch();
};
