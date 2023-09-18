#./node_modules/.bin/esbuild ./src/core.ts --bundle --outfile=./dist/core.js --minify --watch --sourcemap

# `outbase` causes parent directories to be created (like mkdir -p) for output files.
./../node_modules/.bin/esbuild \
./01-lib-excel-json/01.test.ts \
./02-cli-excel-json/02.test.ts \
./03-lib-sqlite-json/03.test.ts \
./04-cli-sqlite-json/04.test.ts \
./05-lib-sqlite-excel/05.test.ts \
--platform=node --format=cjs --bundle --outdir=./ --outbase=./ --loader:.html=text --loader:.wasm=binary --watch --sourcemap;
