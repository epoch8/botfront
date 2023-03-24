import SimpleSchema from 'simpl-schema';

export const InstanceSchema = new SimpleSchema(
    {
        name: { type: String, optional: true },
        host: { type: String, regEx: /^(http|https):\/\// },
        token: { type: String, optional: true },
        hierHost: { type: String, regEx: /^(http|https):\/\//, optional: true },
        projectId: { type: String },
        externalTraining: { type: Array, optional: true },
        'externalTraining.$': { type: Object },
        'externalTraining.$.name': { type: String },
        'externalTraining.$.host': { type: String, regEx: /^(http|https):\/\// },
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
