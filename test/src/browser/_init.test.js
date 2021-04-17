import path    from 'path';

import dotenv  from 'dotenv';

// Load Puppeteer environment variables:
// process.env.PUPPETEER_BIN
// process.env.PUPPETEER_HEADLESS
dotenv.config({ path: `.${path.sep}env${path.sep}browser.env` });
