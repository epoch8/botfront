import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { BackupSchema } from './schema';
import { checkIfCan } from '../../lib/scopes';

export const Backup = new Mongo.Collection('backup');
// Deny all client-side updates on the ExternalTraining collection
Backup.deny({
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
        Backup.createIndex({ projectId: 1, createdAt: -1 });
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
        return Backup.find({ projectId }, { sort: { createdAt: -1 } });
    });
}

Backup.attachSchema(BackupSchema);
