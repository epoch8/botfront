import mongoose from 'mongoose';
import { ApolloServer, AuthenticationError } from 'apollo-server-express';
import { WebApp } from 'meteor/webapp';
import { getUser } from 'meteor/apollo';
import { Accounts } from 'meteor/accounts-base';

import axios from 'axios';
import bcrypt from 'bcrypt';
import url from 'url';

import { IncomingMessage, ServerResponse } from 'http';
import { typeDefs, resolvers } from '../../api/graphql/index';
import { addMeteorUserToCall } from '../../api/graphql/utils';
import { saveModel } from '../../api/model/server/model.utils';
import { can } from '../../lib/scopes';

const MONGO_URL = process.env.MONGO_URL
    || `mongodb://localhost:${(process.env.METEOR_PORT || 3000) + 1}/meteor`;

const API_TOKEN = process.env.API_TOKEN
    || '$2b$12$bSA14.KDRrUYjJKIfELsH.fMqjRZf1U3XDLZby6oh7J/sZH3z1w/K';

export const connectToDb = () => {
    mongoose.connect(MONGO_URL, {
        keepAlive: 1,
        useUnifiedTopology: 1,
        useFindAndModify: 0,
        useNewUrlParser: 1,
        useCreateIndex: 1,
    });
    mongoose.connection.on('error', () => {
        throw new Error(`unable to connect to database: ${MONGO_URL}`);
    });
};

const getUserFromRequest = async (req) => {
    const {
        headers: { authorization },
    } = req;
    let user = await getUser(authorization);
    const isHealthcheck = req?.method === 'GET' && req?.query?.query === 'query {healthCheck}';
    if (
        !isHealthcheck
        && !user
        && process.env.API_KEY
        && process.env.API_KEY !== authorization
    ) {
        return null;
    }
    if (!user) user = Meteor.users.findOne({ username: 'EXTERNAL_CONSUMER' });
    if (!user) {
        Accounts.createUser({ username: 'EXTERNAL_CONSUMER' });
        user = Meteor.users.findOne({ username: 'EXTERNAL_CONSUMER' });
    }
    if (
        user.username === 'EXTERNAL_CONSUMER'
        && (!can('responses:r', null, user._id)
            || !can('export:x ', null, user._id)
            || !can('nlu-data:x ', null, user._id))
    ) {
        Meteor.roleAssignment.update(
            { 'user._id': user._id },
            {
                user: { _id: user._id },
                scope: null,
                inheritedRoles: [
                    { _id: 'responses:r' },
                    { _id: 'stories:r' },
                    { _id: 'projects:r' },
                    { _id: 'nlu-data:x' },
                    { _id: 'export:x' },
                ],
            },
            { upsert: true },
        );
    }
    return user;
};

const checkApiToken = async token => bcrypt.compare(token, API_TOKEN);

const apiWrapper = (methods, handler) => async (req, res, next) => {
    if (methods && !methods.includes(req.method)) {
        res.statusCode = 405;
        res.end();
        return;
    }
    const { query } = url.parse(req.url, true);
    if (!query.token || !(await checkApiToken(query.token))) {
        res.statusCode = 403;
        res.end();
        return;
    }
    req.query = query;
    await handler(req, res, next);
};

export const runAppolloServer = () => {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: async ({ req }) => {
            const user = await getUserFromRequest(req);
            if (user === null) {
                throw new AuthenticationError('Unauthorized');
            }
            return { user };
        },
    });

    server.applyMiddleware({
        app: WebApp.connectHandlers,
        path: '/graphql',
        bodyParserConfig: { limit: process.env.GRAPHQL_REQUEST_SIZE_LIMIT || '200kb' },
    });

    WebApp.connectHandlers.use('/graphql', (req, res) => {
        if (req.method === 'GET') {
            res.end();
        }
    });

    // Legacy?
    WebApp.connectHandlers.use('/export-project/', async (req, res) => {
        try {
            if (req.method !== 'POST') {
                res.statusCode = 405;
                res.end();
                return;
            }
            const projectId = req.url.split('/')[1];
            if (!projectId) {
                res.statusCode = 404;
                res.end();
                return;
            }
            const user = await getUserFromRequest(req);
            const zip = await addMeteorUserToCall(
                user,
                () => Meteor.callWithPromise('exportRasa', projectId, 'all', {}),
            );
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${projectId}.zip`);
            res.setHeader('Content-Length', zip.length);
            res.statusCode = 200;
            res.write(zip);
            res.end();
        } catch (error) {
            if (error.error === '403') {
                res.statusCode = 403;
            } else {
                console.error(error);
                res.statusCode = 500;
            }
            res.end();
        }
    });

    WebApp.connectHandlers.use('/health', (req, res) => {
        const { authorization } = req.headers;
        const headersObject = authorization
            ? {
                headers: {
                    authorization,
                },
            }
            : {};
        axios
            .get(
                'http://localhost:3000/graphql?query=query%20%7BhealthCheck%7D',
                headersObject,
            )
            .then((response) => {
                // handle success
                if (response.data) {
                    if (
                        response.data
                        && response.data.data
                        && response.data.data.healthCheck
                    ) {
                        res.statusCode = 200;
                        res.end();
                    }
                } else {
                    res.statusCode = 401;
                    res.end();
                }
            })
            .catch(function () {
                res.statusCode = 500;
                res.end();
            });
    });

    WebApp.connectHandlers.use('/api/export-project', apiWrapper(['POST'],
        async (req, res) => {
            try {
                const { projectId } = req.query;
                if (!projectId) {
                    res.statusCode = 404;
                    res.end();
                    return;
                }
                const zip = await Meteor.callWithPromise('exportRasa', projectId, 'all', {});
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader(
                    'Content-Disposition',
                    `attachment; filename="${projectId}.zip`,
                );
                res.setHeader('Content-Length', zip.length);
                res.statusCode = 200;
                res.write(zip);
            } catch (error) {
                if (error.error === '403') {
                    res.statusCode = 403;
                } else {
                    console.error(error);
                    res.statusCode = 500;
                }
            }
            res.end();
        }));

    WebApp.connectHandlers.use('/api/save-model', apiWrapper(['POST'],
        /**
         * @param {IncomingMessage} req
         * @param {ServerResponse} res
         * @returns {void}
         */
        async (req, res) => {
            const { projectId } = req.query;
            if (!projectId) {
                res.statusCode = 404;
                res.end();
                return;
            }
            if (await saveModel(projectId, req)) {
                res.statusCode = 201;
            } else {
                res.statusCode = 500;
            }
            res.end();
        }));
};

Meteor.startup(() => {
    if (Meteor.isServer) {
        connectToDb();
        runAppolloServer();
    }
});
