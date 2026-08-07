import { Client } from '@elastic/elasticsearch';

import { getExtendedFromMapping } from '../../arranger/deriveExtendedFromMapping';
import { ES_QUERY_MAX_SIZE } from '../../env';
import { executeSearch } from '../../utils/esUtils';
import { Sqon } from '../../utils/setsTypes';
import buildEsQueryFromSqon from '../utils/buildEsQuery';

type Bucket = { key: string; count: number };
type AggregationIdsRequest = {
    [index: string]: any;
    query: object;
    body: {
        aggregations: {
            ids: {
                buckets: Bucket[];
            };
        };
    };
};
export const extractFieldAggregationIds = async (
    query: object,
    field: string,
    searchExecutor: (q: object) => Promise<AggregationIdsRequest>,
): Promise<string[]> => {
    const r = await searchExecutor({
        query,
        aggs: {
            ids: {
                terms: { field: field, size: ES_QUERY_MAX_SIZE },
            },
        },
    });
    const rawIds: string[] = (r.body?.aggregations?.ids?.buckets || []).map((bucket: Bucket) => bucket.key);
    return [...new Set(rawIds)];
};

export const mergeParticipantsWithoutDuplicates = (x: string[], y: string[]) => [...new Set([...x, ...y])];

// extract in a more general file when and if needed.
export const xIsSubsetOfY = (x: string[], y: string[]) => x.every((e: string) => y.includes(e));
// Expand `sqon` to include every family member: returns a `participant_id in [...]`
// sqon covering the selected participants plus all their relatives.
const generatePtSqonWithRelativesIfExist = async (
    es: Client,
    sqon: Sqon,
    alias: string,
    accessToken: string,
): Promise<Sqon> => {
    const extendedConfig = await getExtendedFromMapping(es, alias);
    const query = await buildEsQueryFromSqon(extendedConfig, sqon, accessToken);
    const searchExecutor = async (q: object) => await executeSearch(es, alias, q);

    const allSelectedParticipantsIds: string[] = await extractFieldAggregationIds(
        query,
        'participant_id',
        searchExecutor,
    );
    const allFamiliesIdsOfSelectedParticipants: string[] = await extractFieldAggregationIds(
        {
            bool: {
                must: [
                    {
                        terms: {
                            participant_id: allSelectedParticipantsIds,
                        },
                    },
                ],
            },
        },
        'families_id',
        searchExecutor,
    );
    const allRelativesIds: string[] = await extractFieldAggregationIds(
        {
            bool: {
                must: [
                    {
                        terms: {
                            families_id: allFamiliesIdsOfSelectedParticipants,
                        },
                    },
                ],
            },
        },
        'participant_id',
        searchExecutor,
    );
    const selectedParticipantsIdsPlusRelatives = mergeParticipantsWithoutDuplicates(
        allSelectedParticipantsIds,
        allRelativesIds,
    );

    console.assert(
        selectedParticipantsIdsPlusRelatives.length >= allSelectedParticipantsIds.length &&
            xIsSubsetOfY(allSelectedParticipantsIds, selectedParticipantsIdsPlusRelatives),
        `Family Report (sqon enhancer): The participants ids computed must be equal or greater than the selected participants.
         Moreover, selected participants must a subset of the computed ids.`,
    );

    return {
        op: 'and',
        content: [
            {
                op: 'in',
                content: {
                    field: 'participant_id',
                    value: selectedParticipantsIdsPlusRelatives,
                },
            },
        ],
    };
};

export default generatePtSqonWithRelativesIfExist;
