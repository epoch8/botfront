import SimpleSchema from 'simpl-schema';

export const ModelSchema = new SimpleSchema({
    _id: { type: String },
    projectId: { type: String },
    name: { type: String },
    comment: { type: String },
    path: { type: String },
    deployed: { type: Boolean },
    createdAt: { type: Date },
});
