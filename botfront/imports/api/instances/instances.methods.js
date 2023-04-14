/* eslint-disable camelcase */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { check, Match } from 'meteor/check';
import axiosRetry from 'axios-retry';
import yaml from 'js-yaml';
import axios from 'axios';
import _ from 'lodash';
import { createHash } from 'crypto';

import {
    createAxiosForRasa,
    formatError,
    getProjectModelFileName,
} from '../../lib/utils';
import { NLUModels } from '../nlu_model/nlu_model.collection';
import { getExamples } from '../graphql/examples/mongo/examples';
import { Instances } from './instances.collection';
import { CorePolicies } from '../core_policies';
import { Evaluations } from '../nlu_evaluation';
import { checkIfCan } from '../../lib/scopes';
import Activity from '../graphql/activity/activity.model';
import { getFragmentsAndDomain } from '../../lib/story.utils';
import { dropNullValuesFromObject } from '../../lib/client.safe.utils';
import { Projects } from '../project/project.collection';
import { deduplicateArray } from '../../lib/importers/validateDomain';


const replaceMongoReservedChars = (input) => {
    if (Array.isArray(input)) return input.map(replaceMongoReservedChars);
    if (typeof input === 'object') {
        const corrected = input;
        Object.keys(input).forEach((key) => {
            const newKeyName = key.replace(/\./g, '_');
            corrected[newKeyName] = replaceMongoReservedChars(input[key]);
            if (newKeyName !== key) delete corrected[key];
        });
        return corrected;
    }
    return input;
};

export const createInstance = async (project) => {
    if (!Meteor.isServer) throw Meteor.Error(401, 'Not Authorized');

    const { instance: host } = yaml.safeLoad(
        Assets.getText(
            process.env.MODE === 'development'
                ? 'defaults/private.dev.yaml'
                : process.env.ORCHESTRATOR === 'gke'
                    ? 'defaults/private.gke.yaml'
                    : 'defaults/private.yaml',
        ),
    );

    return Instances.insert({
        name: 'Default Instance',
        host: host.replace(/{PROJECT_NAMESPACE}/g, project.namespace),
        projectId: project._id,
    });
};

const convertExampleJsonToRasa = ({ text, entities = [] }) => {
    if (!entities.length) return text;
    const parts = [];
    const sortedEentities = [...entities].sort((a, b) => a.start - b.start);
    let cursor = 0;
    for (const entity of sortedEentities) {
        if (entity.start > cursor) {
            parts.push(text.slice(cursor, entity.start));
        }
        const entityParams = {
            entity: entity.entity,
            value: entity.value,
        };
        if (entity.group) {
            entityParams.group = entity.group;
        }
        if (entity.role) {
            entityParams.role = entity.rolel;
        }
        parts.push(`[${text.slice(entity.start, entity.end)}]${JSON.stringify(entityParams)}`);
        cursor = entity.end;
    }
    if (cursor < text.length) {
        parts.push(text.slice(cursor));
    }
    return parts.join('');
};

