/* eslint-disable no-console */
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { Accounts } from 'meteor/accounts-base';
import dotenv from 'dotenv';
import { createGraphQLPublication } from 'meteor/swydo:ddp-apollo';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { get } from 'lodash';
import { typeDefsWithUpload, resolvers } from '../imports/api/graphql/index';
import { getAppLoggerForFile } from './logger';
import { Projects } from '../imports/api/project/project.collection';
import { Instances } from '../imports/api/instances/instances.collection';
import { createAxiosForRasa } from '../imports/lib/utils';
import {
    checkAndUpdateExternalTraining,
    checkBet,
    activeTrainings,
} from '../imports/api/externalTraining/server/utils';
import packageInfo from '../package.json';

const fileAppLogger = getAppLoggerForFile(__filename);

/**
 * @param {string} projectId
 * @param {string} host
 * @returns {Promise<string>}
 */
const getTrainingStatus = async (projectId, host) => {
    try {
        const betReacheble = await checkBet(host);
        if (!betReacheble) {
            return 'notReachable';
        }
        const currentTrainings = activeTrainings(projectId, host);
        if (currentTrainings.length === 0) {
            return 'notTraining';
        }
        return 'training';
    } catch (error) {
        console.error(error);
    }
    return 'notReachable';
};

Meteor.startup(function () {
    if (Meteor.isServer) {
        const schema = makeExecutableSchema({
            typeDefs: typeDefsWithUpload, // makeExecutableSchema need to define upload when working with files
            resolvers,
        });

        createGraphQLPublication({
            schema,
        });
        dotenv.config({
            path: `${process.env.PWD}/.env`,
        });
        // Set ambiguous error messages on login errors
        // eslint-disable-next-line no-underscore-dangle
        Accounts._options.ambiguousErrorMessages = true;

        // Set up rate limiting on login
        Accounts.removeDefaultRateLimit();
        DDPRateLimiter.setErrorMessage((r) => {
            const { timeToReset } = r;
            const time = Math.ceil(timeToReset / 60000);
            return `Too many requests. Try again in ${time} minutes.`;
        });
        DDPRateLimiter.addRule(
            {
                userId: null,
                clientAddress: null,
                type: 'method',
                name: 'login',
                // eslint-disable-next-line no-unused-vars
                connectionId: connectionId => true,
            },
            5,
            300000,
        );

        fileAppLogger.info(`Botfront ${packageInfo.version} started`);
        Meteor.setInterval(async () => {
            try {
                const instancesInfo = Instances.find();
                const newStatuses = await Promise.all(
                    instancesInfo.map(async (instance) => {
                        const { projectId, externalTraining } = instance;
                        let instanceState;
                        try {
                            const client = await createAxiosForRasa(projectId);
                            const data = await client.get('/status');
                            instanceState = get(
                                data,
                                'data.num_active_training_jobs',
                                -1,
                            );
                        } catch (e) {
                            instanceState = -1;
                        }
                        let status;
                        if (instanceState >= 1) status = 'training';
                        if (instanceState === 0) status = 'notTraining';
                        if (instanceState === -1) status = 'notReachable';

                        const externalTrainingStatuses = await Promise.all(
                            (externalTraining || []).map(async (trainingConfig) => {
                                const { host } = trainingConfig;
                                const etStatus = await getTrainingStatus(projectId, host);
                                return { host, status: etStatus };
                            }),
                        );

                        return {
                            instanceStatus: status,
                            projectId,
                            externalTrainingStatuses,
                        };
                    }),
                );
                newStatuses.forEach(
                    ({ instanceStatus, projectId, externalTrainingStatuses }) => {
                        Projects.update(
                            { _id: projectId },
                            {
                                $set: {
                                    'training.instanceStatus': instanceStatus,
                                    externalTraining: externalTrainingStatuses,
                                },
                            },
                        );
                    },
                );
            } catch (e) {
                console.log(e);
                console.log('Something went wrong while trying to get the rasa status');
            }
        }, 10000); // run every 10 seconds == 10000 msec

        const externalTrainingUpdateRoutine = async () => {
            try {
                const projects = Projects.find({}, { fields: { _id: 1 } });
                await Promise.all(
                    projects.forEach(async ({ _id: projectId }) => {
                        const currentTrainings = activeTrainings(projectId);
                        await Promise.all(
                            currentTrainings.map(async (training) => {
                                await checkAndUpdateExternalTraining(training._id);
                            }),
                        );
                    }),
                );
            } catch (error) {
                console.error(error);
            }
            Meteor.setTimeout(externalTrainingUpdateRoutine, 10000);
        };

        Meteor.defer(externalTrainingUpdateRoutine);
    }
});
