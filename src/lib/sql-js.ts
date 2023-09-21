import initSqlJs from './../vendor/sql-js-build/out/sql-wasm-edited';
import {log_json} from "./util.ts";


// Init once globally per JS runtime.
let SQL_JS = null;
const get_sql_js = async () => {
    if (SQL_JS === null) {
        SQL_JS = await initSqlJs({});
    }
    return SQL_JS;
};

// Note: There is no option for "as object" on `db.exec`.
// [{ columns: [ 'name' ], values: [ [ 't1' ] ] }] to [{name: "t1"}]
const rows_to_obj = (rows) => {
    const o = [];

    for (const row of rows.values) {
        const r = {};
        for (const [i, k] of rows.columns.entries()) {
            r[k] = row[i]
        }

        o.push(r);
    }
    return o;
}


// Execute a single read (SELECT) and return rows.
const exec_read = (db, sql, params) => {
    // Note: exec returns any array of result sets, on for each statement in sql, separated by semicolon.
    const res = db.exec(sql, params);

    // When: No rows, but table exists.
    if (res.length === 0) {
        return [];
    }

    return rows_to_obj(res[0]);
};

// const exec_write = (db, sql, params) => {
//     const res = db.exec(sql, params);
//
//     return {
//         rows_modified: db.getRowsModified()
//     }
// };

export {
    get_sql_js,
    exec_read,
    // exec_write
}