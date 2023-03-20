import fs from 'fs';

import { Models } from '../model.collection';

import {
    getAppLoggerForFile,
} from '../../../../server/logger';

const logger = getAppLoggerForFile(__filename);

export const saveModel = async (projectId, dataStream) => {
    const modelsPath = process.env.MODELS_PATH;
    if (!modelsPath) {
        logger.error('Unable to save model. MODELS_PATH env var not set');
        return false;
    }
    const modelDir = `${modelsPath}/${projectId}`;
    await fs.promises.mkdir(modelDir, { recursive: true });

    const ts = new Date();
    const modelName = ts.toISOString();
    const modelPath = `${modelName}.tar.gz`;
    const modelFullPath = `${modelDir}/${modelPath}`;
    const writeStream = fs.createWriteStream(modelFullPath);
    dataStream.pipe(writeStream);
    await new Promise((resolve, reject) => {
        dataStream.on('finish', () => resolve());
        dataStream.on('error', err => reject(err));
    });
    const symlinkPath = `${modelDir}/latest.tar.gz`;
    await fs.promises.symlink(modelFullPath, symlinkPath);
    await Models.insertAsync({
        projectId,
        name: modelName,
        comment: '',
        path: modelPath,
        deployed: false,
        createdAt: ts,
    });

    return true;
};
