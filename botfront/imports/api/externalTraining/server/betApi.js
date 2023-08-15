/* eslint-disable no-console */
// eslint-disable-next-line no-unused-vars
import axios, { AxiosResponse } from 'axios';
// eslint-disable-next-line no-unused-vars
import { Stream } from 'stream';

const { EXTERNAL_TRAINING_TOKEN, EXTERNAL_TRAINING_IMAGE, ROOT_URL } = process.env;

/**
 * @param {AxiosResponse} resp
 * @returns {void}
 */
const checkStatus = (resp) => {
    if (resp.status.toString()[0] !== '2') {
        const { url, method } = resp.config;
        console.error(`${method}: ${url} Resp: ${resp.statusText}`);
        throw new Error(resp.statusText);
    }
};

/**
 * @returns {object}
 */
const authHeaders = () => ({
    Authorization: EXTERNAL_TRAINING_TOKEN,
});

const axiosClient = axios.create({ headers: authHeaders() });

export class BetApi {
    /**
     * @param {string} projectId
     * @param {string} trainingHost
     * @param {string} trainingData
     * @param {{image?: string, rasaExtraArgs?: string, node?: string}} opts
     * @returns {Promise<string>}
     */
    train = async (projectId, trainingHost, trainingData, opts = {}) => {
        const rootUrl = opts.botfrntUrl || ROOT_URL;
        if (!rootUrl) {
            throw new Error('botfrntUrl not provided and ROOT_URL env is not set');
        }
        const image = opts.image || EXTERNAL_TRAINING_IMAGE;
        if (!image) {
            throw new Error(
                'image not provided and EXTERNAL_TRAINING_IMAGE env is not set',
            );
        }
        const formData = new FormData();
        formData.append('project_id', projectId);
        formData.append('image', image);
        formData.append('training_data', new Blob([trainingData], { type: 'text/yaml' }));
        if (opts.rasaExtraArgs) {
            formData.append('rasa_extra_args', opts.rasaExtraArgs);
        }
        if (opts.node) {
            formData.append('node', opts.node);
        }
        const url = `${trainingHost}/train`;
        const resp = await axiosClient.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
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
    }

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
        const resp = await axiosClient.get(url, { responseType: 'stream' });
        checkStatus(resp);
        return resp.data;
    };
}
