import fs from 'fs';
import request from 'request';

import { Models } from '../model.collection';
import { Projects } from '../../project/project.collection';

import { getPostTrainingWebhook } from '../../../lib/utils';
import { MODELS_PATH } from '../../../../server/config';
import { getAppLoggerForFile } from '../../../../server/logger';

const logger = getAppLoggerForFile(__filename);

const writeModelToFS = async (modelPath, modelStream) => {
    logger.info(`Saving model to file ${modelPath}`);
    const writeStream = fs.createWriteStream(modelPath);
    modelStream.pipe(writeStream);
    modelStream.resume();
    await new Promise((resolve, reject) => {
        modelStream.on('end', () => resolve());
        modelStream.on('error', err => reject(err));
    });
};

export const saveModel = async (projectId, dataStream) => {
    if (!MODELS_PATH) {
        logger.error('Unable to save model. MODELS_PATH env var not set');
        return null;
    }
    const modelDir = `${MODELS_PATH}/${projectId}`;
    await fs.promises.mkdir(modelDir, { recursive: true });

    const ts = new Date();
    const modelName = ts.toISOString();
    const modelPath = `${modelName}.tar.gz`;
    const modelFullPath = `${modelDir}/${modelPath}`;
    await writeModelToFS(modelFullPath, dataStream);
    const tmpSymlinkPath = `${modelDir}/_latest.tar.gz`;
    const symlinkPath = `${modelDir}/latest.tar.gz`;
    try {
        await fs.promises.unlink(tmpSymlinkPath);
        // eslint-disable-next-line no-empty
    } catch {}
    await fs.promises.symlink(modelPath, tmpSymlinkPath);
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

const writeModelTmp = async (dataStream) => {
    const ts = new Date();
    const modelName = ts.toISOString();
    const modelPath = `/tmp/${modelName}.tar.gz`;
    await writeModelToFS(modelPath, dataStream);
    return modelPath;
};

const sendModel = async (url, method, projectId, namespace, modelData) => {
    try {
        const data = {
            projectId,
            namespace,
            model: modelData,
        };
        logger.info(`Sending model for project ${projectId} to ${url}`);
        // TODO: request deprecated!
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
    let savedAsTmp;
    if (MODELS_PATH) {
        modelFullPath = await saveModel(projectId, modelData);
        savedAsTmp = false;
    }
    const trainingWebhook = await getPostTrainingWebhook();
    if (trainingWebhook.url && trainingWebhook.method) {
        if (!modelFullPath) {
            modelFullPath = await writeModelTmp(modelData);
            savedAsTmp = true;
        }
        try {
            const modelStream = fs.createReadStream(modelFullPath);
            const { namespace } = Projects.findOne(
                { _id: projectId },
                { fields: { namespace: 1 } },
            );
            await sendModel(
                trainingWebhook.url,
                trainingWebhook.method,
                projectId,
                namespace,
                modelStream,
            );
        } finally {
            if (savedAsTmp) {
                try {
                    await fs.promises.unlink(modelFullPath);
                    // eslint-disable-next-line no-empty
                } catch {}
            }
        }
    }
};
