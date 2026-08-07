import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import JSZip from 'jszip';

import EsInstance from '../../ElasticSearchClientInstance';
import { reportGenerationErrorHandler } from '../../errors';
import { normalizeConfigs } from '../../utils/configUtils';
import { formatCompactStamp, getUTCDate } from '../../utils/dateUtils';
import ExtendedReportConfigs from '../../utils/extendedReportConfigs';
import { createSet } from '../../utils/userClient';
import resolveProjectConfig from '../utils/resolveProjectConfig';
import configInclude from './configInclude';
import configKf from './configKf';
import generateFiles from './generateBiospecimenRequestFiles';

const biospecimenRequest = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    console.time('biospecimenRequest');

    const { sqon, biospecimenRequestName } = req.body;
    const accessToken = req.headers.authorization;

    const esClient = EsInstance.getInstance();
    const bioRequestConfig = resolveProjectConfig(configInclude, configKf);

    try {
        await createSet(accessToken, sqon, biospecimenRequestName);

        // decorate the configs with the extended config derived from the index _mapping
        const normalizedConfigs: ExtendedReportConfigs = await normalizeConfigs(
            esClient,
            bioRequestConfig.reportConfig,
        );

        const nowUTC = getUTCDate();
        const filenameZip = generateFileName('zip', nowUTC, bioRequestConfig.fileNamePrefix, '');
        const pathFileZip = `/tmp/${filenameZip}`;

        const filenameXlsx = generateFileName('xlsx', nowUTC, bioRequestConfig.fileNamePrefix, '');
        const pathFileXlsx = `/tmp/${filenameXlsx}`;

        const filenameTxt = generateFileName('txt', nowUTC, bioRequestConfig.fileNamePrefix, 'README_');
        const pathFileTxt = `/tmp/${filenameTxt}`;

        // Generate the files
        await generateFiles(
            esClient,
            sqon,
            pathFileXlsx,
            pathFileTxt,
            normalizedConfigs,
            accessToken,
            bioRequestConfig,
        );

        // Create the zip archive
        const zip = new JSZip();

        // Add the excel file in the archive
        const filenameXlsxData = fs.readFileSync(pathFileXlsx);
        zip.file(`${filenameXlsx}`, filenameXlsxData);

        // Add README in the archive
        const filenameTxtData = fs.readFileSync(pathFileTxt);
        zip.file(`${filenameTxt}`, filenameTxtData);

        zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
            .pipe(fs.createWriteStream(pathFileZip))
            .on('finish', function () {
                res.setHeader('Content-Disposition', `attachment; filename="${filenameZip}"`);
                res.sendFile(pathFileZip);
            });
    } catch (err) {
        reportGenerationErrorHandler(err);
    } finally {
        console.timeEnd('biospecimenRequest');
    }
};

const generateFileName = (ext: string, nowUTC: Date, prefix: string, suffix: string) =>
    `${prefix}_biospecimenRequest_${suffix}${formatCompactStamp(nowUTC)}.${ext}`;

export default biospecimenRequest;
