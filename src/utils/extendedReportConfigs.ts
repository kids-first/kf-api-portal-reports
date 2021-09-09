import { QueryConfig, ReportConfig } from '../reports/types';
import ReportSheetConfigs from './extendedReportSheetConfigs';

class ExtendedReportConfigs {
    readonly query: QueryConfig;
    readonly sheets: ReportSheetConfigs[];
    readonly indexName: string;
    readonly alias: string;

    constructor(reportConfigs: ReportConfig, sheets: ReportSheetConfigs[]) {
        this.query = reportConfigs.queryConfigs;
        this.sheets = sheets;
        this.indexName = reportConfigs.queryConfigs.indexName;
        this.alias = reportConfigs.queryConfigs.alias;
    }
}

export default ExtendedReportConfigs;
