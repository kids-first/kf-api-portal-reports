export type QueryConfig = {
    indexName: string;
    alias: string;
};

export type ColumnConfig = {
    field: string;
    header?: string;
    additionalFields?: string[];
    transform?:any
};

export type SheetConfig = {
    sheetName: string;
    root: string;
    columns: ColumnConfig[];
    sort: object[];
}

export type ReportConfig = {
    queryConfigs: QueryConfig;
    sheetConfigs: SheetConfig[]
}