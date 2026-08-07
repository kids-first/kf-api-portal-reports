// In-memory registry of in-flight reports, one entry per user. Backs the
// "one report at a time" per-user guard, a conservative global concurrency cap,
// and the GET /reports/status endpoint.
//
// Reports are synchronous (the HTTP request is held open for the whole generation),
// so "in flight" == "request open": we acquire on entry and release when the response
// finishes or the client disconnects. The Map's size therefore IS the current number of
// concurrent reports across all users.
//
// ASSUMPTION: single instance (or a sticky-session load balancer that pins a user to one
// instance). This Map is per-process, so with multiple unpinned replicas both guards are
// per-instance. If this service is scaled out, move this state to a shared store (e.g. Redis)
// behind the same functions.

import { MAX_CONCURRENT_REPORTS } from '../env';

export interface ReportJob {
    reportType: string;
    startedAt: number; // epoch ms
}

const jobs = new Map<string, ReportJob>();

// Safety net: if release() somehow never fires (e.g. a wedged request that never emits
// finish/close), evict stale entries so a user isn't locked out AND the global count stays
// accurate. Well above any real report duration.
const MAX_AGE_MS = 15 * 60 * 1000;

const sweepStale = (): void => {
    const now = Date.now();
    for (const [id, job] of jobs) {
        if (now - job.startedAt > MAX_AGE_MS) {
            jobs.delete(id);
        }
    }
};

export type AcquireResult = 'acquired' | 'user-busy' | 'at-capacity';

// Atomic (synchronous, no await) check-and-set. Single-threaded JS guarantees no interleaving
// between the checks and the set. Order matters: a user already running gets 'user-busy' (their
// own report, 409) rather than 'at-capacity' (service busy, 429).
export const tryAcquire = (userId: string, reportType: string): AcquireResult => {
    sweepStale();
    if (jobs.has(userId)) {
        return 'user-busy';
    }
    if (jobs.size >= MAX_CONCURRENT_REPORTS) {
        return 'at-capacity';
    }
    jobs.set(userId, { reportType, startedAt: Date.now() });
    return 'acquired';
};

export const release = (userId: string): void => {
    jobs.delete(userId);
};

export const peek = (userId: string): ReportJob | undefined => {
    sweepStale();
    return jobs.get(userId);
};
