import { createAxiosForRasa } from '../../../lib/utils';

/**
 * @param {string} projectId
 * @returns {Promise<string|null>}
 */
export const getRasaVersion = async (projectId) => {
    const client = await createAxiosForRasa(projectId);
    const resp = await client.get('/version');
    return resp?.data?.version;
};
