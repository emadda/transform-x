# transform-x

JS functions to convert between JSON, SQLite and Excel. 

Use via:

- [JS library](#use-as-a-js-library)
- [CLI](#clis)
- [Web UI](https://transform-x.dev)
- [HTTP API](https://api.transform-x.dev)


Portable: Aims to work in any web standards compatible JS runtime (browser, Node.js, Deno, Bun, Cloudflare Workers).


## Use as a JS library

`npm install transform-x`

```js
// Use with Node.js
const x = require("transform-x");
x.json_to_sqlite;


// Use with vanilla JS ESM (web bundle)
import {json_to_excel, sqlite_to_json} from "transform-x";


// Use with Typescript (web bundle)
import {json_to_excel, sqlite_to_json} from "transform-x/src/lib";
```

See [tests](./tests) directory for function usage examples.

## Web UI

You can convert between formats in your browser at [transform-x.dev](https://transform-x.dev).

## CLI's

- JSON ↔ Excel
	- `json_to_excel`
	- `excel_to_json`

- JSON ↔ SQLite
	- `json_to_sqlite`
	- `sqlite_to_json`

- SQLite ↔ Excel 
	- `sqlite_to_excel`
	- `excel_to_sqlite`

## Install

```bash
# This installs `$x_to_$y` CLI's that can be auto completed in your terminal with tab.
npm install -g transform-x
```

## JSON ↔ Excel

```bash
# Provide both files as args.
json_to_excel --i ./input.json --o ./output.xlsx

# Use stdin (single sheet)
echo '[{"x": 2}, {"x": 3, "y": {"h": 1}}]' | json_to_excel --o ./output.xlsx

# Use stdout
json_to_excel --i ./input.json >./output.xlsx

# Write output to temp file, open in Excel app (macOS only).
echo '[{"x": 2}, {"x": 3, "y": {"h": 1}}]' | json_to_excel --open


# Pipe SQLite query result to Excel.
sqlite3 -json db.sqlite "select * from tbl_a" | json_to_excel --open
```

## JSON ↔ SQLite

```bash
# Provide both files as args.
json_to_sqlite --i ./input.json --o ./output.sqlite

# Use stdin (single table)
echo '[{"x": 2}, {"x": 3, "y": {"h": 1}}]' | json_to_sqlite --o ./output.sqlite

# Use stdout
json_to_sqlite --i ./input.json >./output.sqlite

# Write output to temp file, open in native desktop GUI (macOS only).
echo '[{"x": 2}, {"x": 3, "y": {"h": 1}}]' | json_to_sqlite --open
```

## CLI limits

- `sqlite_to_json`
	- SQLite/JSON limited to around 500MB in size.
		- SQLite files are read/written using JS RAM (as WASM is used).
		- JSON output is [limited to between 500MB to 1GB in size](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/length#description) as this is the size limit of a JS string.

	- Binary values will be set to null in the output JSON.

