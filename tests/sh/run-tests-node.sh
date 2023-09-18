# Run this from ./tests dir

# All
#node --test --watch --enable-source-maps 01-lib-excel-json/01.test.js 02-cli-excel-json/02.test.js 03-lib-sqlite-json/03.test.js


# Single
#node --test --watch --enable-source-maps 03-lib-sqlite-json/03.test.js

#nodemon --exec "clear && printf '\e[3J'; node --test --enable-source-maps 03-lib-sqlite-json/03.test.js";



# All
npx jest --colors \
./01-lib-excel-json/01.test.js \
./02-cli-excel-json/02.test.js \
./03-lib-sqlite-json/03.test.js \
./04-cli-sqlite-json/04.test.js \
./05-lib-sqlite-excel/05.test.js;


# Single
# Use `jest` to avoid `node --test`'s line by line output which truncates JSON values.
#npx jest --colors --watch 01-lib-excel-json/01.test.js
#npx jest --colors --watch 02-cli-excel-json/02.test.js
#npx jest --colors --watch 03-lib-sqlite-json/03.test.js
#npx jest --colors --watch 04-cli-sqlite-json/04.test.js
#npx jest --colors --watch 05-lib-sqlite-excel/05.test.js

