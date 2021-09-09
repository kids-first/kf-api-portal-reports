import get from 'lodash/get';
import { buildQuery } from '@kfarranger/middleware';

import { getExtendedConfigs, getNestedFields } from '../../utils/arrangerUtils';
import { executeSearch } from '../../utils/esUtils';
import { Client } from '@elastic/elasticsearch';

/**
 * Generate a sqon from the family_id of all the participants in the given `sqon`.
 * @param {object} es - an `elasticsearch.Client` instance.
 * @param {string} projectId - the id of the arranger project.
 * @param {object} sqon - the sqon used to filter the results.
 * @param {object} normalizedConfigs - the normalized report configuration.
 * @returns {object} - A sqon of all the `family_id`.
 */
export default async (es: Client, projectId: string, sqon: object, normalizedConfigs): Promise<object> => {
    const extendedConfig = await getExtendedConfigs(es, projectId, normalizedConfigs.indexName);
    const nestedFields = getNestedFields(extendedConfig);
    const query = buildQuery({ nestedFields, filters: sqon });
    const esRequest = {
        query,
        aggs: {
            family_id: {
                terms: { field: 'family_id', size: 100000 },
            },
        },
    };
    const results = await executeSearch(es, normalizedConfigs.alias, esRequest);
    const buckets = get(results, 'body.aggregations.family_id.buckets', []);
    const familyIds = buckets.map(b => b.key);

    return {
        op: 'and',
        content: [
            {
                op: 'in',
                content: {
                    field: 'family_id',
                    value: familyIds,
                },
            },
        ],
    };
};
