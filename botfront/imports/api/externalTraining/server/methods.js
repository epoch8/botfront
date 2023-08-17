import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import yaml from 'js-yaml';
import { formatError } from '../../../lib/utils';
import { BetApi } from './betApi';
import { ExternalTraining } from '../collection';
import { checkIfCan } from '../../../lib/scopes';
import { auditLog } from '../../../../server/logger';

export const betApi = new BetApi();

Meteor.methods({
    /**
     * @param {string} projectId
     * @param {string} host
     * @param {string?} image
     * @param {string?} rasaExtraArgs
     * @param {string?} node
     * @returns {Promise<string>}
     */
    async 'externalTraining.train'(projectId, host, image, rasaExtraArgs, node) {
        checkIfCan('nlu-data:x', projectId);
        check(projectId, String);
        check(host, String);
        check(image, Match.Maybe(String));
        check(rasaExtraArgs, Match.Maybe(String));
        check(node, Match.Maybe(String));

        const backupId = await Meteor.callWithPromise(
            'backup.create',
            projectId,
            'External training backup',
        );

        const { augmentationFactor, ...trainingData } = await Meteor.callWithPromise(
            'rasa3.getTrainingPayload',
            projectId,
        );
        const yamlTrainingData = yaml.safeDump(trainingData, {
            sortKeys: true,
            skipInvalid: true,
        });

        auditLog('Starting external training', {
            user: Meteor.user(),
            projectId,
        });

        const jobId = await betApi.train(projectId, host, yamlTrainingData, {
            image,
            rasaExtraArgs,
            node,
        });

        try {
            ExternalTraining.insert({
                jobId,
                projectId,
                betUrl: host,
                backupId,
                status: 'training',
                createdAt: new Date(),
            });
        } catch (error) {
            await betApi.cancel(jobId, host);
            throw formatError(error);
        }
    },

    /**
     * @param {string} jobId
     * @returns {Promise<boolean>}
     */
    async 'externalTraining.cancel'(jobId) {
        check(jobId, String);
        const training = ExternalTraining.findOne({ jobId });
        if (!training) {
            return false;
        }
        checkIfCan('nlu-data:x', training.projectId);
        return await betApi.cancel(jobId);
    },
    /**
     * @param {string} jobId
     * @returns {Promise<string | null>}
     */
    async 'externalTraining.status'(jobId) {
        check(jobId, String);
        const training = ExternalTraining.findOne({ jobId });
        if (!training) {
            return null;
        }
        checkIfCan('nlu-data:r', training.projectId);
        return training.status;
    },
    /**
     * @param {string} jobId
     * @returns {Promise<string | null>}
     */
    async 'externalTraining.logs'(jobId) {
        check(jobId, String);
        const training = ExternalTraining.findOne({ jobId });
        if (!training) {
            return null;
        }
        checkIfCan('nlu-data:r', training.projectId);
        if (training.status !== 'training') {
            return training.logs;
        }
        const logs = await betApi.logs(jobId);
        // TODO: maybe redundand
        ExternalTraining.update(
            { _id: training._id, updatedAt: training.updatedAt },
            { $set: { logs } },
        );
        return logs;
    },
});
