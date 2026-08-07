/* eslint-disable no-console */
import { Request, Response } from 'express';

import EsInstance from '../../ElasticSearchClientInstance';
import { reportGenerationErrorHandler } from '../../errors';
import generateStreamingReport from '../utils/generateStreamingReport';
import resolveProjectConfig from '../utils/resolveProjectConfig';
import configInclude from './configInclude';
import configKf from './configKf';

const clinicalDataReport = async (req: Request, res: Response): Promise<void> => {
    console.time('clinical-data');
    const { sqon, filename = null } = req.body;
    const accessToken = req.headers.authorization;

    const reportConfig = resolveProjectConfig(configInclude, configKf);
    const esClient = EsInstance.getInstance();

    try {
        // Streaming generator; normalizes configs from the index _mapping internally (no projectId).
        await generateStreamingReport(esClient, res, sqon, filename, reportConfig, accessToken);
    } catch (err) {
        // Only pre-stream failures reach here; mid-stream the generator aborts the socket itself.
        if (res.headersSent) {
            console.error('clinical-data report failed after streaming started', err);
        } else {
            reportGenerationErrorHandler(err);
        }
    }

    console.timeEnd('clinical-data');
};

export default clinicalDataReport;
