import { findValueInField } from '../../utils/arrangerUtils';

// excel4node cell writers for the biospecimen-request report (streaming reports use ExcelJS).

const EMPTY_HEADER = '--';

export const addHeaderCellByType = (ws) => (columnConfig, columnIndex) => {
    ws.cell(1, columnIndex + 1).string(columnConfig.header || EMPTY_HEADER);
};

const emptyCell = (_val, cell) => cell.string(String());
const setCellValueByType = {
    string: (val, cell) => cell.string(String(val)),
    boolean: (val, cell) => cell.bool(val),
    number: (val, cell) => cell.number(val),
    object: (val, cell) => cell.string(String(val)),
};

export const addCellByType = (ws, rowIndex, resultRow) => (columnConfig, columnIndex) => {
    // cells are 1-based: ws.cell(row, col)
    const rawValue = findValueInField(resultRow, columnConfig.field);
    const value = columnConfig.transform ? columnConfig.transform(rawValue, resultRow) : rawValue;
    const cell = ws.cell(rowIndex, columnIndex + 1);
    const setter = value === null ? emptyCell : setCellValueByType[typeof value] || emptyCell;
    setter(value, cell);
};
