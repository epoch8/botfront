import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { checkIfCan } from '../../lib/scopes';
import { InstanceSchema } from './instances.schema';

export const Instances = new Mongo.Collection('nlu_instances');

Instances.deny({
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

if (Meteor.isServer) {
    import { auditLog } from '../../../server/logger';

    Instances._ensureIndex({ projectId: 1 });
    Meteor.publish('nlu_instances', function(projectId) {
        try {
            checkIfCan(['nlu-data:r', 'resources:r', 'responses:r'], projectId);
        } catch (err) {
            return this.ready();
        }
        check(projectId, String);
        return Instances.find({ projectId });
    });

    Meteor.methods({
        'instance.update'(item) {
            checkIfCan(['resources:w', 'import:x'], item.projectId);
            check(item, Object);
            try {
                const instanceBefore = Instances.findOne({ projectId: item.projectId });
                const result = Instances.update({ projectId: item.projectId }, { $set: item }, { upsert: true });
                const instanceAfter = Instances.findOne({ projectId: item.projectId });
                auditLog('Updated instance', {
                    user: Meteor.user(),
                    type: 'updated',
                    projectId: item.projectId,
                    operation: 'project-settings-updated',
                    resId: item.projectId,
                    before: { instance: instanceBefore },
                    after: { instance: item },
                    resType: 'project-settings',
                });
                return result;
            } catch (e) {
                throw new Meteor.Error('instance-update-failed', e.message);
            }
        },
    });
}

Instances.attachSchema(InstanceSchema);
