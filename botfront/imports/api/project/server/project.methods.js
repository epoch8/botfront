import { check } from 'meteor/check';
import axios from 'axios';

import { checkIfCan } from '../../../lib/scopes';
import { Projects } from '../project.collection';
import { DEPLOYER_ADDR, DEPLOYER_API_KEY } from '../../../../server/config';


const processServiceParams = (serviceParams) => {
    const {
        env, dev, prod, ...result
    } = serviceParams;
    if (dev) {
        result.dev = processServiceParams(dev);
    }
    if (prod) {
        result.prod = processServiceParams(prod);
    }
    if (env) {
        result.env = Object.fromEntries(
            env.map(envParam => [envParam.name, envParam.value]),
        );
    }
    return result;
};

Meteor.methods({
    async 'project.deployInfrastructure'(projectId, infrastructureSettings) {
        checkIfCan('infrastructure:w', projectId);
        check(projectId, String);
        check(infrastructureSettings, Object);
        if (!DEPLOYER_ADDR) {
            throw new Meteor.Error(500, 'DEPLOYER_ADDR env is not set!');
        }
        if (!DEPLOYER_API_KEY) {
            throw new Meteor.Error(500, 'DEPLOYER_API_KEY env is not set!!');
        }
        const project = Projects.findOne({ _id: projectId }, { fields: { name: 1 } });
        if (!project) {
            throw new Meteor.Error(404, `Project ${projectId} not found!`);
        }
        const url = `${DEPLOYER_ADDR}/deploy?token=${DEPLOYER_API_KEY}`;
        const {
            rasa: rasaSettings,
            actions: actionsSettings,
            ...restSettings
        } = infrastructureSettings;
        const payload = {
            ...restSettings,
            rasa: processServiceParams(rasaSettings),
            actions: processServiceParams(actionsSettings),
            callback_url: null,
            project_id: projectId,
            project_name: project.name,
        };
        console.log('Deploy', JSON.stringify(payload));
        try {
            await axios.post(url, payload);
        } catch (error) {
            throw new Meteor.Error(
                error.response?.status,
                `Error deploying infra: ${JSON.stringify(error.response?.data)}`,
            );
        }
    },
});
