/**
 * SJIP-1594: expanding a cohort to its families must not lose participants.
 *
 * Assertions only ask which participants the returned sqon covers, never its shape, so the
 * same test runs against the old and fixed implementations. The fake index is single-shard:
 * it reproduces the truncation (10000 of 13500) but not QA's exact 10284, which needs
 * per-shard pruning to make the two capped id lists differ.
 */
import { Client } from '@elastic/elasticsearch';

import { Sqon } from '../../utils/setsTypes';
import generatePtSqonWithRelativesIfExist from './generatePtSqonWithRelativesIfExist';

jest.mock('../../arranger/deriveExtendedFromMapping', () => ({
    getExtendedFromMapping: jest.fn(async () => []),
}));

jest.mock('../../utils/sqonUtils', () => ({
    resolveSetsInSqon: jest.fn(async (sqon: Sqon) => sqon),
}));

jest.mock('../../utils/esUtils', () => ({
    executeSearch: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { executeSearch } = require('../../utils/esUtils');

type Doc = { participant_id: string; families_id: string; is_proband: string };

const pad = (n: number) => `${n}`.padStart(5, '0');

/**
 * 4500 trio families, 13500 participants, with members scattered across the participant_id
 * sort order (as in real data) so the truncation doesn't hinge on ids sorting together.
 */
const buildCohort = (): Doc[] => {
    const docs: Doc[] = [];
    for (let family = 0; family < 4500; family += 1) {
        const familyId = `FAM${pad(family)}`;
        // proband, then two relatives 4500 and 9000 slots further down the id order
        [family + 1, family + 4501, family + 9001].forEach((n, memberIndex) => {
            docs.push({
                participant_id: `P${pad(n)}`,
                families_id: familyId,
                is_proband: memberIndex === 0 ? 'true' : 'false',
            });
        });
    }
    return docs;
};

const COHORT = buildCohort();

/** Docs matching a `bool.must` of `terms` clauses. Empty must => match all. */
const matchDocs = (docs: Doc[], query: any): Doc[] => {
    const must = query?.bool?.must ?? [];
    return docs.filter((doc) =>
        must.every((clause: any) => {
            const [field, values] = Object.entries(clause.terms).find(([key]) => key !== 'boost') as [string, string[]];
            return values.includes(doc[field]);
        }),
    );
};

/**
 * Minimal ES stand-in: a `terms` agg truncated to its `size` (count desc, key asc, ES's
 * default order) and a `composite` agg paged through `after_key`.
 */
const fakeEs = (docs: Doc[]) => async (_es: unknown, _alias: string, body: any) => {
    const matched = matchDocs(docs, body.query);

    const termsAgg = body.aggs?.ids?.terms;
    if (termsAgg) {
        const counts = new Map<string, number>();
        for (const doc of matched) {
            const key = doc[termsAgg.field];
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        const buckets = [...counts.entries()]
            .sort(([keyA, countA], [keyB, countB]) => countB - countA || keyA.localeCompare(keyB))
            .slice(0, termsAgg.size) // the cap under test
            .map(([key, count]) => ({ key, count }));
        return { body: { aggregations: { ids: { buckets } } } };
    }

    const composite = body.aggs?.values?.composite;
    if (composite) {
        const field = Object.keys(composite.sources[0])[0];
        const after = composite.after?.[field];
        const keys = [...new Set(matched.map((doc) => doc[field]))]
            .sort()
            .filter((key) => !after || key > after)
            .slice(0, composite.size);
        return {
            body: {
                aggregations: {
                    values: {
                        buckets: keys.map((key) => ({ key: { [field]: key } })),
                        ...(keys.length > 0 ? { after_key: { [field]: keys[keys.length - 1] } } : {}),
                    },
                },
            },
        };
    }

    throw new Error(`fakeEs got an unexpected request: ${JSON.stringify(body)}`);
};

/** Participants a returned sqon actually covers — the only thing the report cares about. */
const coverageOf = (sqon: Sqon, docs: Doc[]): Set<string> => {
    if (Array.isArray(sqon.content)) {
        const children = sqon.content as Sqon[];
        if (children.length === 0) {
            return new Set(docs.map((doc) => doc.participant_id)); // match all
        }
        const sets = children.map((child) => coverageOf(child, docs));
        return sqon.op === 'or'
            ? new Set(sets.flatMap((set) => [...set]))
            : sets.reduce((acc, set) => new Set([...acc].filter((id) => set.has(id))));
    }

    const { field, value } = sqon.content as { field: string; value: string[] };
    return new Set(docs.filter((doc) => value.includes(doc[field])).map((doc) => doc.participant_id));
};

const expand = async (selection: Sqon): Promise<Set<string>> => {
    executeSearch.mockImplementation(fakeEs(COHORT));
    const expanded = await generatePtSqonWithRelativesIfExist(
        {} as Client,
        selection,
        'participant_centric',
        'access-token',
    );
    return coverageOf(expanded, COHORT);
};

describe('SJIP-1594 — family expansion must not drop participants', () => {
    beforeEach(() => {
        executeSearch.mockReset();
    });

    test('the whole pool of 13500 participants expands to all 13500', async () => {
        // QA's case: no filter at all, so the selection already is every participant.
        const covered = await expand({ op: 'and', content: [] });

        expect(covered.size).toBe(COHORT.length);
    });

    test('a proband-only selection expands to every relative, past the 10k mark', async () => {
        // 4500 probands whose families pull in 9000 relatives => 13500 total.
        const covered = await expand({
            op: 'and',
            content: [{ op: 'in', content: { field: 'is_proband', value: ['true'] } }],
        });

        expect(covered.size).toBe(COHORT.length);
    });

    test('every originally selected participant survives the expansion', async () => {
        const selection: Sqon = {
            op: 'and',
            content: [{ op: 'in', content: { field: 'is_proband', value: ['true'] } }],
        };
        const probands = COHORT.filter((doc) => doc.is_proband === 'true').map((doc) => doc.participant_id);

        const covered = await expand(selection);

        expect(probands.filter((id) => !covered.has(id))).toEqual([]);
    });
});
