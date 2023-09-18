# Test `npm install --global`

# Remove prev run.
npm uninstall -g transform-x

rm -f ./../dist || true
rm -f /tmp/transform-x-0.0.1.tgz || true

npm pack --pack-destination /tmp

# Note:
# - `better-sqlite` compiles SQLite from source - takes around 30 seconds on M1.
# - `npm install ./local-dir` does not install `node_modules`, or run the `postinstall` scripts.
npm install --loglevel verbose --global /tmp/transform-x-0.0.1.tgz


exa --sort cr --reverse -lha /opt/homebrew/bin | rg "node_modules" | rg "transform-x"


#npm root -g
exa -lha --tree --level 2 /opt/homebrew/lib/node_modules/transform-x;