# Output a `require` compatible build for users using Node.js with vanilla JS.
./node_modules/.bin/esbuild ./src/lib.ts --bundle --platform=node --outfile=./dist/lib-node.js --loader:.html=text --loader:.wasm=binary --sourcemap --minify
