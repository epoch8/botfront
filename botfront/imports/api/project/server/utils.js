import axios from 'axios';

import { Projects } from '../project.collection';
import { DEPLOYER_ADDR, DEPLOYER_API_KEY } from '../../../../server/config';

export const updateInfrastructureStatus = async (projectId) => {
    const url = `${DEPLOYER_ADDR}/${projectId}/status?token=${DEPLOYER_API_KEY}`;
    let infraStatus = null;
    try {
        const resp = await axios.get(url);
        infraStatus = resp.data;
    } catch (error) {
        if (error.response?.status !== 404) {
            throw new Meteor.Error(
                error.response?.status,
                `Error deploying infra: ${JSON.stringify(error.response?.data)}`,
            );
        }
    }
    let newInfraStatus = null;
    if (infraStatus) {
        const { status, last_deployed: lastDeployed } = infraStatus;
        newInfraStatus = { status, lastDeployed };
    }
    Projects.update(
        { _id: projectId },
        {
            $set: { infrastructureStatus: newInfraStatus },
        },
    );
};
