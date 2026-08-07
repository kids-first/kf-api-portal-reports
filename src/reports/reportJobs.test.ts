import { MAX_CONCURRENT_REPORTS } from '../env';
import { peek, release, tryAcquire } from './reportJobs';

// every id any test in this file touches — released in afterEach so the singleton Map
// (and its global count) never leaks across tests
const ALL_IDS = ['u1', 'u2', ...Array.from({ length: MAX_CONCURRENT_REPORTS + 1 }, (_, i) => `cap-${i}`)];

describe('reportJobs registry', () => {
    afterEach(() => {
        ALL_IDS.forEach(release);
        jest.restoreAllMocks();
    });

    it('grants a slot to a new user (acquired) and exposes it via peek', () => {
        expect(tryAcquire('u1', 'clinical-data')).toBe('acquired');
        const job = peek('u1');
        expect(job?.reportType).toBe('clinical-data');
        expect(typeof job?.startedAt).toBe('number');
    });

    it('rejects a second concurrent report for the same user (user-busy)', () => {
        expect(tryAcquire('u1', 'clinical-data')).toBe('acquired');
        expect(tryAcquire('u1', 'file-manifest')).toBe('user-busy');
    });

    it('frees the slot on release, allowing a new report', () => {
        expect(tryAcquire('u1', 'clinical-data')).toBe('acquired');
        release('u1');
        expect(peek('u1')).toBeUndefined();
        expect(tryAcquire('u1', 'file-manifest')).toBe('acquired');
    });

    it('tracks users independently', () => {
        expect(tryAcquire('u1', 'clinical-data')).toBe('acquired');
        expect(tryAcquire('u2', 'clinical-data')).toBe('acquired');
        expect(peek('u2')?.reportType).toBe('clinical-data');
    });

    it('caps global concurrency across users (at-capacity), freed by release', () => {
        for (let i = 0; i < MAX_CONCURRENT_REPORTS; i += 1) {
            expect(tryAcquire(`cap-${i}`, 'clinical-data')).toBe('acquired');
        }
        // one past the cap, from a fresh user, is rejected as at-capacity (not user-busy)
        expect(tryAcquire(`cap-${MAX_CONCURRENT_REPORTS}`, 'clinical-data')).toBe('at-capacity');
        // freeing any slot lets the waiting user in
        release('cap-0');
        expect(tryAcquire(`cap-${MAX_CONCURRENT_REPORTS}`, 'clinical-data')).toBe('acquired');
    });

    it('evicts a stale slot past the max age so a user is never locked out', () => {
        const now = jest.spyOn(Date, 'now');
        now.mockReturnValue(0);
        expect(tryAcquire('u1', 'clinical-data')).toBe('acquired');

        now.mockReturnValue(16 * 60 * 1000); // > 15 min
        expect(peek('u1')).toBeUndefined(); // evicted on read
        expect(tryAcquire('u1', 'file-manifest')).toBe('acquired'); // and can start fresh
    });
});
