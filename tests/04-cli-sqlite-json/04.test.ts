// import test from 'node:test';
import assert from "assert";

import fs from "fs";
import util from "util";
import {exec as exec0} from "child_process";

const exec = util.promisify(exec0);

import p from "./../../package.json";

const cli = `./../dist/cli-node.cjs`

import {setup_tests} from "../util/util.ts";
setup_tests();



let g_dir = null;
const get_dir = async () => {
    if (g_dir === null) {
        g_dir = `/tmp/transform-x-tests/${new Date().toISOString().replace(/[TZ]/g, "").replace(/[^\d]/g, "_")}`
        const x = await exec(`mkdir -p ${g_dir}`);
    }
    return g_dir;
}

const test_cli_interface = async () => {
    let x;
    const dir = await get_dir();

    x = await exec(`${cli} version`);
    expect(p.version).toBe(x.stdout.trim());


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
                        // uint8array: enc.encode("This is a string converted to a Uint8Array, encoded as utf-8"),
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
    fs.writeFileSync(`${dir}/a.json`, JSON.stringify(db_1));


    x = await exec(`${cli} json_to_sqlite --i ${dir}/a.json --o ${dir}/b.sqlite`);
    x = await exec(`${cli} sqlite_to_json --i ${dir}/b.sqlite --o ${dir}/c.json`);

    console.log({dir});

    const a = JSON.parse(fs.readFileSync(`${dir}/c.json`, `utf-8`));

    expect(a?.tables?.t1.rows[0]).toEqual({
        "_x_id": 1,
        "date": db_1.tables[0].rows[0].date.toISOString(),
        "nested": "{\"a\":1,\"b\":\"This should be converted to JSON\"}",
        "new_col_a": null,
        "new_col_b": null,
        "t_bool": 1,
        "t_int": 1,
        "t_null": null,
        "t_string": "r1",
    });
}

const cli_interface_flat_array_of_rows = async () => {
    let x;
    const dir = await get_dir();

    x = await exec(`${cli} version`);
    expect(p.version).toBe(x.stdout.trim());


    const rows_a = [
        {
            t_int: 1,
            t_string: "r1",
            t_bool: true,
            t_null: null
        }
    ];
    fs.writeFileSync(`${dir}/rows_a.json`, JSON.stringify(rows_a));


    x = await exec(`${cli} json_to_sqlite --i ${dir}/rows_a.json --o ${dir}/rows_a_out.sqlite`);
    expect(x.stderr).toEqual("");
}


const test_wal_mode = async () => {
    let x;
    const dir = await get_dir();

    // Error for wal enabled SQLite files: `SQLite3Error: sqlite3 result code 26: file is not a database`.
    // - Check wal mode status with `sqlite3 x.sqlite ".dbinfo"`
    x = await exec(`${cli} sqlite_to_json --i ./04-cli-sqlite-json/wal-mode.sqlite --o ${dir}/d.json`);
    const d = JSON.parse(fs.readFileSync(`${dir}/d.json`, `utf-8`));
    expect(d?.tables).toEqual({
        "t1": {
            "name": "t1",
            "rows": [
                {
                    "c1": "v1"
                }
            ]
        },
        "t2": {
            "name": "t2",
            "rows": []
        }
    });
}


describe('CLI: json_to_sqlite, sqlite_to_json', () => {
    test("cli_interface", async () => test_cli_interface());
    test("cli_interface_flat_array_of_rows", async () => cli_interface_flat_array_of_rows());
    test("wal_mode", async () => test_wal_mode());
});

