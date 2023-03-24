import fs from 'fs';
import request from 'request';

import { Models } from '../model.collection';
import { Projects } from '../../project/project.collection';

import { getPostTrainingWebhook } from '../../../lib/utils';
import {
    getAppLoggerForFile,
} from '../../../../server/logger';

const logger = getAppLoggerForFile(__filename);

export const saveModel = async (projectId, dataStream) => {
    const modelsPath = process.env.MODELS_PATH;
    if (!modelsPath) {
        logger.error('Unable to save model. MODELS_PATH env var not set');
        return null;
    }
    const modelDir = `${modelsPath}/${projectId}`;
    await fs.promises.mkdir(modelDir, { recursive: true });

    const ts = new Date();
    const modelName = ts.toISOString();
    const modelPath = `${modelName}.tar.gz`;
    const modelFullPath = `${modelDir}/${modelPath}`;
    logger.info(`Saving model to file ${modelFullPath}`);
    const writeStream = fs.createWriteStream(modelFullPath);
    dataStream.pipe(writeStream);
    dataStream.resume();
    await new Promise((resolve, reject) => {
        dataStream.on('end', () => resolve());
        dataStream.on('error', err => reject(err));
    });
    const tmpSymlinkPath = `${modelDir}/_latest.tar.gz`;
    const symlinkPath = `${modelDir}/latest.tar.gz`;
    try {
        await fs.promises.unlink(tmpSymlinkPath);
    // eslint-disable-next-line no-empty
    } catch { }
    await fs.promises.symlink(modelFullPath, tmpSymlinkPath);
    await fs.promises.rename(tmpSymlinkPath, symlinkPath);
    Models.insert({
        projectId,
        name: modelName,
        comment: '',
        path: modelPath,
        deployed: false,
        createdAt: ts,
    });
    logger.info(`Model ${modelName} saved`);

    return modelFullPath;
};

const sendModel = async (url, method, projectId, namespace, modelData) => {
    try {
        const data = {
            projectId,
            namespace,
            model: modelData,
        };
        logger.info(`Sending model for project ${projectId} to ${url}`);
        const response = await new Promise((resolve, reject) => {
            request(url, { method, formData: data }, (error, resp) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(resp);
                }
            });
        });
        const { statusCode: status, body: responseData } = response;
        logger.info(`Model for project ${projectId} was sent with status ${status}`);
        return { status, data: responseData };
    } catch (e) {
        // if we console log the error here, it will write the image/model as a string, and the error message will be too bike and unusable.
        logger.error('ERROR: Botfront encountered an error while calling a webhook');
        logger.error(`Status code: ${e?.response?.statusCode}`);
        return { status: 500, data: e?.response?.data || e };
    }
};

export const postTraining = async (projectId, modelData) => {
    let modelFullPath;
    if (process.env.MODELS_PATH) {
        modelFullPath = await saveModel(projectId, modelData);
    }
    const trainingWebhook = await getPostTrainingWebhook();
    if (trainingWebhook.url && trainingWebhook.method) {
        const modelStream = modelFullPath ? fs.createReadStream(modelFullPath) : modelData;
        const { namespace } = Projects.findOne({ _id: projectId }, { fields: { namespace: 1 } });
        await sendModel(trainingWebhook.url, trainingWebhook.method, projectId, namespace, modelStream);
    }
};
