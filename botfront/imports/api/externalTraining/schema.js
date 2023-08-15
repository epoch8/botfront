import SimpleSchema from 'simpl-schema';

export const ExternalTrainingSchema = new SimpleSchema({
    jobId: String,
    projectId: String,
    betUrl: String,
    status: {
        type: String,
        allowedValues: ['training', 'failed', 'success', 'cancelled'],
    },
    backupId: {
        type: String,
        optional: true,
    },
    logs: {
        type: String,
        optional: true,
    },
    createdAt: Date,
    updatedAt: {
        type: Date,
        optional: true,
        autoValue: () => new Date(),
    },
});
