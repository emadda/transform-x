# Notes

- This repo vendors in `sql.js` to enable Emscriptens `emcc SINGLE_FILE=1` mode.
	- This embeds the .wasm file into the JS file.
	- This is important as the default is to retrieve it at runtime (via download or reading from the file system with Node.js)
		- This forces deploying the .wasm alongside the JS bundle for web, or using Node.js.
		- Bundling the .wasm file allows using it from any JS runtime.
			- E.g Cloudflare Workers, Deno, Bun etc.
			- It allows using a single `import` to use any of the functions without having to load a .wasm outside the bundler process.
	- To enable web:
		- `emcc ENVIRONMENT=web`
			- Prevents using `require("fs")` Node import which breaks esbuild with `--platform=neutral` (ESM module).
		- `emcc --closure 0` 
			- Must be set with the above otherwise Closure Compiler will rewrite the `columns` key on an object which prevents it being red.
	   - Assumption: `web` typically works in Node.js too as its just pure JS (only uses v8 built in functions or web standard API's). 


- The official SQLite WASM build does not support WAL mode files.
	- See https://sqlite.org/forum/forumpost/e0b0c56e09
		- Note: It is possible to clear bytes 18/19 to change a db file from wal-mode to non-wal-mode.

- See https://github.com/emscripten-core/emscripten/issues/20025
  - `locateFile` should allow `Uint8Array` and data URL.
  - But it does not, so recompiling with SINGLE_FILE=1 is needed.



- Cloudflare Workers.
	- Some edits to the emscripted JS/WASM code were needed.
		- See comment on `sql-wasm-edited.js`
		- Diff the `edited` with `original` to see changes.
	- Steps.
		- 1. Extract the WASM binary from base64 embedded string into .wasm file, place into CF worker by importing the .wasm file.
		- 2. Replace `{credentials: "same-origin"}` to avoid `Error: The 'credentials' field on 'RequestInitializerDict' is not implemented.`
			- This is a bug in the CF runtime.
		- 3. Avoid `WebAssembly.instantiate(wasm_binary)` as this is not allowed on CF workers as it is a form of code generation.
			- Use `WebAssembly.instantiate(wasm_module)`, where the `wasm_module` comes from `import wasm_module from "wasm_binary.wasm"` in the CF worker.


## Build issues

- `.devcontainer` does not work on Mac M1 (linux/arm64).
	- This is a vscode editor plugin that mounts the source directory into a Docker container.
	- Both the Dockerfile FROM and its dependencies installed during build require x86 (linux/amd64).

- `brew install emscripten` does not work.
	- The build process relies on an older emscripten (3.1.20)
	- `brew` does not support installing older versions.
	





