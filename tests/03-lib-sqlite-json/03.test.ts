// import test from 'node:test';

import _ from "lodash";
import assert from "assert";
import {util} from "zod";


import {json_to_sqlite, sqlite_to_json} from "../../src/lib/fns-sqlite-json.ts";
import fs from "fs";
import {setup_tests} from "../util/util.ts";
import {log_json} from "../../src/lib/util.ts";


setup_tests();

const wal_mode_files_can_be_read = async () => {
    // WAL-mode is not supported in WASM, not even for reading.
    // @see https://sqlite.org/forum/forumpost/33587a48dc

    // Error for wal enabled SQLite files: `SQLite3Error: sqlite3 result code 26: file is not a database`.
    // - Check wal mode status with `sqlite3 x.sqlite ".dbinfo"`
    const buffer = fs.readFileSync(`./04-cli-sqlite-json/wal-mode.sqlite`, null);
    const wal_mode_sqlite_bytes = new Uint8Array(buffer.buffer);

    const c = await sqlite_to_json({
        sqlite_bytes: wal_mode_sqlite_bytes
    });
    expect(c?.data?.tables).toEqual({
        t1: {name: 't1', rows: [{c1: 'v1'}]},
        t2: {name: 't2', rows: []}
    });
}


const json_to_sqlite_to_json = async () => {

    const enc = new TextEncoder();

    const db_1 = {
        tables: [
            {
                name: "t1",
                rows: [
                    {
                        t_int: 1,
                        t_string: "r1",
                        t_bool: true,
                        t_null: null,
                        uint8array: enc.encode("This is a string converted to a Uint8Array, encoded as utf-8"),
                        nested: {
                            a: 1,
                            b: "This should be converted to JSON"
                        },
                        date: new Date(),
                        "dsfasdf@$^*&^%$": 1
                    },
                    {
                        new_col_a: 1,
                        new_col_b: 2
                    },
                ]
            },
            {
                name: "t2",
                rows: [
                    {
                        t_int: 1,
                        t_string: "r1",
                        t_bool: true,
                        t_null: null
                    }
                ]
            }
        ]
    };


    const a = await json_to_sqlite(db_1);


    expect(a.ok).toBe(true);

    const file_path = "/tmp/tfx-last-test-run.sqlite";
    fs.writeFileSync(file_path, a.data.sqlite_bytes);
    console.log(`SQLite test db written to ${file_path}`);


    const b = await sqlite_to_json({
        sqlite_bytes: a.data.sqlite_bytes
    });


    expect(b.ok).toBe(true);

    expect(b.data?.tables?.t1.rows[0]).toEqual({
        _x_id: 1,
        t_int: 1,
        t_string: 'r1',
        t_bool: 1,
        t_null: null,
        uint8array: db_1.tables[0].rows[0].uint8array,
        nested: '{"a":1,"b":"This should be converted to JSON"}',
        date: db_1.tables[0].rows[0].date.toISOString(),

        // These are added to every row.
        new_col_a: null,
        new_col_b: null
    });
};

// @todo/low Offer msgpack alternative for JSON with Uint8Array binary values.
// @todo/low Assert FTS5 database can be read.
// @todo/low Detect boolean type by asserting only 0 and 1 exist in the col.
describe('LIB: sqlite_to_json, json_to_sqlite', () => {
    test('wal_mode_files_can_be_read', async () => wal_mode_files_can_be_read());
    test('json_to_sqlite_to_json', async () => json_to_sqlite_to_json());
});

