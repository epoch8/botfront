import { importSteps } from './import.utils';
import { checkIfCan } from '../../../lib/scopes';
import { addMeteorUserToCall } from '../utils/index';

export default {
    Query: {
        projectGitHistory: async (_, args, context) => {
            const { cursor, pageSize, projectId } = args;
            const { commits, hasNextPage } = await addMeteorUserToCall(context.user, () => Meteor.callWithPromise('getHistoryOfCommits', projectId, {
                cursor,
                pageSize,
            }));
            return {
                commits,
                pageInfo: {
                    hasNextPage,
                    endCursor: commits.length ? commits[commits.length - 1]?.sha : '',
                },
            };
        },
        exportProject: async (_, args, context) => {
            const zipData = await addMeteorUserToCall(
                context.user,
                () => Meteor.callWithPromise('exportRasa', args.projectId, 'all', {}),
            );
            return {
                projectId: args.projectId,
                data: zipData,
            };
        },
    },
    Mutation: {
        async import(_, args, context) {
            const {
                files,
                onlyValidate,
                projectId,
                wipeInvolvedCollections,
                fallbackLang,
                wipeProject,
            } = args;
            checkIfCan('import:x', projectId, context.user._id);
            // files is a list of promises as the files get uploaded to the server
            const filesData = await Promise.all(files);
            // allows Meteor.userId to be called down the stack
            // https://forums.meteor.com/t/meteor-userid-when-running-async-jobs/39822
            return addMeteorUserToCall(context.user, () => importSteps({
                projectId,
                files: filesData,
                onlyValidate,
                fallbackLang,
                wipeInvolvedCollections,
                wipeProject,
            }));
        },
    },
    ImportReport: {
        fileMessages: parent => parent.fileMessages,
        summary: parent => parent.summary,
    },
    ImportSummaryEntry: {
        text: parent => parent.text,
        longText: parent => parent.longText,
    },
    FileMessage: {
        errors: parent => parent.errors,
        warnings: parent => parent.warnings,
        info: parent => parent.info,
        filename: parent => parent.filename,
        conflicts: parent => parent.conflicts,
    },
};
