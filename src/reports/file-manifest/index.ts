/* eslint-disable no-console */
import { Request, Response } from 'express';

import EsInstance from '../../ElasticSearchClientInstance';
import { PROJECT } from '../../env';
import { reportGenerationErrorHandler } from '../../errors';
import { ProjectType } from '../types';
import generateTsvReport from '../utils/generateTsvReport';
import getFamilyIds from '../utils/getFamilyIds';
import getFilesFromSqon from '../utils/getFilesFromSqon';
import getInfosByConfig from '../utils/getInfosByConfig';
import configInclude from './configInclude';
import configKf from './configKf';
import { esFileIndex } from '../../esVars';

const fileManifestReport = async (req: Request, res: Response): Promise<void> => {
    console.time('fileManifestReport');

    const { sqon, filename, projectId, withFamily = false } = req.body;
    const userId = req['kauth']?.grant?.access_token?.content?.sub;
    const accessToken = req.headers.authorization;

    let reportConfig;
    const p = PROJECT.toLowerCase().trim();
    if (p === ProjectType.include) {
        reportConfig = configInclude;
    } else {
        reportConfig = configKf;
    }

    const wantedFields = ['file_id'];

    const esClient = EsInstance.getInstance();

    try {
        const files = await getFilesFromSqon(
            esClient,
            reportConfig,
            projectId,
            sqon,
            userId,
            accessToken,
            wantedFields,
        );
        const fileIds = files?.map((f) => f.file_id);
        const newFileIds = withFamily ? await getFamilyIds(esClient, fileIds) : fileIds;
        const filesInfos = await getInfosByConfig(esClient, reportConfig, newFileIds, 'file_id', esFileIndex);

        const path = `/tmp/${filename}.tsv`;
        generateTsvReport(filesInfos, path, reportConfig);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}.tsv"`);
        res.sendFile(path);
    } catch (err) {
        reportGenerationErrorHandler(err);
    }

    console.timeEnd('fileManifestReport');
};

export default fileManifestReport;
