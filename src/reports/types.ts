export type QueryConfig = {
    alias: string;
};

export type ColumnConfig = {
    field: string;
    header?: string;
    additionalFields?: string[];
    transform?: any;
    /* this property can be useful if there are multiple columns targeting the same field */
    fieldExtraSuffix?: string;
};

export type SheetConfig = {
    sheetName: string;
    root: string;
    columns: ColumnConfig[];
    sort: object[];
};

export type ReportConfig = {
    queryConfigs: QueryConfig;
    sheetConfigs: SheetConfig[];
};

export enum ProjectType {
    kidsFirst = 'kids-first',
    include = 'include',
}

export type BioRequestConfig = {
    reportConfig: ReportConfig;
    fileNamePrefix: string;
    readmeContent: string;
    wantedFields: string[];
    contact: SheetConfig;
    generateStudyTab: (study_code: string) => SheetConfig;
};
