import * as XLSX from 'xlsx/xlsx.mjs';
import _ from "lodash";
import {log_json} from "./util.ts";

// @todo/med Use zod to validate input types, return proper errors.
// @todo/high Create a real Excel table for each sheet (auto filter and search UI, formulas can reference table alias).
// @see https://docs.sheetjs.com/docs/getting-started/examples/export#reshaping-the-array
const json_to_excel = async (opts) => {
    const {
        // Can be array or object where keys are table names.
        tables
    } = opts;

    const wb = XLSX.utils.book_new();

    for (const t of _.values(tables)) {
        if (t.name.length > 31) {
            // Avoid "sheet names cannot exceed 31 chars" error.
            // @todo/low Create a log for any non-obvious implicit data changes, log to tmp file.
            continue;
        }

        const ws = XLSX.utils.json_to_sheet(t.rows);
        XLSX.utils.book_append_sheet(wb, ws, t.name);
    }

    const file = XLSX.writeXLSX(wb, {type: "array", compression: true});


    return {
        ok: true,
        data: {
            xlsx_bytes: new Uint8Array(file)
        }
    }
};

// Try to infer many different types of JSON structure into the single type allowed for `json_to_excel`
const covert_flat_array_to_nested = (obj) => {
    const is_flat_array_of_objects = (
        _.isArray(obj) &&
        obj.filter(x => !_.isPlainObject(x)).length === 0
    );

    if (is_flat_array_of_objects) {
        return {
            tables: [
                {
                    name: "sheet_1",
                    rows: obj
                }
            ]
        }
    }

    if (_.isPlainObject(obj)) {
        return obj;
    }

    throw Error(`Unknown JSON input structure: ${JSON.stringify(obj)}`);
}


// @todo/med Convert Excel dates to ISO strings. And JS/ISO strings to Excel dates.
const excel_to_json = async (opts) => {
    const {
        xlsx_bytes,

        // @todo/low Allow no headers (use A, B etc as keys).
        first_row_are_headers = true
    } = opts;


    const workbook = XLSX.read(xlsx_bytes, {type: "array"});
    const tables = {};
    for (const [k, v] of _.toPairs(workbook.Sheets)) {
        tables[k] = {
            name: k,

            // Note: Array of arrays is returned when header=1
            rows: XLSX.utils.sheet_to_json(
                v,
                {
                    header: 0,
                    // Fill out empty vals with this value (default is to leave out the key from the object).
                    defval: null
                }
            )
        }
    }

    return {
        ok: true,
        data: {
            tables
        }
    }
}


export {
    json_to_excel,
    excel_to_json,

    // Util
    covert_flat_array_to_nested
}