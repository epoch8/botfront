import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { ExternalTrainingSchema } from './schema';
import { checkIfCan } from '../../lib/scopes';

export const ExternalTrainings = new Mongo.Collection('externalTrainings');
// Deny all client-side updates on the ExternalTrainings collection
ExternalTrainings.deny({
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
        ExternalTrainings.rawCollection().createIndex({ projectId: 1, updatedAt: -1 });
        ExternalTrainings.rawCollection().createIndex({ projectId: 1, status: 1 });
    }
});

if (Meteor.isServer) {
    Meteor.publish('externalTrainings', function (projectId) {
        try {
            checkIfCan('nlu-data:r', projectId);
        } catch (err) {
            return this.ready();
        }
        check(projectId, String);
        return ExternalTrainings.find({ projectId }, { sort: { updatedAt: -1 } });
    });
    Meteor.publish('externalTrainingById', function (projectId, etId) {
        try {
            checkIfCan('nlu-data:r', projectId);
        } catch (err) {
            return this.ready();
        }
        check(projectId, String);
        check(etId, String);
        return ExternalTrainings.findOne({ _id: etId, projectId });
    });
}

ExternalTrainings.attachSchema(ExternalTrainingSchema);