const convertDomainBotfrontToRasa = (domain) => {
    console.log(domain);
    const rasaSlots = Object.fromEntries(
        Object.entries(domain.slots).map(([key, slotInfo]) => {
            if (slotInfo.type === 'unfeaturized') {
                return [
                    key,
                    {
                        mappings: [],
                        ...slotInfo,
                        type: 'any',
                        influence_conversation: false,
                    },
                ];
            }
            return [key, { mappings: [], ...slotInfo }];
        }),
    );

    const rasaResponses = Object.fromEntries(
        Object.entries(domain.responses).map(([name, respArray]) => [
            name,
            respArray.map(({ text }) => ({ text })),
        ]),
    );

    const rasaForms = Object.fromEntries(
        Object.entries(domain.forms).map(([formName, formParams]) => {
            for (const { name: slotName, filling } of formParams.slots) {
                const slotParams = rasaSlots[slotName] || {
                    type: 'any',
                    influence_conversation: false,
                };
                const mappings = filling.map(({ entity, ...rest }) => {
                    if (entity) {
                        return { entity: entity[0], ...rest };
                    }
                    return rest;
                });
                rasaSlots[slotName] = {
                    ...slotParams,
                    mappings,
                };
            }
            const requiredSlots = [];
            let currentSlot = '1';
            let found = true;
            while (found) {
                found = false;
                for (const { source, target } of formParams.graph_elements.edges) {
                    if (source === currentSlot) {
                        if (requiredSlots.includes(target)) {
                            throw new Error(`Circular dependency in "${formName}" form graph!`);
                        }
                        requiredSlots.push(target);
                        currentSlot = target;
                        found = true;
                        break;
                    }
                }
            }
            return [formName, { required_slots: requiredSlots }];
        }),
    );

    const rasaActions = deduplicateArray([
        ...domain.actions,
        ...Object.keys(domain.actions_params || {}),
    ]);

    return {
        ...domain,
        actions: rasaActions,
        slots: rasaSlots,
        responses: rasaResponses,
        forms: rasaForms,
    };
};

const convertNluBotfrontToRasa = (intents = [], entity_synonyms = [], regex_features = []) => {
    const rasaIntents = Object.entries(
        _.groupBy(intents, ({ intent }) => intent),
    ).map(([intent, examplesGroup]) => ({
        intent,
        examples: `- ${examplesGroup.map(convertExampleJsonToRasa).join('\n- ')}`,
    }));
    const rasaSynonyms = Object.entries(
        _.groupBy(entity_synonyms, ({ value }) => value),
    ).map(([synonym, synonymsGroup]) => ({
        synonym,
        examples: `- ${synonymsGroup.map(({ synonyms }) => synonyms.join('\n- ')).join('\n- ')}`,
    }));
    const rasaRegex = Object.entries(
        _.groupBy(regex_features, ({ name }) => name),
    ).map(([regex, regexGroup]) => ({
        regex,
        examples: `- ${regexGroup.map(({ pattern }) => pattern).join('\n- ')}`,
    }));
    return [...rasaIntents, ...rasaSynonyms, ...rasaRegex];
};


// TODO modify tests
export const getRasaNluDataAndConfig = async (projectId, language, intents) => {
    const nluFilter = language ? { projectId, language } : { projectId };
    const model = await NLUModels.findOne(
        nluFilter,
        { training_data: 1, config: 1 },
    );
    if (!model) {
        throw new Error(`Could not find ${language} model for project ${projectId}.`);
    }
    const {
        training_data: { entity_synonyms, regex_features },
        config,
    } = model;
    const { examples = [] } = await getExamples({
        projectId,
        language,
        intents,
        pageSize: -1,
        sortKey: 'intent',
        order: 'ASC',
    });
    const common_examples = examples.filter(e => !e?.metadata?.draft);
    const missingExamples = Math.abs(Math.min(0, common_examples.length - 2));
    for (let i = 0; (intents || []).length && i < missingExamples; i += 1) {
        common_examples.push({
            text: `${i}dummy${i}azerty${i}`,
            entities: [],
            metadata: { canonical: true, language },
            intent: `dumdum${i}`,
        });
    }

    return {
        nlu: convertNluBotfrontToRasa(common_examples, entity_synonyms, regex_features),
        config: yaml.safeLoad(config),
    };
};

