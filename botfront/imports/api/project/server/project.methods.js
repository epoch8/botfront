import { check } from 'meteor/check';
import axios from 'axios';

import { checkIfCan } from '../../../lib/scopes';
import { Projects } from '../project.collection';

const { DEPLOYER_ADDR } = process.env;

Meteor.methods({
    async 'project.deploy'(projectId, infrastructureSettings) {
        checkIfCan('infrastructure:w', projectId);
        check(projectId, String);
        check(infrastructureSettings, Object);
        console.log('Deploy');
        if (!DEPLOYER_ADDR) {
            throw new Meteor.Error(500, 'No Deployer address!');
        }
        const project = Projects.findOne({ _id: projectId }, { fields: { name: 1 } });
        if (!project) {
            throw new Meteor.Error(404, `Project ${projectId} not found!`);
        }
        const url = `${DEPLOYER_ADDR}/deploy`;
        const payload = {
            ...infrastructureSettings,
            project_id: projectId,
            project_name: project.name,
        };
        const resp = await axios.post(url, payload);
        if (!resp.status.toString().startsWith('2')) {
            throw new Meteor.Error(
                resp.status,
                `Error deploying infra: ${JSON.stringify(resp.data)}`,
            );
        }
    },
});
