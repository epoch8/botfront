import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { Backup } from '../collection';
import { checkIfCan } from '../../../lib/scopes';
import { BACKUPS_PATH } from '../../../../server/config';
import { auditLog } from '../../../../server/logger';

Meteor.methods({
    /**
     * @param {string} projectId
     * @param {string?} comment
     * @returns {string}
     */
    async 'backup.create'(projectId, comment) {
        checkIfCan('export:x', projectId);
        check(projectId, String);
        check(comment, Match.Maybe(String));

        const { zipContainer } = await Meteor.callWithPromise(
            'exportRasa',
            projectId,
            'all',
            {
                noBlob: true,
            },
        );
        // zipContainer.remove('botfront');

        const backupTs = new Date();
        const backupPath = `${BACKUPS_PATH}/${backupTs.toISOString()}.zip`;

        auditLog('Writing backup', {
            user: Meteor.user(),
            projectId,
        });

        await pipeline(
            zipContainer.generateNodeStream({ streamFiles: true }),
            fs.createWriteStream(backupPath),
        );

        const backupId = Backup.insert({
            projectId,
            backupPath,
            comment,
            createdAt: backupTs,
        });

        auditLog('Backup created', {
            user: Meteor.user(),
            projectId,
        });

        return backupId;
    },

    /**
     * @param {string} projectId
     * @param {string} backupId
     * @returns {void}
     */
    async 'backup.checkout'(projectId, backupId) {
        checkIfCan('import:x', projectId);
        check(projectId, String);
        check(backupId, String);
    },
});
