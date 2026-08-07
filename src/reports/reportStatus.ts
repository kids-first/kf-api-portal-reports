import { Request, Response } from 'express';

import { peek } from './reportJobs';
import { getUserId } from './singleReportGuard';

// GET /reports/status — lets the FE know whether this user has a report generating.
// { processing: false } | { processing: true, reportType, startedAt, startedAtIso }
// startedAt: epoch ms (for computing elapsed); startedAtIso: ISO-8601 UTC (for display).
const reportStatus = (req: Request, res: Response): void => {
    const userId = getUserId(req);
    const job = userId ? peek(userId) : undefined;
    if (!job) {
        res.json({ processing: false });
        return;
    }
    res.json({
        processing: true,
        reportType: job.reportType,
        startedAt: job.startedAt,
        startedAtIso: new Date(job.startedAt).toISOString(),
    });
};

export default reportStatus;
