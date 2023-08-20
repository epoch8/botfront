import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { BackupSchema } from './schema';
import { checkIfCan } from '../../lib/scopes';

export const Backups = new Mongo.Collection('backups');
// Deny all client-side updates on the Backup collection
Backups.deny({
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
        Backups.rawCollection().createIndex({ projectId: 1, createdAt: -1 });
    }
});

if (Meteor.isServer) {
    Meteor.publish('backups', function (projectId) {
        try {
            checkIfCan('projects:r', projectId);
        } catch (err) {
            return this.ready();
        }
        check(projectId, String);
        return Backups.find({ projectId }, { sort: { createdAt: -1 } });
    });
}

Backups.attachSchema(BackupSchema);
