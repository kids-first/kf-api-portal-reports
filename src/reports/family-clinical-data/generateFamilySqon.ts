import get from 'lodash/get';
import { buildQuery } from '@arranger/middleware';

import { getExtendedConfigs, getNestedFields } from '../../utils/arrangerUtils';
import { executeSearch } from '../../utils/esUtils';
import { Client } from '@elastic/elasticsearch';
import { Sqon } from '../../utils/setsTypes';
import { resolveSetsInSqon } from '../../utils/sqonUtils';
import { ProjectType } from '../types';

/**
 * Generate a sqon from the family_id of all the participants in the given `sqon`.
 * @param {object} es - an `elasticsearch.Client` instance.
 * @param {string} projectId - the id of the arranger project.
 * @param {object} sqon - the sqon used to filter the results.
 * @param {object} normalizedConfigs - the normalized report configuration.
 * @param {string} userId - the user id.
 * @param {string} accessToken - the user access token.
 * @returns {object} - A sqon of all the `family_id`.
 */
export default async (
    es: Client,
    projectId: string,
    sqon: Sqon,
    normalizedConfigs,
    userId: string,
    accessToken: string,
    program: string,
): Promise<Sqon> => {
    const extendedConfig = await getExtendedConfigs(es, projectId, normalizedConfigs.indexName);
    const nestedFields = getNestedFields(extendedConfig);
    const newSqon = await resolveSetsInSqon(sqon, userId, accessToken);
    const query = buildQuery({ nestedFields, filters: newSqon });
    const field = program.toLowerCase() === ProjectType.include ? 'family.family_id' : 'family_id';
    const esRequest = {
        query,
        aggs: {
            family_id: {
                terms: { field, size: 100000 },
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
                    field,
                    value: familyIds,
                },
            },
        ],
    };
};
