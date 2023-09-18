#!/usr/bin/env bash

# This builds sql-js using emscripten with the SINGLE_FILE=1 argument (include wasm into a single JS file).
# - Including the .wasm file in the JS cannot be done any other way as emscripten does not support it.
# @see readme-sql-js.md
# @see # https://github.com/sql-js/sql.js

# Install emscripten
# @see https://emscripten.org/docs/getting_started/downloads.html

# May install needed dependencies.
#brew install emscripten
#brew uninstall emscripten

#git clone https://github.com/emscripten-core/emsdk.git
#./emsdk install 3.1.20
#./emsdk activate 3.1.20
# Append PATH edit to shell config.

# Build
rm -rf sql-js
git clone https://github.com/sql-js/sql.js sql-js
cd sql-js || exit
git checkout v1.8.0

# Makefile changes: Set SINGLE_FILE=1, add FTS5 module.
rm Makefile
cp ./../sql-js-build/in/Makefile ./Makefile

make

cp dist/sql-wasm.js ./../sql-js-build/out/sql-wasm.js


# rm -rf dist/* && make && cp dist/sql-wasm.js ./../sql-js-build/out
# - To rebuild after a Makefile edit without re-running this script.