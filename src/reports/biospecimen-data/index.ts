/* eslint-disable no-console */
import { Request, Response } from 'express';

import EsInstance from '../../ElasticSearchClientInstance';
import { reportGenerationErrorHandler } from '../../errors';
import generateStreamingReport from '../utils/generateStreamingReport';
import resolveProjectConfig from '../utils/resolveProjectConfig';
import configInclude from './configInclude';
import configKf from './configKf';

const biospecimenDataReport = async (req: Request, res: Response): Promise<void> => {
    console.time('biospecimen-data');

    const { sqon, filename = null } = req.body;
    const accessToken = req.headers.authorization;

    const reportConfig = resolveProjectConfig(configInclude, configKf);
    const esClient = EsInstance.getInstance();

    try {
        // stream the report (self-normalizes from the raw reportConfig)
        await generateStreamingReport(esClient, res, sqon, filename, reportConfig, accessToken);
    } catch (err) {
        if (res.headersSent) {
            console.error('biospecimen-data report failed after streaming started', err);
        } else {
            reportGenerationErrorHandler(err);
        }
    }

    console.timeEnd('biospecimen-data');
};

export default biospecimenDataReport;
