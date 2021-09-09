import { ColumnConfig } from '../reports/types';
import { getDefaultTransformPerType } from './esUtils';

class ExtendedReportColumnConfigs {

    readonly rawColumn: ColumnConfig;
    readonly field: string;
    readonly additionalFields: string[];
    readonly header: string;
    readonly type: string;

    constructor(rawColumn: ColumnConfig, extendedFieldInfo: any) {
        this.rawColumn = rawColumn;
        this.field = rawColumn.field;
        this.additionalFields = rawColumn.additionalFields || [];
        this.header = rawColumn.header || extendedFieldInfo.displayName || ExtendedReportColumnConfigs.defaultHeader;
        this.type = extendedFieldInfo.type;
    }

    static defaultHeader = '';

    // Transform value that every value will go through
    transform(value, row) {
        const transform = this.rawColumn.transform || getDefaultTransformPerType(this.type, this.field);
        return transform(value, row);
    }
}

export default ExtendedReportColumnConfigs;
