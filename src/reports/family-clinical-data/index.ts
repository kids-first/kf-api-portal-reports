import { Client } from '@elastic/elasticsearch';
import { Request, Response } from 'express';
import generateReport from '../generateReport';
import reportConfig from './config';
import { normalizeConfigs } from '../../utils/configUtils';

import generateFamilySqon from './generateFamilySqon';
import { reportGenerationErrorHandler } from '../../errors';

const clinicalDataReport = (esHost: string) => async (req: Request, res: Response) => {
    console.time('family-clinical-data');

    const { sqon, projectId, filename = null } = req.body;
    console.log('projectId:', projectId);
    console.log('sqon:', JSON.stringify(sqon, null, 2));
    console.log('filename:', filename);

    let es = null;
    try {
        // prepare the ES client
        es = new Client({ node: esHost });

        // decorate the configs with default values, values from arranger's project, etc...
        const normalizedConfigs = await normalizeConfigs(es, projectId, reportConfig);

        // generate a new sqon containing the id of all family members for the current sqon
        const familySqon = await generateFamilySqon(es, projectId, sqon, normalizedConfigs);

        // Generate the report
        await generateReport(es, res, projectId, familySqon, filename, normalizedConfigs);
        es.close();
    } catch (err) {
        reportGenerationErrorHandler(err, es);
    }

    console.timeEnd('family-clinical-data');
};

export default clinicalDataReport;
