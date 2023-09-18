import _ from "lodash";

import fs from "fs";
import util from "util";
import {exec as exec0} from "child_process";
import {get_random_alpha_id} from "../../src/lib/util.ts";

const exec = util.promisify(exec0);

const setup_tests = () => {
    const jestConsole = console;

    beforeEach(() => {
        global.console = require('console');
    });

    afterEach(() => {
        global.console = jestConsole;
    });
}



// Use an obj_ref per test run to get a unique dir per test run.
const get_dir = async (obj_ref) => {
    if (!_.isString(obj_ref?.dir)) {
        const random = get_random_alpha_id(4);
        obj_ref.dir = `/tmp/transform-x-tests/${new Date().toISOString().replace(/[TZ]/g, "").replace(/[^\d]/g, "_")}_${random}`
        const x = await exec(`mkdir -p ${obj_ref.dir}`);
    }
    return obj_ref.dir;
}


export {
    setup_tests,
    get_dir
}