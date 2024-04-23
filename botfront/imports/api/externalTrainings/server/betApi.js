/* eslint-disable no-console */
// eslint-disable-next-line no-unused-vars
import axios, { AxiosResponse } from 'axios';
// eslint-disable-next-line no-unused-vars
import { Stream } from 'stream';
import FormData from 'form-data';

import {
    EXTERNAL_TRAINING_TOKEN,
    EXTERNAL_TRAINING_IMAGE,
} from '../../../../server/config';

/**
 * @param {AxiosResponse} resp
 * @returns {void}
 */
const checkStatus = (resp) => {
    if (resp.status.toString()[0] !== '2') {
        const { url, method } = resp.config;
        console.error(`${method}: ${url} Resp: ${JSON.stringify(resp.data)}`);
        throw new Error(resp.statusText);
    }
};

/**
 * @returns {object}
 */
const authHeaders = () => ({
    Authorization: EXTERNAL_TRAINING_TOKEN,
});

const axiosClient = axios.create({
    headers: authHeaders(),
    validateStatus: false,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
});

export class BetApi {
    /**
     * @param {string} trainingHost
     * @returns {Promise<boolean>}
     */
    ping = async (trainingHost) => {
        try {
            const resp = await axiosClient.get(trainingHost);
            return resp.status === 200;
        } catch (error) {
            console.error(`External trainer ${trainingHost}: ${error.message}`);
        }
        return false;
    };

    /**
     * @param {string} projectId
     * @param {string} trainingHost
     * @param {string} trainingData
     * @param {{image?: string, rasaExtraArgs?: string, node?: string}} opts
     * @returns {Promise<string>}
     */
    train = async (projectId, trainingHost, trainingData, opts = {}) => {
        const image = opts.image || EXTERNAL_TRAINING_IMAGE;
        if (!image) {
            throw new Error(
                'image not provided and EXTERNAL_TRAINING_IMAGE env is not set',
            );
        }
        const formData = new FormData();
        formData.append('project_id', projectId);
        formData.append('image', image);
        formData.append('training_data', Buffer.from(trainingData, 'utf-8'), {
            filename: 'data.yml',
            contentType: 'text/yaml',
        });
        if (opts.rasaExtraArgs) {
            formData.append('rasa_extra_args', opts.rasaExtraArgs);
        }
        if (opts.node) {
            formData.append('node', opts.node);
        }
        const url = `${trainingHost}/train`;
        const resp = await axiosClient.post(url, formData, {
            headers: {
                'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
            },
        });
        checkStatus(resp);
        return resp.data.job_id;
    };

    /**
     * @param {string} jobId
     * @param {string} trainingHost
     * @returns {Promise<boolean>}
     */
    cancel = async (jobId, trainingHost) => {
        const url = `${trainingHost}/cancel?job_id=${jobId}`;
        const resp = await axiosClient.post(url);
        checkStatus(resp);
        return resp.data.cancelled;
    };

    /**
     * @param {string} jobId
     * @param {string} trainingHost
     * @returns {Promise<string>}
     */
    status = async (jobId, trainingHost) => {
        const url = `${trainingHost}/status?job_id=${jobId}`;
        const resp = await axiosClient.get(url);
        checkStatus(resp);
        return resp.data.status;
    };

    /**
     * @param {string} jobId
     * @param {string} trainingHost
     * @returns {Promise<string>}
     */
    logs = async (jobId, trainingHost) => {
        const url = `${trainingHost}/logs?job_id=${jobId}`;
        const resp = await axiosClient.get(url);
        checkStatus(resp);
        return resp.data;
    };

    /**
     * @param {string} jobId
     * @param {string} trainingHost
     * @returns {Promise<Stream>}
     */
    result = async (jobId, trainingHost) => {
        const url = `${trainingHost}/result?job_id=${jobId}`;
        const resp = await axiosClient.get(url, {
            responseType: 'stream',
            maxContentLength: process.env.TRAINING_MAX_CONTENT_LEN || Infinity,
            maxBodyLength: process.env.TRAINING_MAX_BODY_LEN || Infinity,
        });
        checkStatus(resp);
        return resp.data;
    };
}
