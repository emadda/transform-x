
## Including SQLite WASM.

- An issue with the official SQLite WASM release (https://www.npmjs.com/package/@sqlite.org/sqlite-wasm) is that it expects to load the sqlite3.wasm file asynchronously at runtime (by using fetch in a web browser, or a file read with Node.js).
	- It purposely does not expose emscripten config args as these may change - cannot be used to customize the wasm loading to read from Uint8Array.
	- The emscripten build creates both the wasm and the JS in a single process so they cannot be easily edited.
	- Emscripten single file mode resulted in WASM that is too large - a post process WASM minify process can be run on the standalone wasm file.

- `transform-x` functions aim to run in any JS runtime with Uint8Array and WebAssembly API's.
	- Example runtimes
		- Web
		- Node.js (testing and CLI)
		- Deno/Bun
		- Cloudflare Workers
		- etc.

	- To achieve this, resolving and including the sqlite3.wasm file is done at compile time using esbuild with a binary file loader.
		- This includes the binary file contents as base64 and decodes it to a Uint8Array at runtime.
		- This makes the SQLite library behave as a regular .ts module (no need to deploy .wasm files alongside the bundle that are read at runtime).
		- This removes the need for different wasm loading logic for each runtime (just use esbuild), but forces library users to use esbuild for its custom binary loader.

## Editing

- `sqlite3-bundler-friendly-edited` is copied from `"./../../../node_modules//@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm"
- `import x from "x.wasm" is added`. When using esbuilds binary loader this becomes Uint8Array.
- createObjectUrl is used to convert the Uint8Array to a URL which is used in the emscripten fetch logic.
- This adds around 2MB to the final JS bundle.


	
- See
  - https://sqlite.org/forum/forumpost/60144fde3d