import { check } from 'meteor/check';
import axios from 'axios';
import uuidv4 from 'uuid/v4';
import { safeLoad } from 'js-yaml';

import { safeDump } from 'js-yaml/lib/js-yaml';
import { checkIfCan } from '../../../lib/scopes';
import { Projects } from '../project.collection';
import { Credentials } from '../../credentials';
import { Instances } from '../../instances/instances.collection';
import { DEPLOYER_ADDR, DEPLOYER_API_KEY, RPD_RASA_DOMAIN } from '../../../../server/config';
import { updateInfrastructureStatus } from './utils';

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

const checkEnvs = () => {
    if (!DEPLOYER_ADDR) {
        throw new Meteor.Error(500, 'DEPLOYER_ADDR env is not set!');
    }
    if (!DEPLOYER_API_KEY) {
        throw new Meteor.Error(500, 'DEPLOYER_API_KEY env is not set!!');
    }
};

const getProject = (projectId) => {
    const project = Projects.findOne({ _id: projectId }, { fields: { name: 1 } });
    if (!project) {
        throw new Meteor.Error(404, `Project ${projectId} not found!`);
    }
    return project;
};

Meteor.methods({
    async 'project.deployInfrastructure'(projectId, infrastructureSettings) {
        checkIfCan('infrastructure:w', projectId);
        check(projectId, String);
        check(infrastructureSettings, Object);
        checkEnvs();
        const instanceInfo = Instances.findOne({ projectId }) || {};
        const token = instanceInfo.token || uuidv4();
        const project = getProject(projectId);
        const url = `${DEPLOYER_ADDR}/deploy?token=${DEPLOYER_API_KEY}`;
        const {
            rasa: rasaSettings,
            actions: actionsSettings,
            ...restSettings
        } = infrastructureSettings;
        const payload = {
            ...restSettings,
            rasa: { ...processServiceParams(rasaSettings), token },
            actions: processServiceParams(actionsSettings),
            callback_url: null,
            project_id: projectId,
            project_name: project.name,
        };
        try {
            await axios.post(url, payload);
        } catch (error) {
            throw new Meteor.Error(
                error.response?.status,
                `Error deploying infra: ${JSON.stringify(error.response?.data)}`,
            );
        }

        Instances.update(
            { projectId },
            {
                $set: {
                    host: `http://rpd-${projectId.toLowerCase()}-rasa-dev:5005`,
                    actionServerHost: `http://rpd-${projectId.toLowerCase()}-actions-dev:5055`,
                    token,
                },
            },
        );

        const { credentials: credentialsYml = '' } = Credentials.findOne(
            { projectId, environment: 'development' },
            { credentials: 1 },
        ) || {};
        const credentials = safeLoad(credentialsYml) || {};
        const channel = Object.keys(credentials).find(
            k => ['WebchatInput', 'WebchatPlusInput'].some(
                c => k.includes(c),
            ),
        ) || 'WebchatInput';
        const { socket_path: socketPath, ...restChanData } = credentials[channel];
        credentials[channel] = {
            ...restChanData,
            base_url: `https://${projectId}-rasa-dev.${RPD_RASA_DOMAIN}`,
            socket_path: socketPath || '/socket.io/',
        };

        Credentials.update(
            { projectId, environment: 'development' },
            { $set: { credentials: safeDump(credentials) } },
        );

        await updateInfrastructureStatus(projectId);
    },
    async 'project.removeInfrastructure'(projectId) {
        checkIfCan('infrastructure:w', projectId);
        check(projectId, String);
        checkEnvs();
        const url = `${DEPLOYER_ADDR}/${projectId}/delete?token=${DEPLOYER_API_KEY}`;
        try {
            await axios.post(url);
        } catch (error) {
            throw new Meteor.Error(
                error.response?.status,
                `Error deploying infra: ${JSON.stringify(error.response?.data)}`,
            );
        }
        await updateInfrastructureStatus(projectId);
    },
});
