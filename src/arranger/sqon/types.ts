export type Content = any;
// A poor man's sqon type.
export type Sqon = {
    op: string;
    content: Content;
    [key: string]: any;
};

// ES query body — loose by design (shape dictated by ES, built dynamically from SQON ops).
export type EsQuery = Record<string, any>;
