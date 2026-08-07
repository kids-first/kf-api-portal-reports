/* eslint-disable no-console */
import { NextFunction, Request, Response } from 'express';

import { MAX_CONCURRENT_REPORTS } from '../env';
import { peek, release, tryAcquire } from './reportJobs';

// The Keycloak subject (stable per-user id). keycloak-connect is bearer-only and
// keycloak.protect() has already validated the token and populated req.kauth on these routes.
// keycloak-connect ships no types for req.kauth, hence the cast.
export const getUserId = (req: Request): string | undefined =>
    (req as unknown as { kauth?: { grant?: { access_token?: { content?: { sub?: string } } } } }).kauth?.grant
        ?.access_token?.content?.sub;

// Two guards on the heavy report routes:
//   - per-user: one in-flight report per user (409 report_in_progress),
//   - global: at most MAX_CONCURRENT_REPORTS across all users (429 reports_busy) — gentle on the
//     ES cluster shared with the portal.
// A slot is acquired on entry and released when the response finishes (success/error) or the
// client disconnects mid-download. The FE can wait and poll GET /reports/status either way.
const singleReportGuard = (req: Request, res: Response, next: NextFunction): void => {
    const userId = getUserId(req);
    if (!userId) {
        // No identifiable subject (shouldn't happen behind protect()); don't block generation.
        next();
        return;
    }

    const reportType = req.path.replace(/^\//, '') || 'report';
    const outcome = tryAcquire(userId, reportType);
    if (outcome === 'user-busy') {
        res.status(409).json({
            error: 'report_in_progress',
            message: 'A report is already being generated. Please wait for it to finish.',
            current: peek(userId),
        });
        return;
    }
    if (outcome === 'at-capacity') {
        console.warn(
            `[reports] concurrency cap hit: ${MAX_CONCURRENT_REPORTS} reports already running — ` +
                `rejected ${reportType} with 429 (protecting shared ES).`,
        );
        res.set('Retry-After', '30');
        res.status(429).json({
            error: 'reports_busy',
            message: 'The reporting service is at capacity. Please retry shortly.',
        });
        return;
    }

    let released = false;
    const done = (): void => {
        if (released) {
            return;
        }
        released = true;
        release(userId);
    };
    res.on('finish', done); // response fully sent (success or error)
    res.on('close', done); // client disconnected / socket destroyed mid-stream

    next();
};

export default singleReportGuard;