export const getNluDataAndConfig = async (projectId, language, intents) => {
    const model = await NLUModels.findOne(
        { projectId, language },
        { training_data: 1, config: 1 },
    );
    if (!model) {
        throw new Error(`Could not find ${language} model for project ${projectId}.`);
    }
    const copyAndFilter = ({
        _id, mode, min_score, ...obj
    }) => obj;
    const {
        training_data: { entity_synonyms, fuzzy_gazette, regex_features },
        config,
    } = model;
    const { examples = [] } = await getExamples({
        projectId,
        language,
        intents,
        pageSize: -1,
        sortKey: 'intent',
        order: 'ASC',
    });
    const common_examples = examples.filter(e => !e?.metadata?.draft);
    const missingExamples = Math.abs(Math.min(0, common_examples.length - 2));
    for (let i = 0; (intents || []).length && i < missingExamples; i += 1) {
        common_examples.push({
            text: `${i}dummy${i}azerty${i}`,
            entities: [],
            metadata: { canonical: true, language },
            intent: `dumdum${i}`,
        });
    }

    return {
        rasa_nlu_data: {
            common_examples: common_examples.map(
                ({
                    text, intent, entities = [], metadata: { canonical, ...metadata } = {},
                }) => ({
                    text,
                    intent,
                    entities: entities.map(({ _id: _, ...rest }) => dropNullValuesFromObject(rest)),
                    metadata: {
                        ...metadata,
                        ...(canonical ? { canonical } : {}),
                    },
                }),
            ),
            entity_synonyms: entity_synonyms.map(copyAndFilter),
            gazette: fuzzy_gazette.map(copyAndFilter),
            regex_features: regex_features.map(copyAndFilter),
        },
        config: yaml.dump({
            ...yaml.safeLoad(config),
            language,
        }),
    };
};


const hashParams = (params) => {
    const hash = createHash('md5');
    hash.update(JSON.stringify(params));
    return hash.digest('base64');
};

const processParametrizedActions = (stories, parametrizedActions = {}) => {
    const newParametrizedActions = { ...parametrizedActions };

    // Replace parametrized actions with autogenerated action names and save
    // parameters for domain
    const processedFragments = stories.map((fragment) => {
        const steps = fragment.steps.map((step) => {
            if (!step.action?.params) {
                return step;
            }
            const actionName = `${step.action.name}_${hashParams(step.action.params)}`;
            if (!(actionName in parametrizedActions)) {
                newParametrizedActions[actionName] = {
                    base_action: step.action.name,
                    args: [],
                    kwargs: Object.fromEntries(step.action.params),
                };
            }
            return { action: actionName };
        });
        return { ...fragment, steps };
    });

    return [processedFragments, newParametrizedActions];
};

