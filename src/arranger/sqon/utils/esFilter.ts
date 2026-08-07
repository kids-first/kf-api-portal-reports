// Low-level ES query shape builders (bool/nested wrappers). Ported from post-arranger.

import { ES_BOOL, ES_MUST, ES_MUST_NOT, ES_NESTED, ES_PATH, ES_QUERY, ES_SHOULD } from '../constants';
import { EsQuery } from '../types';

function wrapBool(op: typeof ES_MUST | typeof ES_MUST_NOT | typeof ES_SHOULD, value: EsQuery | EsQuery[]): EsQuery {
    return {
        [ES_BOOL]: {
            [op]: Array.isArray(value) ? value : [value],
        },
    };
}

export const wrapMust = (value: EsQuery | EsQuery[]): EsQuery => wrapBool(ES_MUST, value);
export const wrapMustNot = (value: EsQuery | EsQuery[]): EsQuery => wrapBool(ES_MUST_NOT, value);
export const wrapShould = (value: EsQuery | EsQuery[]): EsQuery => wrapBool(ES_SHOULD, value);

export function wrapNested(esFilter: EsQuery, path: string): EsQuery {
    return {
        [ES_NESTED]: {
            [ES_PATH]: path,
            // keep an existing bool as-is, else wrap in `must` so the nested query is always a bool
            [ES_QUERY]: esFilter[ES_BOOL] ? esFilter : wrapMust(esFilter),
        },
    };
}

export function isNested(filter: EsQuery | null | undefined): boolean {
    return !!filter && Object.prototype.hasOwnProperty.call(filter, ES_NESTED);
}

export function readPath(filter: EsQuery | null | undefined): string {
    return filter?.[ES_NESTED]?.[ES_PATH] ?? '';
}

// Return a copy of `target` with `target.<path>` replaced by `data`, cloning along the path.
export function mergePath(target: EsQuery, path: ReadonlyArray<string>, data: unknown): EsQuery {
    if (path.length === 0) return data as EsQuery;
    const [head, ...rest] = path;
    return {
        ...target,
        [head]: rest.length ? mergePath(target?.[head] ?? {}, rest, data) : data,
    };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toEsRangeValue(value: unknown): unknown {
    // Only expand bare `yyyy-MM-dd` strings; everything else is returned as-is.
    if (typeof value === 'string' && value.length >= 10 && ISO_DATE_RE.test(value)) {
        const ms = Date.parse(value);
        if (!Number.isNaN(ms)) {
            return `${value} 00:00:00.000000`;
        }
    }
    return value;
}
