/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextFunction, Request, Response } from 'express';

import { MAX_CONCURRENT_REPORTS } from '../env';
import { release } from './reportJobs';
import reportStatus from './reportStatus';
import singleReportGuard, { getUserId } from './singleReportGuard';

const makeReq = (sub?: string, path = '/clinical-data'): Request =>
    ({ path, kauth: sub ? { grant: { access_token: { content: { sub } } } } : undefined }) as unknown as Request;

// Minimal res mock: captures 'finish'/'close' handlers so a test can fire them.
const makeRes = (): { res: Response; emit: (event: string) => void } => {
    const handlers: Record<string, () => void> = {};
    const res: any = {};
    res.statusCode = 200;
    res.status = jest.fn((code: number) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn(() => res);
    res.set = jest.fn(() => res);
    res.on = jest.fn((event: string, cb: () => void) => {
        handlers[event] = cb;
        return res;
    });
    return { res: res as Response, emit: (event: string) => handlers[event]?.() };
};

const CAP_IDS = Array.from({ length: MAX_CONCURRENT_REPORTS + 1 }, (_, i) => `cap-${i}`);

describe('singleReportGuard', () => {
    afterEach(() => ['user-A', 'user-B', ...CAP_IDS].forEach(release));

    it('lets the first report through (next called, no 409)', () => {
        const { res } = makeRes();
        const next = jest.fn() as NextFunction;
        singleReportGuard(makeReq('user-A'), res, next);
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('blocks a concurrent report with 409 and does not call next', () => {
        singleReportGuard(makeReq('user-A'), makeRes().res, jest.fn());

        const { res } = makeRes();
        const next2 = jest.fn() as NextFunction;
        singleReportGuard(makeReq('user-A', '/file-manifest'), res, next2);

        expect(res.status).toHaveBeenCalledWith(409);
        expect((res.json as jest.Mock).mock.calls[0][0]).toMatchObject({ error: 'report_in_progress' });
        expect(next2).not.toHaveBeenCalled();
    });

    it('releases the slot when the response finishes', () => {
        const first = makeRes();
        singleReportGuard(makeReq('user-A'), first.res, jest.fn());
        first.emit('finish');

        const { res } = makeRes();
        const next2 = jest.fn() as NextFunction;
        singleReportGuard(makeReq('user-A'), res, next2);
        expect(next2).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('releases the slot on client disconnect (close)', () => {
        const first = makeRes();
        singleReportGuard(makeReq('user-A'), first.res, jest.fn());
        first.emit('close');

        const next2 = jest.fn() as NextFunction;
        singleReportGuard(makeReq('user-A'), makeRes().res, next2);
        expect(next2).toHaveBeenCalledTimes(1);
    });

    it('returns 429 (reports_busy) once the global concurrency cap is reached', () => {
        // fill the cap with distinct users
        for (let i = 0; i < MAX_CONCURRENT_REPORTS; i += 1) {
            singleReportGuard(makeReq(`cap-${i}`), makeRes().res, jest.fn());
        }
        const { res } = makeRes();
        const next = jest.fn() as NextFunction;
        singleReportGuard(makeReq(`cap-${MAX_CONCURRENT_REPORTS}`), res, next);

        expect(res.status).toHaveBeenCalledWith(429);
        expect((res.json as jest.Mock).mock.calls[0][0]).toMatchObject({ error: 'reports_busy' });
        expect(next).not.toHaveBeenCalled();
    });

    it('does not block different users', () => {
        singleReportGuard(makeReq('user-A'), makeRes().res, jest.fn());
        const { res } = makeRes();
        const nextB = jest.fn() as NextFunction;
        singleReportGuard(makeReq('user-B'), res, nextB);
        expect(nextB).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('passes through when there is no user subject', () => {
        const { res } = makeRes();
        const next = jest.fn() as NextFunction;
        singleReportGuard(makeReq(undefined), res, next);
        expect(next).toHaveBeenCalledTimes(1);
    });
});

describe('getUserId', () => {
    it('extracts the keycloak sub', () => expect(getUserId(makeReq('abc'))).toBe('abc'));
    it('returns undefined without a token', () => expect(getUserId(makeReq(undefined))).toBeUndefined());
});

describe('reportStatus', () => {
    afterEach(() => release('user-A'));

    it('reports not processing when idle', () => {
        const { res } = makeRes();
        reportStatus(makeReq('user-A'), res);
        expect((res.json as jest.Mock).mock.calls[0][0]).toEqual({ processing: false });
    });

    it('reports processing with details when a report is running', () => {
        singleReportGuard(makeReq('user-A'), makeRes().res, jest.fn()); // acquire a slot
        const { res } = makeRes();
        reportStatus(makeReq('user-A'), res);
        const body = (res.json as jest.Mock).mock.calls[0][0];
        expect(body).toMatchObject({ processing: true, reportType: 'clinical-data' });
        expect(typeof body.startedAt).toBe('number');
        // ISO-8601 UTC, and round-trips back to the epoch startedAt
        expect(body.startedAtIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(new Date(body.startedAtIso).getTime()).toBe(body.startedAt);
    });
});