if (Meteor.isServer) {
    import {
        getAppLoggerForFile,
        getAppLoggerForMethod,
        addLoggingInterceptors,
        auditLog,
    } from '../../../server/logger';
    import { postTraining } from '../model/server/model.utils';
    // eslint-disable-next-line import/order
    import { performance } from 'perf_hooks';

    const trainingAppLogger = getAppLoggerForFile(__filename);

    const trainingHostExists = (projectId, trainingHost) => !!Instances.findOne({
        projectId,
        externalTraining: { $elemMatch: { host: trainingHost } },
    }, { fields: {} });

    Meteor.methods({
        async 'rasa.parse'(instance, examples, options = {}) {
            checkIfCan('nlu-data:r', instance.projectId);
            check(instance, Object);
            check(examples, Array);
            check(options, Object);
            const { failSilently } = options;
            const appMethodLogger = getAppLoggerForMethod(
                trainingAppLogger,
                'rasa.parse',
                Meteor.userId(),
                { instance, examples },
            );
            appMethodLogger.debug('Parsing nlu');
            try {
                const client = await createAxiosForRasa(instance.projectId, { timeout: 100 * 1000 });
                addLoggingInterceptors(client, appMethodLogger);
                // axiosRetry(client, { retries: 3, retryDelay: axiosRetry.exponentialDelay });
                const requests = examples.map(({ text, lang }) => {
                    const payload = Object.assign({}, { text, lang });
                    return client.post('/model/parse', payload);
                });

                const result = (await axios.all(requests))
                    .filter(r => r.status === 200)
                    .map(r => r.data)
                    .map((r) => {
                        if (!r.text || r.text.startsWith('/')) {
                            return {
                                text: (r.text || '').replace(/^\//, ''),
                                intent: null,
                                intent_ranking: [],
                                entities: [],
                            };
                        }
                        return r;
                    });
                if (result.length < 1 && !failSilently) {
                    throw new Meteor.Error('Error when parsing NLU');
                }
                if (
                    Array.from(new Set(result.map(r => r.language))).length > 1
                    && !failSilently
                ) {
                    throw new Meteor.Error(
                        'Tried to parse for more than one language at a time.',
                    );
                }
                return examples.length < 2 ? result[0] : result;
            } catch (e) {
                if (failSilently) {
                    const result = examples.map(({ text }) => ({
                        text: (text || '').replace(/^\//, ''),
                        intent: null,
                        intent_ranking: [],
                        entities: [],
                    }));
                    return examples.length < 2 ? result[0] : result;
                }
                throw formatError(e);
            }
        },

        async 'rasa.getTrainingPayload'(
            projectId,
            { language = '', env = 'development' } = {},
        ) {
            checkIfCan(['nlu-data:x', 'projects:r', 'export:x'], projectId);
            check(projectId, String);
            check(language, String);

            const { policies: corePolicies, augmentationFactor } = CorePolicies.findOne(
                { projectId },
                { policies: 1, augmentationFactor: 1 },
            );
            const nlu = {};
            const config = {};

            const {
                stories = [], rules = [], domain, wasPartial,
            } = await getFragmentsAndDomain(
                projectId,
                language,
                env,
            );
            stories.sort((a, b) => a.story.localeCompare(b.story));
            rules.sort((a, b) => a.rule.localeCompare(b.rule));
            const selectedIntents = wasPartial
                ? yaml.safeLoad(domain).intents
                : undefined;
            let languages = [language];
            if (!language) {
                const project = Projects.findOne({ _id: projectId }, { languages: 1 });
                languages = project ? project.languages : [];
            }
            for (const lang of languages) {
                const {
                    rasa_nlu_data,
                    config: configForLang,
                } = await getNluDataAndConfig(projectId, lang, selectedIntents);
                nlu[lang] = { rasa_nlu_data };
                config[lang] = `${configForLang}\n\n${corePolicies}`;
            }
            const payload = {
                domain: yaml.safeDump(domain, { skipInvalid: true, sortKeys: true }),
                stories,
                rules,
                nlu,
                config,
                fixed_model_name: getProjectModelFileName(projectId),
                augmentation_factor: augmentationFactor,
            };
            auditLog('Retreived training payload for project', {
                user: Meteor.user(),
                type: 'execute',
                projectId,
                operation: 'nlu-model-execute',
                resId: projectId,
                resType: 'nlu-model',
            });
            return payload;
        },

        async 'rasa.train'(projectId, env = 'development') {
            checkIfCan('nlu-data:x', projectId);
            check(projectId, String);
            auditLog('Trained project', {
                user: Meteor.user(),
                projectId,
                type: 'execute',
                operation: 'nlu-model-trained',
                resId: projectId,
                resType: 'nlu-model',
            });
            const appMethodLogger = getAppLoggerForMethod(
                trainingAppLogger,
                'rasa.train',
                Meteor.userId(),
                { projectId },
            );

            appMethodLogger.debug(`Training project ${projectId}...`);
            const t0 = performance.now();
            try {
                const {
                    stories = [],
                    rules = [],
                    ...payload
                } = await Meteor.call('rasa.getTrainingPayload', projectId, { env });
                payload.fragments = yaml.safeDump(
                    { stories, rules },
                    { skipInvalid: true },
                );
                payload.load_model_after = true;
                const trainingClient = await createAxiosForRasa(projectId,
                    {
                        timeout: process.env.TRAINING_TIMEOUT || 0,
                        responseType: 'stream',
                        maxContentLength: process.env.TRAINING_MAX_CONTENT_LEN || Infinity,
                        maxBodyLength: process.env.TRAINING_MAX_BODY_LEN || Infinity,
                    });

                addLoggingInterceptors(trainingClient, appMethodLogger);
                const trainingResponse = await trainingClient.post(
                    '/model/train',
                    payload,
                );
                if (trainingResponse.status === 200) {
                    const t1 = performance.now();
                    appMethodLogger.debug(
                        `Training project ${projectId} - ${(t1 - t0).toFixed(2)} ms`,
                    );

                    await postTraining(projectId, trainingResponse.data);

                    Activity.update(
                        { projectId, validated: true },
                        { $set: { validated: false } },
                        { multi: true },
                    ).exec();
                }

                Meteor.call('project.markTrainingStopped', projectId, 'success');
            } catch (e) {
                console.log(e); // eslint-disable-line no-console
                const error = `${e.message || e.reason} ${(
                    e.stack.split('\n')[2] || ''
                ).trim()}`;
                const t1 = performance.now();
                appMethodLogger.error(
                    `Training project ${projectId} - ${(t1 - t0).toFixed(2)} ms`,
                    { error },
                );
                Meteor.call('project.markTrainingStopped', projectId, 'failure', error);
                throw formatError(e);
            }
        },

        async 'rasa.getRasaTrainingPayload'(
            projectId,
            { language = '', env = 'development' } = {},
        ) {
            checkIfCan(['nlu-data:x', 'projects:r', 'export:x'], projectId);
            check(projectId, String);
            check(language, String);

            const { policies: corePolicies, augmentationFactor } = CorePolicies.findOne(
                { projectId },
                { policies: 1, augmentationFactor: 1 },
            );

            const {
                stories = [], rules = [], domain, wasPartial,
            } = await getFragmentsAndDomain(
                projectId,
                language,
                env,
            );
            const [processedStories, actionsParams] = processParametrizedActions(stories, {});
            const [processedRules, allActionsParams] = processParametrizedActions(rules, actionsParams);
            domain.actions_params = allActionsParams;
            processedStories.sort((a, b) => a.story.localeCompare(b.story));
            processedRules.sort((a, b) => a.rule.localeCompare(b.rule));
            const selectedIntents = wasPartial
                ? yaml.safeLoad(domain).intents
                : undefined;
            // NOTE removed multi language support
            console.log(`language: ${language}`);
            const {
                nlu,
                config,
            } = await getRasaNluDataAndConfig(projectId, language, selectedIntents);
            const payload = {
                domain: convertDomainBotfrontToRasa(domain),
                stories: processedStories,
                rules: processedRules,
                nlu,
                ...config,
                ...yaml.safeLoad(corePolicies),
                fixed_model_name: getProjectModelFileName(projectId),
                augmentation_factor: augmentationFactor,
            };
            auditLog('Retreived training payload for project', {
                user: Meteor.user(),
                type: 'execute',
                projectId,
                operation: 'nlu-model-execute',
                resId: projectId,
                resType: 'nlu-model',
            });
            return payload;
        },

        async 'rasa.train3'(projectId, env = 'development', language = '') {
            checkIfCan('nlu-data:x', projectId);
            check(projectId, String);
            auditLog('Trained project', {
                user: Meteor.user(),
                projectId,
                type: 'execute',
                operation: 'nlu-model-trained',
                resId: projectId,
                resType: 'nlu-model',
            });
            const appMethodLogger = getAppLoggerForMethod(
                trainingAppLogger,
                'rasa.train',
                Meteor.userId(),
                { projectId },
            );

            appMethodLogger.debug(`Training project ${projectId}...`);
            const t0 = performance.now();
            try {
                const { domain, ...payload } = await Meteor.call(
                    'rasa.getRasaTrainingPayload', projectId, { env, language },
                );
                const trainingClient = await createAxiosForRasa(projectId,
                    {
                        timeout: process.env.TRAINING_TIMEOUT || 0,
                        responseType: 'stream',
                        maxContentLength: process.env.TRAINING_MAX_CONTENT_LEN || Infinity,
                        maxBodyLength: process.env.TRAINING_MAX_BODY_LEN || Infinity,
                    });
                const yamlPayload = yaml.safeDump(
                    { ...domain, ...payload },
                    { sortKeys: true, skipInvalid: true },
                );
                console.log(yamlPayload);
                addLoggingInterceptors(trainingClient, appMethodLogger);
                const trainingResponse = await trainingClient.post(
                    '/model/train',
                    yamlPayload,
                );
                if (trainingResponse.status === 200) {
                    const t1 = performance.now();
                    appMethodLogger.debug(
                        `Training project ${projectId} - ${(t1 - t0).toFixed(2)} ms`,
                    );

                    await postTraining(projectId, trainingResponse.data);

                    Activity.update(
                        { projectId, validated: true },
                        { $set: { validated: false } },
                        { multi: true },
                    ).exec();
                }

                Meteor.call('project.markTrainingStopped', projectId, 'success');
            } catch (e) {
                console.log(e); // eslint-disable-line no-console
                const error = `${e.message || e.reason} ${(
                    e.stack.split('\n')[2] || ''
                ).trim()}`;
                const t1 = performance.now();
                appMethodLogger.error(
                    `Training project ${projectId} - ${(t1 - t0).toFixed(2)} ms`,
                    { error },
                );
                Meteor.call('project.markTrainingStopped', projectId, 'failure', error);
                throw formatError(e);
            }
        },

        async 'rasa.evaluate.nlu'(projectId, language, testData) {
            checkIfCan('nlu-data:x', projectId);
            check(projectId, String);
            check(language, String);
            check(testData, Match.Maybe(Object));
            auditLog('Evaluated nlu data', {
                user: Meteor.user(),
                projectId,
                type: 'execute',
                operation: 'nlu-model-evaluate',
                resId: projectId,
                resType: 'nlu-model',
            });
            const appMethodLogger = getAppLoggerForMethod(
                trainingAppLogger,
                'rasa.evaluate.nlu',
                Meteor.userId(),
                { projectId, language, testData },
            );
            try {
                this.unblock();
                const examples = testData || {
                    rasa_nlu_data: (await getNluDataAndConfig(projectId, language))
                        .rasa_nlu_data,
                };
                const client = await createAxiosForRasa(
                    projectId,
                    {
                        timeout: process.env.EVALUATION_TIMEOUT || 0,
                        maxContentLength: process.env.EVALUATION_MAX_CONTENT_LEN || Infinity,
                        maxBodyLength: process.env.EVALUATION_MAX_BODY_LEN || Infinity,
                    },
                    { language },
                );
                addLoggingInterceptors(client, appMethodLogger);
                axiosRetry(client, {
                    retries: 3,
                    retryDelay: axiosRetry.exponentialDelay,
                });
                let results = Promise.await(client.post('/model/test/intents', examples));

                results = replaceMongoReservedChars({
                    intent_evaluation: results.data.intent_evaluation || {},
                    entity_evaluation:
                        results.data.entity_evaluation.DIETClassifier || {},
                });

                const evaluations = Evaluations.findOne(
                    { projectId, language },
                    { field: { _id: 1 } },
                );
                if (evaluations) {
                    Evaluations.update({ _id: evaluations._id }, { $set: { results } });
                } else {
                    Evaluations.insert({ results, projectId, language });
                }
                return 'ok';
            } catch (e) {
                throw formatError(e);
            }
        },
        async 'externalTraining.train'(projectId, trainingHost) {
            checkIfCan('nlu-data:x', projectId);
            check(projectId, String);
            check(trainingHost, String);
            if (!trainingHostExists(projectId, trainingHost)) {
                getAppLoggerForMethod(
                    trainingAppLogger,
                    'externalTraining.train',
                    Meteor.userId(),
                    { projectId, trainingHost },
                ).error('Host not found');
                return;
            }
            await axios.post(`${trainingHost}/train/${projectId}`);
        },
        async 'externalTraining.cancel'(projectId, trainingHost) {
            checkIfCan('nlu-data:x', projectId);
            check(projectId, String);
            check(trainingHost, String);
            if (!trainingHostExists(projectId, trainingHost)) {
                getAppLoggerForMethod(
                    trainingAppLogger,
                    'externalTraining.cancel',
                    Meteor.userId(),
                    { projectId, trainingHost },
                ).error('Host not found');
                return;
            }
            await axios.post(`${trainingHost}/cancel/${projectId}`);
        },
    });
}
