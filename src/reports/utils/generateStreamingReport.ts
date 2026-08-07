/* eslint-disable no-console */
import { Client } from '@elastic/elasticsearch';
import ExcelJS from 'exceljs';
import { Response } from 'express';
import flattenDeep from 'lodash/flattenDeep';
import uniq from 'lodash/uniq';

import { getExtendedFromMapping } from '../../arranger/deriveExtendedFromMapping';
import { ES_PAGESIZE } from '../../env';
import { findValueInField, generateColumnsForProperty } from '../../utils/arrangerUtils';
import { buildNormalizedConfigs } from '../../utils/configUtils';
import { toSafeESValue } from '../../utils/esUtils';
import { Sqon } from '../../utils/setsTypes';
import { ReportConfig } from '../types';
import buildEsQueryFromSqon from './buildEsQuery';

const EMPTY_HEADER = '--';

// ExcelJS cell value, matching excel4node typing: null/other -> '', object -> String, scalars pass through.
const toCellValue = (value: unknown): string | number | boolean => {
    if (value === null) return '';
    switch (typeof value) {
        case 'string':
        case 'number':
        case 'boolean':
            return value;
        case 'object':
            return String(value);
        default:
            return '';
    }
};

// Fallback filename: report_YYYYMMDD.xlsx.
const getDefaultFilename = (): string => `report_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;

// Group sheets that share an identical sort into one scan group. All sheets use the
// same alias + query, so sheets with the same sort can be served by ONE ES scan and
// fanned out per page — turning N sheets into (number of distinct sorts) scans.
// Insertion order is preserved, so worksheet order in the output is unchanged.
function groupSheetsBySort<S extends { sort: object[] }>(sheets: S[]): { sort: object[]; sheets: S[] }[] {
    const byKey = new Map<string, { sort: object[]; sheets: S[] }>();
    for (const sheet of sheets) {
        const key = JSON.stringify(sheet.sort);
        const group = byKey.get(key);
        if (group) {
            group.sheets.push(sheet);
        } else {
            byKey.set(key, { sort: sheet.sort, sheets: [sheet] });
        }
    }
    return [...byKey.values()];
}

// Safety ceiling on pages per scan — guards against a non-advancing search_after
// cursor looping forever. Far above any real cohort (100k pages * pageSize 100 = 10M docs).
const MAX_SCAN_PAGES = 100_000;

// Scan all matching docs via search_after, calling `onPage` with each page's _source
// array. Pages until a short page (total-independent, so no 10k hits.total cap in ES 7.x;
// track_total_hits:false since we never read the total).
async function scanAllPages(
    es: Client,
    index: string,
    body: Record<string, any>,
    pageSize: number,
    onPage: (sources: any[]) => void,
): Promise<void> {
    let searchAfter: any[] | null = null;
    for (let pageNum = 0; pageNum < MAX_SCAN_PAGES; pageNum += 1) {
        const searchParams: Record<string, any> = {
            index,
            body: { ...body, size: pageSize, track_total_hits: false },
        };
        if (searchAfter) {
            searchParams.body.search_after = searchAfter.map(toSafeESValue);
        }
        const page = await es.search(searchParams);
        const hits = page.body.hits.hits;
        if (hits.length === 0) return;
        onPage(hits.map((h: any) => h._source));
        if (hits.length < pageSize) return;
        searchAfter = hits[hits.length - 1].sort;
    }
    throw new Error(`scanAllPages exceeded ${MAX_SCAN_PAGES} pages on "${index}" (non-advancing cursor?)`);
}

/**
 * Stream a multi-sheet XLSX to `res` with flat memory: sheets scanned
 * sequentially (one ES scan at a time), rows written straight into an ExcelJS
 * WorkbookWriter.
 *
 * Errors before the first byte throw (caller returns 500); once streaming has
 * begun, headers are gone so we can only abort the socket.
 */
export default async function generateStreamingReport(
    es: Client,
    res: Response,
    sqon: Sqon,
    filename: string,
    reportConfig: ReportConfig,
    accessToken: string,
): Promise<void> {
    // pre-stream (errors here -> clean 500). One _mapping fetch feeds both whitelist and nested fields.
    const extendedConfig = await getExtendedFromMapping(es, reportConfig.queryConfigs.alias);
    const normalizedConfigs = buildNormalizedConfigs(reportConfig, extendedConfig);
    const query = await buildEsQueryFromSqon(extendedConfig, sqon, accessToken);

    // streaming: headers flush on first commit — cannot 500 after.
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || getDefaultFilename()}"`);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: res,
        useSharedStrings: false, // inline strings -> flat memory (no growing shared-strings table)
        useStyles: false,
    });

    try {
        // Sheets sharing a sort are served by ONE scan (same alias + query); each page is
        // fanned out to every sheet in the group. Worksheets are created in config order.
        for (const group of groupSheetsBySort(normalizedConfigs.sheets)) {
            const prepared = group.sheets.map((sheetConfig) => {
                const ws = workbook.addWorksheet(sheetConfig.sheetName);
                ws.addRow(sheetConfig.columns.map((c) => c.header || EMPTY_HEADER)).commit();
                const source = uniq(
                    flattenDeep(sheetConfig.columns.map((col) => col.additionalFields.concat(col.field))),
                ) as string[];
                return { sheetConfig, ws, source };
            });

            // Union of every sheet's _source. ES loads each doc's FULL _source regardless of
            // includes, so requesting the union costs nothing extra — and lets one scan feed all.
            const unionSource = uniq(flattenDeep(prepared.map((p) => p.source))) as string[];
            const body = { query, _source: unionSource, sort: group.sort };

            await scanAllPages(es, normalizedConfigs.alias, body, ES_PAGESIZE, (rawChunk) => {
                for (const { sheetConfig, ws } of prepared) {
                    // "root" sheets explode one doc into many rows; flat sheets pass through.
                    const rows = sheetConfig.root
                        ? rawChunk.flatMap((row) => generateColumnsForProperty(row, sheetConfig.root))
                        : rawChunk;
                    for (const row of rows) {
                        ws.addRow(
                            sheetConfig.columns.map((col) => {
                                const raw = findValueInField(row, col.field);
                                return toCellValue(col.transform ? col.transform(raw, row) : raw);
                            }),
                        ).commit();
                    }
                }
            });
            prepared.forEach((p) => p.ws.commit());
        }

        await workbook.commit();
    } catch (err) {
        console.error('Error while streaming the report', err);
        if (!res.headersSent) {
            // nothing streamed yet: drop xlsx headers, let caller 500
            res.removeHeader('Content-Type');
            res.removeHeader('Content-Disposition');
            throw err;
        }
        // mid-stream: response already committed — abort so the client unblocks
        res.destroy(err instanceof Error ? err : new Error(String(err)));
    }
}
