import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Mongo } from 'meteor/mongo';

import { checkIfCan } from '../../lib/scopes';
import { ModelSchema } from './model.schema';

export const Models = new Mongo.Collection('models');

// Deny all client-side updates on the Models collection
Models.deny({
    insert() { return true; },
    update() { return true; },
    remove() { return true; },
});

Meteor.startup(() => {
    if (Meteor.isServer) {
        Models.rawCollection().createIndex({ projectId: 1 });
    }
});

if (Meteor.isServer) {
    Meteor.publish('models', function (projectId) {
        check(projectId, String);
        checkIfCan('models:r', projectId);
        return Models.find({ projectId });
    });
}

Models.attachSchema(ModelSchema);
