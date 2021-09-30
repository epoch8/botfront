
/**
 * @param {string} rawText
 * @returns {object}
 */
export function readNluFromCsv(rawText) {
    const commonExamples = [];
    rawText.split('\n').forEach((row) => {
        const cols = row.split(';');
        if (cols.length !== 2) return;

        const intentName = cols[0].trim();
        let example = cols[1].trim();
        if (!intentName || !example) return;

        const entities = [];
        while (true) {
            const match = example.match(/\[(.+?)\]\((.+?)\)/);
            if (!match) break;
            const substr = match[0];
            const entityValue = match[1];
            const entityName = match[2];
            example = example.replace(substr, entityValue);
            entities.push({
                start: match.index,
                end: match.index + entityValue.length,
                value: entityValue,
                entity: entityName,
            });
        }

        commonExamples.push({
            text: example,
            intent: intentName,
            entities,
        });
    });

    return { rasa_nlu_data: { common_examples: commonExamples } };
}
