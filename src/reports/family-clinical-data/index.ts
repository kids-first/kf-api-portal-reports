/* eslint-disable no-console */
import { Request, Response } from 'express';

import EsInstance from '../../ElasticSearchClientInstance';
import { reportGenerationErrorHandler } from '../../errors';
import generateStreamingReport from '../utils/generateStreamingReport';
import resolveProjectConfig from '../utils/resolveProjectConfig';
import configInclude from './configInclude';
import configKf from './configKf';
import generatePtSqonWithRelativesIfExist from './generatePtSqonWithRelativesIfExist';

const familyClinicalDataReport = async (req: Request, res: Response): Promise<void> => {
    console.time('family-clinical-data');

    const { sqon, filename = null } = req.body;
    const accessToken = req.headers.authorization;

    const reportConfig = resolveProjectConfig(configInclude, configKf);
    const esClient = EsInstance.getInstance();

    try {
        // expand the sqon to include every family member of the selected participants
        const participantsSqonWithRelatives = await generatePtSqonWithRelativesIfExist(
            esClient,
            sqon,
            reportConfig.queryConfigs.alias,
            accessToken,
        );

        // stream the report (self-normalizes from the raw reportConfig)
        await generateStreamingReport(
            esClient,
            res,
            participantsSqonWithRelatives,
            filename,
            reportConfig,
            accessToken,
        );
    } catch (err) {
        if (res.headersSent) {
            console.error('family-clinical-data report failed after streaming started', err);
        } else {
            reportGenerationErrorHandler(err);
        }
    }

    console.timeEnd('family-clinical-data');
};

export default familyClinicalDataReport;
