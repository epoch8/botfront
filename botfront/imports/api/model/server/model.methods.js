import fs from 'fs';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { checkIfCan } from '../../../lib/scopes';
import { Models } from '../model.collection';

import { MODELS_PATH } from '../../../../server/config';
import {
    getAppLoggerForFile,
    getAppLoggerForMethod,
} from '../../../../server/logger';

const logger = getAppLoggerForFile(__filename);

Meteor.methods({
    async 'model.deploy'(projectId, modelId) {
        checkIfCan('models:x', projectId);
        check(projectId, String);
        check(modelId, String);

        const appMethodLogger = getAppLoggerForMethod(
            logger, 'model.deploy', Meteor.userId(), { projectId },
        );
        const returnError = (error, errorMsg) => {
            appMethodLogger.error(error);
            return { success: false, error: errorMsg || String(error) };
        };

        if (!MODELS_PATH) {
            return returnError('Unable to deploy model. MODELS_PATH env var not set');
        }
        const modelInfo = Models.findOne({ projectId, _id: modelId });
        if (!modelInfo) {
            returnError(`Model ${modelId} not found for project ${projectId}`);
        }
        const modelPath = modelInfo.path;
        const modelDir = `${MODELS_PATH}/${projectId}`;
        const fullModelPath = `${modelDir}/${modelPath}`;
        try {
            await fs.promises.stat(fullModelPath);
        } catch (error) {
            returnError(error, 'Model file not found');
        }
        const symlinkPath = `${modelDir}/current.tar.gz`;
        const tmpSymlinkPath = `${modelDir}/_current.tar.gz`;
        try {
            await fs.promises.unlink(tmpSymlinkPath);
        // eslint-disable-next-line no-empty
        } catch { }
        try {
            await fs.promises.symlink(modelPath, tmpSymlinkPath);
            await fs.promises.rename(tmpSymlinkPath, symlinkPath);
        } catch (error) {
            returnError(error, 'Error deploying model');
        }
        Models.update({}, { $set: { deployed: false } }, { multi: true });
        Models.update({ _id: modelId }, {
            $set: { deployed: true, deployedAt: new Date(), deployedBy: Meteor.user()?._id },
        });

        return { success: true, fullModelPath };
    },
});
