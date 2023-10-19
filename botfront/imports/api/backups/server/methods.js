import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import fs from 'fs';
import { Backups } from '../collection';
import { checkIfCan } from '../../../lib/scopes';
import { BACKUPS_PATH } from '../../../../server/config';
import { auditLog } from '../../../../server/logger';
import { importSteps } from '../../graphql/project/import.utils';

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

        const zipContainer = await Meteor.callWithPromise(
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

        await new Promise((resolve, reject) => {
            zipContainer
                .generateNodeStream({ streamFiles: true })
                .pipe(fs.createWriteStream(backupPath))
                .on('finish', resolve)
                .on('error', reject);
        });

        const backupId = Backups.insert({
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
     * @returns {Promise<{summary, fileMessages?, params?}>}
     */
    async 'backup.checkout'(projectId, backupId) {
        checkIfCan('import:x', projectId);
        check(projectId, String);
        check(backupId, String);

        const backup = Backups.findOne({ _id: backupId, projectId });
        if (!backup) {
            throw new Meteor.Error(404, 'Backup not found');
        }
        const backupStream = fs.createReadStream(backup.backupPath);
        return await importSteps({
            projectId,
            files: [{ filename: backup.backupPath, stream: backupStream }],
            wipeInvolvedCollections: true,
        });
    },
});
