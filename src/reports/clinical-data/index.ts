/* eslint-disable no-console */
import { Request, Response } from 'express';

import EsInstance from '../../ElasticSearchClientInstance';
import { PROJECT } from '../../env';
import { reportGenerationErrorHandler } from '../../errors';
import { normalizeConfigs } from '../../utils/configUtils';
import generateReport from '../generateReport';
import { ProjectType } from '../types';
import configInclude from './configInclude';
import configKf from './configKf';
import configKfNext from './configKfNext';

const clinicalDataReport = async (req: Request, res: Response): Promise<void> => {
    console.time('clinical-data');
    const { sqon, projectId, filename = null, isKfNext = false } = req.body;
    const userId = req['kauth']?.grant?.access_token?.content?.sub;
    const accessToken = req.headers.authorization;

    const p = PROJECT.toLowerCase().trim();
    let reportConfig;
    if (isKfNext) {
        reportConfig = configKfNext;
    } else if (p === ProjectType.include) {
        reportConfig = configInclude;
    } else if (p === ProjectType.kidsFirst) {
        reportConfig = configKf;
    } else {
        console.warn('No reportConfig found.');
    }

    const esClient = EsInstance.getInstance();

    try {
        // decorate the configs with default values, values from arranger's project, etc...
        const normalizedConfigs = await normalizeConfigs(esClient, projectId, reportConfig);

        // Generate the report
        await generateReport(esClient, res, projectId, sqon, filename, normalizedConfigs, userId, accessToken);
    } catch (err) {
        reportGenerationErrorHandler(err);
    }

    console.timeEnd('clinical-data');
};

export default clinicalDataReport;
