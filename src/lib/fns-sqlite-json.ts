import _ from "lodash";

// import initSqlJs from './../vendor/sql.js/dist/sql-wasm';
import {exec_read, exec_write, get_sql_js} from "./sql-js.ts";
import {log_json} from "./util.ts";

// import initSqlJs_NPM from "sql.js";
// import sqlite_wasm_binary_2 from "./../../node_modules/sql.js/dist/sql-wasm.wasm"


const sqlite_to_json = async (opts) => {
    const {
        // Must be uint8array, not arraybuffer.
        sqlite_bytes
    } = opts;

    const SQL_JS = await get_sql_js();
    const db = new SQL_JS.Database(sqlite_bytes);


    // const rows = db.exec(`SELECT name FROM sqlite_schema WHERE type='table' AND name != 'sqlite_sequence' ORDER BY name`);
    const table_names = exec_read(db, `SELECT name FROM sqlite_schema WHERE type='table' AND name != 'sqlite_sequence' ORDER BY name`);


    const tables = {};
    for (const t of table_names) {
        const rows = exec_read(db, `SELECT * FROM ${t.name}`);

        // Use a map as it is easier to read with dot notation.
        tables[t.name] = {
            name: t.name,
            rows
        };
    }

    return {
        ok: true,
        data: {tables}
    }
};


const json_to_sqlite = async (opts) => {
    const {
        // Input tables do not use a map to reduce ceremony for tools creating input for this function (no need to place name as map key and in table object key).
        tables
    } = opts;

    // from
    const db_meta = json_to_statements_and_params({tables});

    // to
    const SQL_JS = await get_sql_js();
    const db = new SQL_JS.Database();

    // Create tables
    for (const t of db_meta.tables) {
        try {
            db.exec(t.sql.create_table);
        } catch (e) {
            console.error(t.sql.create_table);
            throw e;
        }
    }

    const tables_iter = _.values(tables);

    // Insert rows
    for (const t of db_meta.tables) {
        const data = tables_iter.find(x => x.name === t.name);

        if (data === undefined) {
            throw Error("Missing table");
        }

        // When: Empty table. No JSON to derive SQL schema from.
        if (t.sql.insert_into === null) {
            continue;
        }

        let stmt = null;
        try {
            stmt = db.prepare(t.sql.insert_into);
        } catch (e) {
            console.error(t.sql.insert_into);
            throw e;
        }


        for (const r of data.rows) {
            const binds = obj_to_params(r, t.sql.insert_valid_keys);

            // log_json(binds);
            stmt.bind(binds);
            stmt.step();
            stmt.reset();
        }

        stmt.free();
    }
    const sqlite_bytes = db.export();


    return {
        ok: true,
        data: {
            sqlite_bytes
        }
    }
};


// Converts a JSON object into params/bindings to run against a statement.
// - Must match prepared statement bindings and provide only valid value types.
const obj_to_params = (r, only_keys) => {
    let binds = {};
    for (const k of only_keys) {
        binds[k] = null;
        if (k in r) {
            const v = r[k];
            binds[k] = v;

            if (_.isPlainObject(v) || _.isArray(v)) {
                binds[k] = JSON.stringify(v);
            }

            if (_.isDate(v)) {
                binds[k] = v.toISOString();
            }
        }
    }

    binds = prefix_dollar(binds);
    return binds;
}


const is_valid_sql_identifier = (s) => /^[^\d][a-z\d_-]*$/i.test(s);


const json_to_statements_and_params = (db) => {
    // @todo/low Validate table and col names.


    const db_meta = {
        tables: []
    };

    // Determine column types for create table statement.
    for (const tbl of _.values(db.tables)) {

        if (!is_valid_sql_identifier(tbl.name)) {
            continue;
        }

        const cols = {};
        for (const row of tbl.rows) {
            for (const [col, val] of _.toPairs(row)) {
                const sql_type = get_sql_type(val);
                if (sql_type === null) {
                    // Unsupported type.
                    continue;
                }
                if (!is_valid_sql_identifier(col)) {
                    continue;
                }


                if (!(col in cols)) {
                    cols[col] = {
                        sql_types: {}
                    };
                }

                const meta = cols[col];


                if (!(sql_type in meta.sql_types)) {
                    meta.sql_types[sql_type] = 0;
                }
                meta.sql_types[sql_type]++;

            }

        }


        db_meta.tables.push({
            name: tbl.name,
            cols,
            sql: cols_to_create_and_insert(tbl.name, cols)
        });
    }

    return db_meta;
};

