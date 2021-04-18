import fs      from 'fs-extra';
import path    from 'path';

import dotenv  from 'dotenv';

fs.ensureDirSync('./.nyc_output');
fs.emptyDirSync('./.nyc_output');

fs.ensureDirSync('./coverage');
fs.emptyDirSync('./coverage');

// Load Puppeteer environment variables:
// process.env.PUPPETEER_BIN
// process.env.PUPPETEER_HEADLESS
dotenv.config({ path: `.${path.sep}env${path.sep}browser.env` });
