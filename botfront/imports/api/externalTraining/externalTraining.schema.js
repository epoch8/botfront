import SimpleSchema from 'simpl-schema';

import { validateYaml } from '../../lib/utils';

export const externalTrainingSchema = new SimpleSchema(
    {
        endpoints: {
            type: String,
            custom: validateYaml,
            optional: true,
        },
        environment: {
            type: String,
            optional: true,
        },
        projectId: { type: String },
        createdAt: {
            type: Date,
        },
        updatedAt: {
            type: Date,
            optional: true,
            autoValue: () => new Date(),
        },
        environment: { type: String, optional: true },
    },
    { tracker: Tracker },
);
