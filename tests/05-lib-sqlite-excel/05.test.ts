// import test from 'node:test';

import _ from "lodash";
import assert from "assert";
import {util} from "zod";


import {json_to_sqlite, sqlite_to_json} from "../../src/lib/fns-sqlite-json.ts";
import fs from "fs";
import {get_dir, setup_tests} from "../util/util.ts";
import {excel_to_sqlite, sqlite_to_excel} from "../../src/lib/fns-sqlite-excel.ts";
import {excel_to_json} from "../../src/lib/fns-excel-json.ts";
import {log_json} from "../../src/lib/util.ts";


setup_tests();

const obj_ref = {};
const enc = new TextEncoder();
const db_1 = {
    tables: [
        {
            name: "t1",
            rows: [
                {
                    _x_id: "col will be replaced as it conflicts with internal meta data col.",
                    t_int: 1,
                    t_string: "r1",
                    t_bool: true,
                    t_null: null,
                    uint8array: enc.encode("This is a string converted to a Uint8Array, encoded as utf-8"),
                    nested: {
                        a: 1,
                        b: "This should be converted to JSON"
                    },
                    date: new Date("2023-08-15T18:16:13.502Z"),
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


const db_1_out = {
    t1: {
        name: 't1',
        rows: [
            {
                _x_id: 1,
                t_int: 1,
                t_string: 'r1',
                t_bool: 1,
                t_null: null,
                uint8array: null,
                nested: '{"a":1,"b":"This should be converted to JSON"}',
                date: '2023-08-15T18:16:13.502Z',
                new_col_a: null,
                new_col_b: null
            },
            {
                _x_id: 2,
                t_int: null,
                t_string: null,
                t_bool: null,
                t_null: null,
                uint8array: null,
                nested: null,
                date: null,
                new_col_a: 1,
                new_col_b: 2
            }
        ]
    },
    t2: {
        name: 't2',
        rows: [{_x_id: 1, t_int: 1, t_string: 'r1', t_bool: 1, t_null: null}]
    }
};

const both = async () => {
    const dir = await get_dir(obj_ref);
    console.log(`Using ${dir}`);

    const a = await json_to_sqlite(db_1);
    expect(a.ok).toBe(true);
    fs.writeFileSync(`${dir}/a.sqlite`, a.data.sqlite_bytes);


    const b = await sqlite_to_excel({sqlite_bytes: a.data.sqlite_bytes});
    fs.writeFileSync(`${dir}/b.xlsx`, b.data.xlsx_bytes);


    {
        // Test `excel_to_sqlite`
        const x = await excel_to_sqlite({xlsx_bytes: b.data.xlsx_bytes});
        fs.writeFileSync(`${dir}/x.sqlite`, x.data.sqlite_bytes);

        const y = await sqlite_to_json({sqlite_bytes: x.data.sqlite_bytes});

        expect(y.data?.tables).toEqual(db_1_out);

    }


    const c = await excel_to_json({xlsx_bytes: b.data.xlsx_bytes});
    fs.writeFileSync(`${dir}/c.json`, JSON.stringify(c.data, null, 4));

    expect(c.data?.tables).toEqual(db_1_out);
}


// @todo/low Offer msgpack alternative for JSON with Uint8Array binary values.
describe('LIB: sqlite_to_excel, excel_to_sqlite', () => {
    test('both', async () => both());
});

