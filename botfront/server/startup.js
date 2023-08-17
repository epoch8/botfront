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
import { checkAndUpdateExternalTraining } from '../imports/api/externalTraining/server/utils';
import packageInfo from '../package.json';

const fileAppLogger = getAppLoggerForFile(__filename);

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
                        let instanceState;
                        try {
                            const client = await createAxiosForRasa(instance.projectId);
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

                        // ! Legacy
                        // const externalTrainingStatuses = await Promise.all(
                        //     (instance.externalTraining || []).map(async (trainingConfig) => {
                        //         let externalTrainingStatus = 'notReachable';
                        //         const { host } = trainingConfig;
                        //         try {
                        //             const resp = await axios.post(
                        //                 `${host}/status/${instance.projectId}`,
                        //             );
                        //             const respTrainingStatus = resp.data[0].status;
                        //             switch (respTrainingStatus) {
                        //             case 'scheduled':
                        //             case 'queued':
                        //             case 'running':
                        //             case 'restarting':
                        //             case 'shutdown':
                        //             case 'up_for_retry':
                        //             case 'up_for_reschedule':
                        //             case 'deferred':
                        //                 externalTrainingStatus = 'training';
                        //                 break;
                        //             case 'unknown':
                        //             case 'none':
                        //             case 'success':
                        //             case 'failed':
                        //             case 'skipped':
                        //             case 'upstream_failed':
                        //             case 'removed':
                        //                 externalTrainingStatus = 'notTraining';
                        //                 break;
                        //             default:
                        //                 externalTrainingStatus = 'notReachable';
                        //                 break;
                        //             }
                        //         } catch (error) {
                        //             console.error(error);
                        //         }
                        //         return { host, status: externalTrainingStatus };
                        //     }),
                        // );
                        // { status: none/training/success/failed }

                        const externalTrainingStatuses = await Promise.all(
                            (instance.externalTraining || []).map(async (trainingConfig) => {
                                const { host } = trainingConfig;
                                const externalTrainingStatus = 'notReachable';
                                // TODO tmp commented
                                // try {
                                //     const respTrainingStatus = await etStatus(
                                //         instance.projectId, host, { token },
                                //     );
                                //     if (respTrainingStatus === 'training') {
                                //         externalTrainingStatus = 'training';
                                //     } else {
                                //         externalTrainingStatus = 'notTraining';
                                //     }
                                // } catch (error) {
                                //     console.error(error);
                                // }
                                return { host, status: externalTrainingStatus };
                            }),
                        );

                        return { status, externalTrainingStatuses, projectId: instance.projectId };
                    }),
                );
                newStatuses.forEach((status) => {
                    Projects.update(
                        { _id: status.projectId },
                        {
                            $set: {
                                'training.instanceStatus': status.status,
                                'externalTraining.instanceStatuses': status.externalTrainingStatuses,
                            },
                        },
                    );
                });
            } catch (e) {
                // eslint-disable-next-line no-console
                console.log(e);
                // eslint-disable-next-line no-console
                console.log('Something went wrong while trying to get the rasa status');
            }
        }, 10000); // run every 10 seconds == 10000 msec

        Meteor.setInterval(async () => {}, 10000);
    }
});
