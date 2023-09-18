// import test from 'node:test';
import assert from "assert";

import fs from "fs";
import util from "util";
import {exec as exec0} from "child_process";

const exec = util.promisify(exec0);

import p from "./../../package.json";
import {log_json} from "../../src/lib/util.ts";

const cli = `./../dist/cli-node.cjs`


const run = async () => {
    let x;

    x = await exec(`${cli} version`);
    assert.equal(p.version, x.stdout.trim());


    const dir = `/tmp/transform-x-tests/${new Date().toISOString().replace(/[TZ]/g, "").replace(/[^\d]/g, "_")}`
    x = await exec(`mkdir -p ${dir}`);

    // CLI takes both flat array of objects and nested to work well with other CLI's.
    const flat = [
        {a: 1},
        {a: 2}
    ];

    const nested = {
        tables: [
            {
                name: "sheet_1",
                rows: flat
            },
            {
                name: "sheet_2",
                rows: flat
            }
        ]
    };

    fs.writeFileSync(`${dir}/a.json`, JSON.stringify(flat));
    fs.writeFileSync(`${dir}/a-nested.json`, JSON.stringify(nested));


    x = await exec(`${cli} json_to_excel --i ${dir}/a.json --o ${dir}/b.xlsx`);
    x = await exec(`${cli} json_to_excel --i ${dir}/a-nested.json --o ${dir}/b-nested.xlsx`);


    x = await exec(`${cli} excel_to_json --i ${dir}/b.xlsx --o ${dir}/c.json`);
    x = await exec(`${cli} excel_to_json --i ${dir}/b-nested.xlsx --o ${dir}/c-nested.json`);



    const c_flat = JSON.parse(fs.readFileSync(`${dir}/c.json`, `utf-8`));
    const c_nested = JSON.parse(fs.readFileSync(`${dir}/c-nested.json`, `utf-8`));

    assert.deepEqual(flat, c_flat.tables.sheet_1.rows);
    assert.deepEqual(flat, c_nested.tables.sheet_2.rows);


    // Error: ENOTSUP: operation not supported on socket, fsync
    // x = await exec(`${cli} excel_to_json --i ${dir}/b.xlsx`);
    // const b = x.stdout;
    // assert.deepEqual(a, b);
}


test('CLI: json_to_excel, excel_to_json', async () => {
    await run();
});
