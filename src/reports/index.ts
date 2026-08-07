import express from 'express';

import { tryCatchNext } from '../errors';
import biospecimenDataReport from './biospecimen-data';
import biospecimenRequest from './biospecimen-request';
import biospecimenRequestStats from './biospecimen-request/biospecimenRequestStats';
import clinicalDataReport from './clinical-data';
import familyClinicalDataReport from './family-clinical-data';
import fileManifestReport from './file-manifest';
import fileManifestStats from './file-manifest/fileManifestStats';
import reportStatus from './reportStatus';
import singleReportGuard from './singleReportGuard';

export default () => {
    const router = express.Router();

    // Lets the FE poll whether this user already has a report generating.
    router.get('/status', reportStatus);

    // Heavy report generators: one in-flight per user (singleReportGuard -> 409 if busy).
    router.post('/clinical-data', singleReportGuard, tryCatchNext(clinicalDataReport));
    router.post('/family-clinical-data', singleReportGuard, tryCatchNext(familyClinicalDataReport));
    router.post('/biospecimen-data', singleReportGuard, tryCatchNext(biospecimenDataReport));
    router.post('/biospecimen-request', singleReportGuard, tryCatchNext(biospecimenRequest));
    router.post('/file-manifest', singleReportGuard, tryCatchNext(fileManifestReport));

    // Light stats endpoints: not guarded (cheap, and used to size a report before running it).
    router.post('/biospecimen-request/stats', tryCatchNext(biospecimenRequestStats));
    router.post('/file-manifest/stats', tryCatchNext(fileManifestStats));
    return router;
};
