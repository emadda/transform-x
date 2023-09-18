import _ from "lodash";

// Note: The official SQLite WASM build does not support wal-mode files.
// - This is the first implementation before trying sql-js instead.

import {
    default as sqlite3InitModuleWasmBundled
} from './../vendor/sqlite/sqlite3-bundler-friendly-edited.mjs';


const sqlite_to_json = async (opts) => {
    const {
        sqlite_bytes
    } = opts;

    const db = await get_db_oo_from_arraybuffer(sqlite_bytes);

    const rows = db.exec({
        sql: `SELECT name FROM sqlite_schema WHERE type='table' AND name != 'sqlite_sequence' ORDER BY name`,
        returnValue: "resultRows",
        rowMode: "object"
    });

    const tables = {};
    for (const t of rows) {
        const rows = db.exec({
            sql: `SELECT * FROM ${t.name}`,
            returnValue: "resultRows",
            rowMode: "object"
        });

        // Use a map as it is easier to read with dot notation.
        tables[t.name] = {
            name: t.name,
            rows
        };
    }

    // log_json(tables.t1);

    return {
        ok: true,
        data: {tables}
    }
};

// Convert an array buffer into a db handle.
const get_db_oo_from_arraybuffer = async (uint8) => {
    // @see https://sqlite.org/wasm/doc/trunk/cookbook.md
    const sqlite3 = await get_sqlite_3();

    // Note: Docs mention array buffer, but only a uint8array works.
    const p = sqlite3.wasm.allocFromTypedArray(uint8);

    const db = new sqlite3.oo1.DB();

    // Can also write to OPFS and use filename:
    // sqlite3.capi.sqlite3_js_vfs_create_file("opfs", "my-db.db", arrayBuffer);
    // const db = new sqlite3.oo1.OpfsDb("my-db.db");


    const rc = sqlite3.capi.sqlite3_deserialize(
        db.pointer, 'main', p, uint8.byteLength, uint8.byteLength,
        sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE
        // Optionally:
        // | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
    );

    console.log({rc, a: 1});
    sqlite3.oo1.DB.checkRc(db, rc);
    // db.checkRc(rc);

    return db;
};


const json_to_sqlite = async (opts) => {
    const {
        // Input tables do not use a map to reduce ceremony for tools creating input for this function (no need to place name as map key and in table object key).
        db: db_data
    } = opts;

    const sqlite3 = await get_sqlite_3();

    const db_meta = json_to_statements_and_params(db_data);
    // log_json(db_meta);
    // log_json(db_data);


    const db = new sqlite3.oo1.DB(`:memory:`, 'cw');

    // Create tables
    for (const t of db_meta.tables) {
        db.exec({
            sql: t.sql.create_table
        });
    }

    // Insert rows
    for (const t of db_meta.tables) {
        const data = db_data.tables.find(x => x.name === t.name);
        if (data === undefined) {
            throw Error("Missing table");
        }

        const i = db.prepare(t.sql.insert_into);

        for (const r of data.rows) {
            const binds = obj_to_params(r, t.sql.insert_valid_keys);

            // log_json(binds);
            i.bind(binds).step();
            i.reset();
        }

        i.finalize();
    }
    const sqlite_bytes = sqlite3.capi.sqlite3_js_db_export(db.pointer)

    return {
        ok: true,
        data: {
            sqlite_bytes
        }
    }
};


// @see https://emscripten.org/docs/api_reference/module.html#Module.instantiateWasm
let sqlite3_p = null;
const get_sqlite_3 = async () => {
    if (sqlite3_p === null) {
        const log = (...args) => console.log(...args);
        const error = (...args) => console.error(...args);

        sqlite3_p = sqlite3InitModuleWasmBundled({
            print: log,
            printErr: error,
            // wasmBinary: sqlite_wasm_binary
            // instantiateWasm: function (imports, successCallback) {
            //     return WebAssembly.instantiate(sqlite_wasm_binary, imports).then(function (output) {
            //         successCallback(output.instance);
            //     });
            // }

        });
    }
    return sqlite3_p;
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


// const get_db_as_blob = (sqlite3, db_pointer) => {
//     const byteArray = sqlite3.capi.sqlite3_js_db_export(db_pointer);
//     const blob = new Blob([byteArray.buffer], {type: "application/x-sqlite3"});
//     return blob;
// }


const json_to_statements_and_params = (db) => {
    // @todo/low Validate table and col names.


    const db_meta = {
        tables: []
    };

    // Determine column types for create table statement.
    for (const tbl of db.tables) {

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

        if (sql_types.length > 1 || sql_types.includes("NULL")) {
            x.push({col, sql_type: "TEXT"});
            continue;
        }

        x.push({
            col,
            sql_type: sql_types[0]
        });
    }

    const create_table = `create table ${table_name}(_id INTEGER PRIMARY KEY AUTOINCREMENT, ${x.map(s => `${s.col} ${s.sql_type}`).join(", ")})`;
    const insert_into = `insert into ${table_name}(${x.map(s => s.col).join(", ")}) values (${x.map(s => `$${s.col}`).join(", ")})`;

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


const del_other_sqlite3_wasm_load_attempts = () => {
    // await sqlite3InitModule_vanilla({
    //     print: log,
    //     printErr: error,
    //     wasmBinary: sqlite_wasm_binary,
    //     instantiateWasm: function (imports, successCallback) {
    //         return WebAssembly.instantiate(sqlite_wasm_binary, imports).then(function (output) {
    //             successCallback(output.instance);
    //         });
    //     }
    // }).then((sqlite3) => {
    //     try {
    //         log('Done initializing. Running demo...');
    //         start(sqlite3);
    //     } catch (err) {
    //         // error(err.name, err.message);
    //     }
    // });


    // @see https://github.com/sql-js/sql.js/issues/554
    // const SQL = await initSqlJs({
    //     // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
    //     // You can omit locateFile completely when running in node
    //     // locateFile: file => `https://sql.js.org/dist/${file}`
    //     wasmBinary: null,
    //
    //     // locateFile: (file) => {
    //     //     // console.log({file});
    //     //     if(file === "sql-wasm.wasm") {
    //     //         // Does not work (only files and http?).
    //     //         // return URL.createObjectURL(new Blob([sqlite_wasm_binary_2.buffer], {type: "application/wasm"}));
    //     //
    //     //         // https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string
    //     //         // - Note there is a browser and a node version.
    //     //
    //     //         const b64 = Buffer.from(sqlite_wasm_binary_2).toString('base64');
    //     //
    //     //         // const base64Data = btoa(String.fromCharCode.apply(null, sqlite_wasm_binary_2));
    //     //         return `data:application/wasm;base64,${b64}`;
    //     //
    //     //     }
    //     //     throw Error(`Unknown file ${file}`);
    //     // }
    // });
    //
    // const db_2 = new SQL.Database();
}


export {
    sqlite_to_json,
    json_to_sqlite,
}