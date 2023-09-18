
#./node_modules/.bin/esbuild ./src/core.ts --bundle --outfile=./dist/core.js --minify --watch --sourcemap

# Note: `.cjs` is needed to avoid the error `ReferenceError: require is not defined in ES module scope, you can use import instead` when using commonjs `require` for Node stdlib fns.
./node_modules/.bin/esbuild ./src/cli.ts --platform=node --bundle --outfile=./dist/cli-node.cjs --loader:.html=text --loader:.wasm=binary --watch --sourcemap
