// import test from 'node:test';
import _ from "lodash";
import {excel_to_json, json_to_excel} from "../../src/lib/fns-excel-json.ts";
import assert from "assert";
import {util} from "zod";
import assertEqual = util.assertEqual;


const test_json_to_excel = async () => {
    {
        const t = [
            {"a": 1, "b": 1},
            {"a": 2, "b": 2}
        ];

        const t_reverse = [...t].reverse();

        const a = await json_to_excel({
            tables: [
                {
                    name: "sheet_1",
                    rows: t
                },
                {
                    name: "sheet_2",
                    rows: t_reverse
                }
            ]
        });


        const b = await excel_to_json({
            xlsx_bytes: a.data.xlsx_bytes
        });


        assertEqual(b.ok, true);


        assert.deepEqual(t, b.data.tables.sheet_1.rows);
        assert.deepEqual(t_reverse, b.data.tables.sheet_2.rows);
    }
};

// @todo/low Handle two columns with the same header key.
// @todo/low Convert between JS dates and Excel dates.
describe('LIB: json_to_excel, excel_to_json', () => {
    test('test_json_to_excel', async () => test_json_to_excel());
});

