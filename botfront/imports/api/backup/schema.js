import SimpleSchema from 'simpl-schema';

export const BackupSchema = new SimpleSchema({
    projectId: String,
    backupPath: String,
    comment: {
        type: String,
        optional: true,
    },
    createdAt: Date,
});
