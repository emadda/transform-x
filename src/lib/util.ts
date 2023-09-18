import _ from "lodash";

const is_dev = () => {
    // process.env["NODE_ENV"]
    // - Bun replaces this with "development" by default.
    // - "production" cannot be set via shebang or via package.json `bin` value.

    return false;
}


const sleep = async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};


// Force Node.js to print out all JSON values instead of excluding them at depth > 2.
const log_json = (x) => {
    // const util = require('util')
    // console.log(util.inspect(x, {showHidden: false, depth: null, colors: true}))
    console.dir(x, {depth: 100});
}

const alpha = "abcdefghijklmnopqrstuvwxyz";
const get_random_alpha_id = (len) => {
    const id = [];
    for (let i = 0; i < len; i++) {
        id.push(_.sample(alpha));
    }
    return id.join("");
}

export {
    is_dev,
    sleep,
    log_json,
    get_random_alpha_id
}