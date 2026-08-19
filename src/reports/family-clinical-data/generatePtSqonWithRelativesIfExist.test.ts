import { Client } from '@elastic/elasticsearch';

import { Sqon } from '../../utils/setsTypes';
import generatePtSqonWithRelativesIfExist, { extractAllFieldValues } from './generatePtSqonWithRelativesIfExist';

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

/** One composite-agg response page. `after` omitted => last page. */
const page = (keys: (string | null)[], after?: string) => ({
    body: {
        aggregations: {
            values: {
                buckets: keys.map((key) => ({ key: { families_id: key } })),
                ...(after ? { after_key: { families_id: after } } : {}),
            },
        },
    },
});

/** Feeds the given responses to successive calls, recording every request body. */
const queuedExecutor = (responses: object[]) => {
    const requests: any[] = [];
    const executor = async (q: object) => {
        requests.push(q);
        return responses[requests.length - 1] ?? page([]);
    };
    return { executor, requests };
};

describe('extractAllFieldValues', () => {
    test('collects distinct values from a single page', async () => {
        const { executor } = queuedExecutor([page(['F1', 'F2', 'F2'])]);
        expect(await extractAllFieldValues({}, 'families_id', executor)).toEqual(['F1', 'F2']);
    });

    test('pages past one response instead of truncating', async () => {
        const { executor, requests } = queuedExecutor([
            page(['F1', 'F2'], 'F2'),
            page(['F3', 'F4'], 'F4'),
            page([]), // exhausted
        ]);

        expect(await extractAllFieldValues({}, 'families_id', executor)).toEqual(['F1', 'F2', 'F3', 'F4']);
        expect(requests).toHaveLength(3);
        // first request must not carry `after`, later ones must resume from the previous key
        expect(requests[0].aggs.values.composite.after).toBeUndefined();
        expect(requests[1].aggs.values.composite.after).toEqual({ families_id: 'F2' });
        expect(requests[2].aggs.values.composite.after).toEqual({ families_id: 'F4' });
    });

    test('stops when a page comes back short of a full page but with no after_key', async () => {
        const { executor, requests } = queuedExecutor([page(['F1'])]);
        expect(await extractAllFieldValues({}, 'families_id', executor)).toEqual(['F1']);
        expect(requests).toHaveLength(1);
    });

    test('drops empty and null keys so they cannot widen a terms filter', async () => {
        const { executor } = queuedExecutor([page(['F1', '', null, 'F2'])]);
        expect(await extractAllFieldValues({}, 'families_id', executor)).toEqual(['F1', 'F2']);
    });

    test('requests a composite aggregation, never a size-capped terms one', async () => {
        const { executor, requests } = queuedExecutor([page(['F1'])]);
        await extractAllFieldValues({}, 'families_id', executor);
        expect(requests[0].aggs.values.composite).toBeDefined();
        expect(requests[0].aggs.values.terms).toBeUndefined();
    });
});

describe('Sqon generator for selected participants and their relatives', () => {
    const es = {} as Client;
    const selection: Sqon = {
        op: 'and',
        content: [{ op: 'in', content: { field: 'down_syndrome_status', value: ['T21'] } }],
    };

    beforeEach(() => {
        executeSearch.mockReset();
    });

    test('matches the selection OR anyone sharing one of its families', async () => {
        executeSearch.mockResolvedValueOnce(page(['F1', 'F2'], 'F2')).mockResolvedValueOnce(page([]));

        const result = await generatePtSqonWithRelativesIfExist(es, selection, 'participant_centric', 'token');

        expect(result).toEqual({
            op: 'or',
            content: [
                selection,
                {
                    op: 'in',
                    content: { field: 'families_id', value: ['F1', 'F2'] },
                },
            ],
        });
    });

    test('returns the selection untouched when nobody in it belongs to a family', async () => {
        executeSearch.mockResolvedValueOnce(page([]));

        const result = await generatePtSqonWithRelativesIfExist(es, selection, 'participant_centric', 'token');

        expect(result).toEqual(selection);
    });

    test('turns a missing sqon into a match-all group rather than emitting null', async () => {
        executeSearch.mockResolvedValueOnce(page([]));

        const result = await generatePtSqonWithRelativesIfExist(es, undefined as unknown as Sqon, 'p_centric', 'token');

        expect(result).toEqual({ op: 'and', content: [] });
    });

    test('never enumerates participant ids, so no cap can truncate the cohort', async () => {
        executeSearch.mockResolvedValueOnce(page(['F1'])); // single page, no after_key

        const result = await generatePtSqonWithRelativesIfExist(es, selection, 'participant_centric', 'token');

        // one aggregation pass total, and it aggregates families - not participants
        expect(executeSearch).toHaveBeenCalledTimes(1);
        const [, , request] = executeSearch.mock.calls[0];
        expect(request.aggs.values.composite.sources).toEqual([{ families_id: { terms: { field: 'families_id' } } }]);
        expect(JSON.stringify(result)).not.toContain('participant_id');
    });
});
