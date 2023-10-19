import axios from 'axios';

/**
 * @param {string} host
 * @param {number} nExamples
 * @returns {Promise<string[]>}
 */
export const getFaqExamples = async (host, nExamples) => {
    const resp = await axios({
        method: 'get',
        url: `${host}/get_nlu_data`,
        data: { n_items: nExamples },
    });
    return resp.data;
};

/**
 * @param {string} host
 * @param {number} nExamples
 * @returns {Promise<string>}
 */
export const getFaqExamplesString = async (host, nExamples) => {
    const faqExamples = await getFaqExamples(host, nExamples);
    const faqExamplesCleaned = faqExamples.map(ex => ex.replace(/\n/g, ' ').trim());
    return `- ${faqExamplesCleaned.join('\n- ')}`;
};
