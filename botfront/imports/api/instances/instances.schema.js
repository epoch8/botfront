import SimpleSchema from 'simpl-schema';

export const InstanceSchema = new SimpleSchema(
    {
        name: { type: String, optional: true },
        host: { type: String, regEx: /^(http|https):\/\// },
        token: { type: String, optional: true },
        hierHost: { type: String, regEx: /^(http|https):\/\//, optional: true },
        projectId: { type: String },
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