const cols_to_create_and_insert = (table_name, cols) => {
    const x = [];
    for (const [col, meta] of _.toPairs(cols)) {
        const sql_types = _.keys(meta.sql_types);

        // X === X
        if (sql_types.length === 1 && !sql_types.includes("NULL")) {
            x.push({col, sql_type: sql_types[0]});
            continue;
        }

        // NULL === TEXT
        if (_.isEqual(sql_types, ["NULL"])) {
            x.push({col, sql_type: "TEXT"});
            continue;
        }

        // NULL AND X === X
        if (sql_types.length === 2 && sql_types.includes("NULL")) {
            x.push({col, sql_type: sql_types.find(n => n !== "NULL")});
            continue;
        }

        // When: multiple types exist.
        // ELSE TEXT.
        x.push({
            col,
            sql_type: "TEXT"
        });
    }

    const meta_data_cols = [`_x_id`];

    // When looping between JSON and SQLite, do not re-write private cols, just delete/re-create them.
    // `_x` prefix used to reduce the chance of a real col collision.
    const writable = x.filter(n => !meta_data_cols.includes(n.col));

    // Note: This can be empty when input JSON rows are empty, as the create table defs are derived from the actual JSON values (when empty it is impossible to know what the intended schema is, but an empty table may convey information so still create it).
    const col_defs = writable.map(s => `${s.col} ${s.sql_type}`).join(", ");
    const col_refs = writable.map(s => s.col).join(", ");
    const col_binds = writable.map(s => `$${s.col}`).join(", ");

    const create_table = `create table ${table_name}(_x_id INTEGER PRIMARY KEY AUTOINCREMENT ${writable.length > 0 ? `,` : ``} ${col_defs})`;

    let insert_into = null;
    if (writable.length > 0) {
        insert_into = `insert into ${table_name}(${col_refs}) values (${col_binds})`;
    }

    return {
        create_table,
        insert_into,
        insert_valid_keys: x.map(s => s.col)
    }
};

const get_sql_type = (val) => {
    if (_.isString(val) || _.isDate(val)) {
        return "TEXT";
    }
    if (val === null || val === undefined) {
        return "NULL";
    }

    // JS Float without after decimal data.
    // SQLite uses 1 and 0 for booleans.
    if (Number.isInteger(val) || _.isBoolean(val)) {
        return "INTEGER";
    }

    // Float.
    if (_.isNumber(val)) {
        return "REAL";
    }

    // ArrayBuffer view = (Uint8Array and family).
    if (val instanceof ArrayBuffer || ArrayBuffer.isView(val)) {
        return "BLOB"
    }

    if (_.isPlainObject(val) || _.isArray(val)) {
        // JSON string.
        return "TEXT";
    }

    // Unsupported type.
    return null;
}


// Prefix dollar for binding to SQL statement.
const prefix_dollar = (obj) => {
    const o = {};

    for (const [k, v] of Object.entries(obj)) {
        o[`$${k}`] = v;
    }

    return o;
}


// Using esbuild to bundle the wasm and then returning the bytes in `locateFile` does not work as emscripten only supports that in SINGLE_FILE=1 mode, the default is 0 for sql-js.
// const del_other_sqlite3_wasm_load_attempts = async () => {
//     // await sqlite3InitModule_vanilla({
//     //     print: log,
//     //     printErr: error,
//     //     wasmBinary: sqlite_wasm_binary,
//     //     instantiateWasm: function (imports, successCallback) {
//     //         return WebAssembly.instantiate(sqlite_wasm_binary, imports).then(function (output) {
//     //             successCallback(output.instance);
//     //         });
//     //     }
//     // }).then((sqlite3) => {
//     //     try {
//     //         log('Done initializing. Running demo...');
//     //         start(sqlite3);
//     //     } catch (err) {
//     //         // error(err.name, err.message);
//     //     }
//     // });
//
//
//     // @see https://github.com/sql-js/sql.js/issues/554
//     const SQL = await initSqlJs_NPM({
//         // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
//         // You can omit locateFile completely when running in node
//         // locateFile: file => `https://sql.js.org/dist/${file}`
//         // wasmBinary: null,
//
//         locateFile: (file) => {
//             // console.log({file});
//             if (file === "sql-wasm.wasm") {
//                 // Does not work (only files and http?).
//                 // return URL.createObjectURL(new Blob([sqlite_wasm_binary_2.buffer], {type: "application/wasm"}));
//
//                 // https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string
//                 // - Note there is a browser and a node version.
//
//                 const b64 = Buffer.from(sqlite_wasm_binary_2).toString('base64');
//
//                 // const base64Data = btoa(String.fromCharCode.apply(null, sqlite_wasm_binary_2));
//                 // return `data:application/wasm;base64,${b64}`;
//
//
//                 return `data:application/octet-stream;base64,${b64}`;
//
//             }
//             throw Error(`Unknown file ${file}`);
//         }
//     });
//
//     const db_2 = new SQL.Database();
// }


// Try to infer many different types of JSON structure into the single type allowed for `json_to_excel`
const convert_flat_to_obj = (obj) => {
    const is_flat_array_of_objects = (
        _.isArray(obj) &&
        obj.filter(x => !_.isPlainObject(x)).length === 0
    );

    if (is_flat_array_of_objects) {
        return {
            tables: [
                {
                    name: "tbl_1",
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

// Replace binary row values with null before JSON.stringify for CLI.
// @todo/med Support x_to_msgpack output.
const replace_binary_vals_with_null = (db) => {
    for (const t of _.values(db.tables)) {
        for (const r of t.rows) {
            for (const [k, v] of _.toPairs(r)) {
                if (ArrayBuffer.isView(v)) {
                    r[k] = null;
                }
            }
        }
    }
}


export {
    sqlite_to_json,
    json_to_sqlite,
    convert_flat_to_obj,
    replace_binary_vals_with_null
}