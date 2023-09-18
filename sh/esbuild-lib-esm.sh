# Output a ESM module for inclusion via `import`.
# - For use in browser bundles.
# - Has better dead code elimination via bundlers.

# --platform=neutral outputs a ESM module for use via `import`
# @see https://stackoverflow.com/a/75328208/4949386


# `--main-fields=main` as xlsx uses "main" for Node style `require` usage.
# @see https://esbuild.github.io/api/#platform

# Compiles with esbuild but throws error in browser due to `dynamic import of Node.js stream module`
#./node_modules/.bin/esbuild ./src/lib.ts --bundle --platform=neutral --main-fields=main --external:fs --external:stream --outfile=./dist/lib-esm.js --loader:.html=text --loader:.wasm=binary --sourcemap --minify

# Works when using xlsx.mjs instead of Node.js version.
./node_modules/.bin/esbuild ./src/lib.ts --bundle --platform=neutral --outfile=./dist/lib-esm.js --loader:.html=text --loader:.wasm=binary --sourcemap --minify --watch

