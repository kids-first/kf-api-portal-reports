import { Client } from '@elastic/elasticsearch';

import { getExtendedFromMapping } from '../arranger/deriveExtendedFromMapping';
import { ReportConfig } from '../reports/types';
import ExtendedReportConfigs from './extendedReportConfigs';
import ExtendedReportSheetConfigs from './extendedReportSheetConfigs';

// Pure (no IO) — build normalized configs from an already-fetched extended config,
// so the streaming path can fetch the _mapping once and reuse it (whitelist + nested fields).
export const buildNormalizedConfigs = (reportConfigs: ReportConfig, extendedConfigs: unknown): ExtendedReportConfigs =>
    new ExtendedReportConfigs(
        reportConfigs,
        reportConfigs.sheetConfigs.map((sc) => new ExtendedReportSheetConfigs(sc, extendedConfigs)),
    );

// Fetch the index _mapping and decorate the raw configs (column whitelist + header/type).
export const normalizeConfigs = async (es: Client, reportConfigs: ReportConfig): Promise<ExtendedReportConfigs> => {
    const extendedConfigs = await getExtendedFromMapping(es, reportConfigs.queryConfigs.alias);
    return buildNormalizedConfigs(reportConfigs, extendedConfigs);
};

export default normalizeConfigs;
