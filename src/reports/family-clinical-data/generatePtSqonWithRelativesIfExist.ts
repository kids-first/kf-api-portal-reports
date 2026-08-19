import { Client } from '@elastic/elasticsearch';

import { getExtendedFromMapping } from '../../arranger/deriveExtendedFromMapping';
import { executeSearch } from '../../utils/esUtils';
import { Sqon } from '../../utils/setsTypes';
import { resolveSetsInSqon } from '../../utils/sqonUtils';
import buildEsQueryFromSqon from '../utils/buildEsQuery';

const AGG_NAME = 'values';

// One keyword per bucket, so a big page is cheap; stays under `search.max_buckets` (65536).
const AGG_PAGE_SIZE = 10_000;

// Guards against a non-advancing `after_key`: 10M values, far above any cohort.
const MAX_AGG_PAGES = 1_000;

type CompositeKey = Record<string, string | number | boolean | null>;
type CompositeAggResponse = {
    body?: {
        aggregations?: Record<string, { buckets?: { key: CompositeKey }[]; after_key?: CompositeKey }>;
    };
};

/**
 * Every distinct non-empty value of `field` among the docs matching `query`, via a
 * `composite` aggregation paged through `after_key` — exhaustive, unlike `terms` with a
 * `size` that silently drops whatever falls past the cap (SJIP-1594).
 *
 * `field` must be top-level: a composite source under a `nested` mapping needs a nested
 * wrapper, and without one ES returns zero buckets rather than an error.
 */
export const extractAllFieldValues = async (
    query: object,
    field: string,
    searchExecutor: (q: object) => Promise<CompositeAggResponse>,
): Promise<string[]> => {
    const values = new Set<string>();
    let after: CompositeKey | undefined;

    for (let page = 0; page < MAX_AGG_PAGES; page += 1) {
        const r = await searchExecutor({
            query,
            aggs: {
                [AGG_NAME]: {
                    composite: {
                        size: AGG_PAGE_SIZE,
                        sources: [{ [field]: { terms: { field } } }],
                        ...(after ? { after } : {}),
                    },
                },
            },
        });

        const agg = r.body?.aggregations?.[AGG_NAME];
        const buckets = agg?.buckets || [];

        for (const bucket of buckets) {
            const value = bucket.key?.[field];
            // A '' key fed back into a `terms` filter would match every value-less doc;
            // tested explicitly rather than by truthiness so a real 0/false survives.
            if (value !== null && value !== undefined && value !== '') {
                values.add(String(value));
            }
        }

        // Stop only on an empty page — the one termination ES guarantees (`after_key` comes
        // back even on the last page, costing one extra empty request). Don't stop on a
        // short page instead: that's an assumption, and breaking it drops values silently.
        after = agg?.after_key;
        if (!after || buckets.length === 0) {
            return [...values];
        }
    }

    throw new Error(`extractAllFieldValues exceeded ${MAX_AGG_PAGES} pages on "${field}" (non-advancing after_key?)`);
};

/**
 * Expand `sqon` to cover every family member: matches the original selection OR anyone
 * sharing one of its families. Only families are enumerated, never participants, so no
 * per-request cap can truncate the cohort and the emitted terms list stays clear of
 * `index.max_terms_count` (65536).
 */
const generatePtSqonWithRelativesIfExist = async (
    es: Client,
    sqon: Sqon,
    alias: string,
    accessToken: string,
): Promise<Sqon> => {
    const extendedConfig = await getExtendedFromMapping(es, alias);

    // Resolve set_ids once here: the sqon we return is rebuilt into a query downstream. A
    // missing sqon becomes a match-all group, since `null` would crash the sqon consumers.
    const resolved = await resolveSetsInSqon(sqon, accessToken);
    const baseSqon: Sqon = resolved?.content ? resolved : { op: 'and', content: [] };

    const query = await buildEsQueryFromSqon(extendedConfig, baseSqon, accessToken);
    const searchExecutor = async (q: object) => await executeSearch(es, alias, q);

    const familyIds = await extractAllFieldValues(query, 'families_id', searchExecutor);

    // No families in the selection: it already is the report.
    if (familyIds.length === 0) {
        return baseSqon;
    }

    return {
        op: 'or',
        content: [
            baseSqon,
            {
                op: 'in',
                content: {
                    field: 'families_id',
                    value: familyIds,
                },
            },
        ],
    };
};

export default generatePtSqonWithRelativesIfExist;
