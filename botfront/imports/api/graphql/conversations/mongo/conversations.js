import Conversations from '../conversations.model.js';

const createSortObject = (sort) => {
    let fieldName;
    let order;
    const sortObject = { };
    switch (sort) {
    case 'updatedAt_ASC':
        fieldName = 'updatedAt';
        order = 1;
        break;
    case 'updatedAt_DESC':
        fieldName = 'updatedAt';
        order = -1;
        break;
    default:
        return null;
    }
    sortObject[fieldName] = order;
    return sortObject;
};


const getComparaisonSymbol = (comparaisonString) => {
    let compare = {};
    switch (comparaisonString) {
    case 'greaterThan': compare = { mongo: '$gt', math: '>' };
        break;
    case 'lessThan': compare = { mongo: '$lt', math: '<' };
        break;
    case 'equals': compare = { mongo: '$eq', math: '===' };
        break;
    default:
        throw new Error(`Comparaison with ${comparaisonString} not supported`);
    }
    return compare;
};


const createFilterObject = (
    projectId,
    status = [],
    env = 'development',
    confidenceFilter,
    xThanConfidence,
    actionFilters,
    startDate,
    endDate,
    timeZoneHoursOffset,
) => {
    const filters = { projectId };
    if (status.length > 0) filters.status = { $in: status };
    if (env) filters.env = env;
    if (env === 'development') {
        filters.env = { $in: ['development', null] };
    }
    if (xThanConfidence && confidenceFilter > 0) {
        const { mongo } = getComparaisonSymbol(xThanConfidence);
        filters.$or = [{
            $and: [
                { 'tracker.events.parse_data.intent': { $exists: true } },
                { 'tracker.events.parse_data.intent.confidence': { [mongo]: confidenceFilter } }],
        },
        {
            $and: [
                { 'tracker.events.confidence': { $exists: true } },
                { 'tracker.events.confidence': { [mongo]: confidenceFilter } }],
        }];
    }
    if (actionFilters && actionFilters.length > 0) {
        filters['tracker.events.event'] = 'action';
        filters['tracker.events.name'] = { $in: actionFilters };
    }
    if (startDate && endDate && timeZoneHoursOffset) {
        const offsetedStart = new Date(startDate);
        offsetedStart.setTime(offsetedStart.getTime() + (timeZoneHoursOffset * 60 * 60 * 1000));
        const offsetedEnd = new Date(endDate);
        offsetedEnd.setTime(offsetedEnd.getTime() + (timeZoneHoursOffset * 60 * 60 * 1000));
        offsetedEnd.setDate(offsetedEnd.getDate() + 1); // add day as we want to include the whole day of end date
        filters.$and = [
            {
                $or: [
                    { createdAt: { $lte: offsetedStart } },
                    { createdAt: { $lte: offsetedEnd } },
                ],
            },
            {
                $or: [
                    { updatedAt: { $gte: offsetedStart } },
                    { updatedAt: { $gte: offsetedEnd } },
                ],
            },
        ];
    }
    return filters;
};


export const getConversations = async (
    projectId,
    page = 1,
    pageSize = 20,
    status = [],
    sort = null,
    env = 'development',
    lengthFilter = null,
    xThanLength = null,
    confidenceFilter = null,
    xThanConfidence = null,
    actionFilters = null,
    startDate = null,
    endDate = null,
    timeZoneHoursOffset = null) => {
    const filtersObject = createFilterObject(
        projectId,
        status,
        env,
        confidenceFilter,
        xThanConfidence,
        actionFilters,
        startDate,
        endDate,
        timeZoneHoursOffset,
    );
    const sortObject = createSortObject(sort);
    

    let lengthFilterStages = [];
    if (xThanLength && lengthFilter > 0) {
        const compareSymbol = getComparaisonSymbol(xThanLength);
        lengthFilterStages = [{
            $addFields:
            {
                convLen:
                {
                    [compareSymbol.mongo]: [{
                        $size: {
                            $filter: {
                                input: '$tracker.events',
                                as: 'event',
                                cond: { $eq: ['$$event.event', 'user'] },
                            },
                        },
                    }, lengthFilter],
                },
            },
        },
        {
            $match: { convLen: true },
        }];
    }

    const aggregation = [
        {
            $match: { ...filtersObject },
        },
        ...lengthFilterStages,
        {
            $sort: sortObject,
        },
        {
            $facet: {
                conversations: [
                    {
                        $skip: (page - 1) * pageSize,
                    },
                    {
                        $limit: pageSize,
                    }],
                pages: [
                    {
                        $count: 'numberOfDocuments',
                    },
                ],
            },
        },
    ];
    
    const paginatedResults = Conversations.aggregate(aggregation);

    return ({
        conversation: paginatedResults.conversations,
        pages: paginatedResults.pages.numberOfDocument / pageSize,
    });
};


export const getConversation = async (projectId, id) => (Conversations.findOne(
    {
        projectId,
        _id: id,
    },
).lean());

export const updateConversationStatus = async (id, status) => (
    Conversations.updateOne({ _id: id }, { $set: { status } }).exec()
);

export const deleteConversation = async id => (
    Conversations.deleteOne({ _id: id }).exec()
);
