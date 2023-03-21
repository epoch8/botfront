import fs from 'fs';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { checkIfCan } from '../../../lib/scopes';
import { Models } from '../model.collection';

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

        const modelsPath = process.env.MODELS_PATH;
        if (!modelsPath) {
            return returnError('Unable to deploy model. MODELS_PATH env var not set');
        }
        const modelInfo = Models.findOne({ projectId, _id: modelId });
        if (!modelInfo) {
            returnError(`Model ${modelId} not found for project ${projectId}`);
        }
        const modelDir = `${modelsPath}/${projectId}`;
        const fullModelPath = `${modelDir}/${modelInfo.path}`;
        try {
            await fs.promises.stat(fullModelPath);
        } catch (error) {
            returnError(error, 'Model file not found');
        }
        const symlinkPath = `${modelDir}/current.tar.gz`;
        try {
            await fs.promises.symlink(fullModelPath, symlinkPath);
        } catch (error) {
            returnError(error, 'Error deploying model');
        }
        Models.update({ _id: modelId }, { $set: { deployed: true } });

        return { success: true, fullModelPath };
    },
});
