import SimpleSchema from 'simpl-schema';

export const InstanceSchema = new SimpleSchema(
    {
        name: { type: String, optional: true },
        host: { type: String, regEx: /^(http|https):\/\// },
        token: { type: String, optional: true },
        projectId: { type: String },
        externalTraining: { type: Array, optional: true, maxCount: 2 },
        'externalTraining.$': { type: Object },
        'externalTraining.$.name': { type: String },
        'externalTraining.$.host': { type: String, regEx: /^(http|https):\/\// },
        'externalTraining.$.image': { type: String, optional: true },
        'externalTraining.$.rasaExtraArgs': { type: String, optional: true },
        'externalTraining.$.node': { type: String, optional: true },
    },
    {
        clean: {
            filter: true,
            autoConvert: true,
            removeEmptyStrings: true,
            trimStrings: true,
            getAutoValues: true,
            removeNullsFromArrays: true,
        },
    },
);
