import { SheetConfig } from '../reports/types';
import ExtendedReportColumnConfigs from './extendedReportColumnConfigs';

class ExtendedReportSheetConfigs {
    readonly sheetConfig: SheetConfig;
    normalizedColumns: ExtendedReportColumnConfigs[];

    constructor(sheetConfig: SheetConfig, extendedConfigs: any) {
        this.sheetConfig = sheetConfig;
        this.normalizedColumns = [];
        this.initialize(extendedConfigs);
    }

    initialize(extendedConfigs: any) {
        this.normalizedColumns = this.sheetConfig.columns
            .map(rawColumn => {
                const extendedFieldInfo = extendedConfigs.find(ec => rawColumn.field === ec.field);
                if (!extendedFieldInfo) {
                    console.warn(
                        `Missing extended field information for field "${rawColumn.field}" in sheet configs "${this.sheetName}", the field will be excluded.`,
                    );
                    return null;
                }

                return new ExtendedReportColumnConfigs(rawColumn, extendedFieldInfo);
            })
            .filter(col => col !== null);
    }

    // eslint-disable-next-line class-methods-use-this
    get indexName(): string {
        throw new Error('"indexName" has been moved');
    }

    // eslint-disable-next-line class-methods-use-this
    get alias(): string {
        throw new Error('"alias" has been moved');
    }

    get sheetName(): string {
        return this.sheetConfig.sheetName;
    }

    /**
     * @example Given `participant.phenotype` being a nested field, `root: 'phenotype'`
     * will put each phenotype on a separate line and duplicate the fields not under `phenotype`.
     */
    get root(): string {
        return this.sheetConfig.root;
    }

    get sort(): object[] {
        return this.sheetConfig.sort;
    }

    get columns(): ExtendedReportColumnConfigs[] {
        return this.normalizedColumns;
    }
}

export default ExtendedReportSheetConfigs;
