# Build JS bundles for all targets after NPM install.

# When running via package.json `scripts` after install, the first esbuild run seems to fail.
#./node_modules/.bin/esbuild

# esbuild-cli-node.sh
./node_modules/.bin/esbuild ./src/cli.ts --platform=node --bundle --outfile=./dist/cli-node.cjs --loader:.html=text --loader:.wasm=binary --sourcemap --minify


# esbuild-lib-esm.sh
./node_modules/.bin/esbuild ./src/lib.ts --bundle --platform=neutral --outfile=./dist/lib-esm.js --loader:.html=text --loader:.wasm=binary --sourcemap --minify


# esbuild-lib-node.sh
./node_modules/.bin/esbuild ./src/lib.ts --bundle --platform=node --outfile=./dist/lib-node.js --loader:.html=text --loader:.wasm=binary --sourcemap --minify