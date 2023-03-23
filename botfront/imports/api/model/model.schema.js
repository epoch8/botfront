import SimpleSchema from 'simpl-schema';

export const ModelSchema = new SimpleSchema({
    _id: { type: String },
    projectId: { type: String },
    name: { type: String },
    comment: { type: String, required: false },
    path: { type: String },
    deployed: { type: Boolean },
    createdAt: { type: Date },
    deployedAt: { type: Date, required: false },
    deployedBy: { type: String, required: false },
});
