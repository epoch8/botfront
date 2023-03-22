import fs from 'fs';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { checkIfCan } from '../../lib/scopes';
import { Models } from './model.collection';


Meteor.methods({
    async 'model.updateComment'(projectId, modelId, comment) {
        checkIfCan('models:c', projectId);
        check(projectId, String);
        check(modelId, String);
        check(comment, String);

        Models.update({ _id: modelId, projectId }, { $set: { comment } });
    },
});
