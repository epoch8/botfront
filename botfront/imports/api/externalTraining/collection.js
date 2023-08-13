import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { ExternalTrainingSchema } from './schema';
import { checkIfCan } from '../../lib/scopes';

export const ExternalTraining = new Mongo.Collection('externalTraining');
// Deny all client-side updates on the ExternalTraining collection
ExternalTraining.deny({
    insert() {
        return true;
    },
    update() {
        return true;
    },
    remove() {
        return true;
    },
});

Meteor.startup(() => {
    if (Meteor.isServer) {
        ExternalTraining.createIndex({ projectId: 1, updatedAt: -1 });
        ExternalTraining.createIndex({ jobId: 1 });
    }
});

if (Meteor.isServer) {
    Meteor.publish('externalTraining', function (projectId) {
        try {
            checkIfCan('projects:r', projectId);
        } catch (err) {
            return this.ready();
        }
        check(projectId, String);
        return ExternalTraining.find({ projectId }, { sort: { updatedAt: -1 } });
    });
}

ExternalTraining.attachSchema(ExternalTrainingSchema);
