#!/usr/bin/env node --enable-source-maps --max-old-space-size=8192
import minimist from "minimist";
import {z} from "zod";
import _ from "lodash";

import {spawn} from "child_process";

import p from "./../package.json";
import help from "./lib-app/help.txt";
import fs from "fs";
import {covert_flat_array_to_nested, excel_to_json, json_to_excel} from "./lib/fns-excel-json.ts";
import {
    convert_flat_to_obj,
    json_to_sqlite,
    replace_binary_vals_with_null,
    sqlite_to_json
} from "./lib/fns-sqlite-json.ts";
import {log_json} from "./lib/util.ts";
import {excel_to_sqlite, sqlite_to_excel} from "./lib/fns-sqlite-excel.ts";


const cmd_re = /(?<cmd>json_to_excel|excel_to_json|sqlite_to_json|json_to_sqlite|sqlite_to_excel|excel_to_sqlite)$/
const args_s = z.object({
    cmd: z.enum([
        "json_to_excel",
        "excel_to_json",
        "sqlite_to_json",
        "json_to_sqlite",
        "sqlite_to_excel",
        "excel_to_sqlite",
    ]),
    i: z.string().nullable().default(null),
    o: z.string().nullable().default(null),
    config: z.string().nullable().default(null),
    open: z.boolean().nullable().default(null)
});


// Example minimist output for when installed via `npm install -g` using package.json `bin` alias.
// _: [
//     '/opt/homebrew/Cellar/node@18/18.16.1_1/bin/node',
//     '/opt/homebrew/bin/json_to_excel'
// ]

const get_args_from_cli = () => {
    const cli_args = minimist(process.argv);
    let [node, script_name, cmd = null, ...rest] = cli_args._;

    // cmd: Take from script name when installed via `npm -g` if it is not already set.
    if (cmd === null) {
        const m = script_name.match(cmd_re);
        if (m !== null) {
            cmd = m.groups.cmd;
        }
    }

    if (cmd === "help") {
        console.log(help);
        process.exit();
    }


    if (cmd === "version") {
        console.log(p.version);
        process.exit();
    }

    cli_args.cmd = cmd;
    const ok = args_s.safeParse(cli_args);
    if (!ok.success) {
        console.error("CLI args invalid.");
        console.error(ok.error.message);
        console.log(help);
        process.exit(1);
    }

    const args_clean = ok.data;
    return args_clean;
};

const is_uint8ar = (x) => ArrayBuffer.isView(x) && x.constructor === Uint8Array;

const run = async () => {
    const args = get_args_from_cli();

    let i = null;
    if (args.i === null) {
        try {
            i = fs.readFileSync(process.stdin.fd, null);
        } catch (e) {
            console.error(`Reading stdin failed (no --i flag passed via CLI for input file path).`);
            console.error(e);
            console.log(help);
            process.exit(1);
        }
    } else {
        try {
            i = fs.readFileSync(args.i, null);
        } catch (e) {
            console.error(`Could not read input file.`);
            console.error(e);
            console.log(help);
            process.exit(1);
        }
    }

    // Convert Node Buffer to Web Uint8Array.
    // - Use standard web API's, avoid Node API's where possible.
    const i_as_uint8ar = () => new Uint8Array(i.buffer);


    // Converting Buffer => Uint8Array => String causes issues (leading \x00's).
    const i_as_string = () => {
        const str = i.toString();
        return str;
    };


    let out_bytes = null;
    let ext = `.unknown`;

    if (args.cmd === "json_to_excel") {
        const workbook_json = JSON.parse(i_as_string());
        const wb = covert_flat_array_to_nested(workbook_json);

        const x = await json_to_excel(wb);

        out_bytes = x.data.xlsx_bytes;
        ext = ".xlsx";
    }

    if (args.cmd === "excel_to_json") {
        const x = await excel_to_json({
            xlsx_bytes: i_as_uint8ar()
        });


        const e = new TextEncoder();
        out_bytes = e.encode(JSON.stringify(x.data, null, 4));
        ext = ".json";
    }


    if (args.cmd === "json_to_sqlite") {
        // @todo/low Allow 3 types of json: {tables}, [{name: "t1", rows: []}], [...rows] (for both Excel and SQLite).
        // @todo/low Allow an array of rows for a single table.
        const db = convert_flat_to_obj(JSON.parse(i_as_string()));
        const x = await json_to_sqlite(db);

        out_bytes = x.data.sqlite_bytes;
        ext = ".sqlite";
    }

    if (args.cmd === "sqlite_to_json") {
        const x = await sqlite_to_json({
            sqlite_bytes: i_as_uint8ar()
        });

        replace_binary_vals_with_null(x.data);

        // @todo/low Parse JSON stringify'd row values if they start with '{'

        const e = new TextEncoder();
        out_bytes = e.encode(JSON.stringify(x.data, null, 4));
        ext = ".json";
    }


    if (args.cmd === "sqlite_to_excel") {
        const x = await sqlite_to_excel({
            sqlite_bytes: i_as_uint8ar()
        });

        out_bytes = x.data.xlsx_bytes;
        ext = ".xlsx";
    }

    if (args.cmd === "excel_to_sqlite") {
        const x = await excel_to_sqlite({
            xlsx_bytes: i_as_uint8ar()
        });

        out_bytes = x.data.sqlite_bytes;
        ext = ".sqlite";
    }


    // Uint8Array used for wide runtime compatibility (esp browser).
    if (!is_uint8ar(out_bytes)) {
        throw Error("Invalid out_bytes.");
    }


    // When --open is passed without --o file, use a temp file to allow opening it in its associated program (on Desktop GUI's).
    if (args.open === true && args.o === null) {
        const time = (new Date().toISOString()).split("T")[1].replace("Z", "").replace(/[^\d]/g, "_");
        args.o = `/tmp/${time}${ext}`;
    }


    if (_.isString(args.o)) {
        // File
        fs.writeFileSync(args.o, out_bytes);

        if (args.open === true) {
            // Assumption: `spawn` does not allow CLI injection in args.
            // @todo/low On macOS, force Excel to reload when writing to the same file (it does not re-read the file until the app is closed and reopened).
            const x = spawn("open", [args.o], {shell: false});
        }
    } else {
        // Stdout
        // Block until all written to stdout.
        // 1 = stdout, 2 = stderr, 3 = stdin
        fs.writeSync(1, out_bytes);
        fs.fsyncSync(1);
    }


}

run();

