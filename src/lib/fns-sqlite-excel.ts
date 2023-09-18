import * as XLSX from 'xlsx';
import _ from "lodash";
import {log_json} from "./util.ts";
import {json_to_sqlite, sqlite_to_json} from "./fns-sqlite-json.ts";
import {excel_to_json, json_to_excel} from "./fns-excel-json.ts";


const sqlite_to_excel = async (opts) => {
    const {
        sqlite_bytes
    } = opts;


    const res = await sqlite_to_json({sqlite_bytes});
    const res_2 = await json_to_excel(res.data);

    return {
        ok: true,
        data: {
            xlsx_bytes: res_2.data.xlsx_bytes
        }
    }
}

const excel_to_sqlite = async (opts) => {
    const {
        xlsx_bytes
    } = opts;

    const res = await excel_to_json({xlsx_bytes});
    const res_2 = await json_to_sqlite(res.data);

    return {
        ok: true,
        data: {
            sqlite_bytes: res_2.data.sqlite_bytes
        }
    }
}


export {
    sqlite_to_excel,
    excel_to_sqlite
}