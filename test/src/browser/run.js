import fs         from 'fs-extra';
import path       from 'path';

import dotenv     from 'dotenv';
import LiveServer from 'five-server';
import puppeteer  from 'puppeteer-core';

const liveServer = new LiveServer.default();

const s_IGNORE_FIVE_SERVER = /^\[Five Server]/;
const s_MOCHA_END_STATE = /^\[MOCHA_/;

const s_MOCHA_FAILED = '[MOCHA_FAILED]';

fs.ensureDirSync('./.nyc_output');
fs.emptyDirSync('./.nyc_output');

fs.ensureDirSync('./coverage');
fs.emptyDirSync('./coverage');

// Load Puppeteer environment variables:
// process.env.PUPPETEER_BIN
// process.env.PUPPETEER_HEADLESS
dotenv.config({ path: `.${path.sep}env${path.sep}browser.env` });

/**
 * Wait for console message.
 *
 * @param {object}         frame - Frame object.
 *
 * @param {string|RegExp}  ack - Text to match ro resolve Promise.
 *
 * @param {string|RegExp}  [nak] - Text to match ro reject Promise.
 *
 * @returns {Promise<string>} Text matching ack / nak condition.
 */
function waitForMessage(frame, ack, nak)
{
   return new Promise((resolve, reject) =>
   {
      const handler = (msg) =>
      {
         const text = msg.text();

         const ackMatch = text.match(ack);

         if (ackMatch)
         {
            frame.removeListener('console', handler);
            resolve(text);
         }

         if (nak)
         {
            const nakMatch = msg.text().match(nak);

            if (nakMatch)
            {
               frame.removeListener('console', handler);
               reject(text);
            }
         }
      };

      frame.on('console', handler);
   });
}

(async () =>
{
   await liveServer.start({
      root: path.resolve('./test/live-server'),
      port: 8080,
      open: false,
      quiet: true
   });

   const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_BIN,
      headless: process.env.PUPPETEER_HEADLESS === 'true',
   });

   // const browser = await puppeteer.launch({ headless: false });
   const page = await browser.newPage();

   page.on('console', async (e) =>
   {
      const text = e.text();

      // Ignore any five-server logging or Mocha end state message.
      if (s_IGNORE_FIVE_SERVER.test(text) || s_MOCHA_END_STATE.test(text)) { return; }

      // Parse arguments to properly log warnings with string substitution.
      const args = await Promise.all(e.args().map((a) => a.jsonValue()));
      console[e.type() === 'warning' ? 'warn' : e.type()](...args);
   });

   const finishTests = waitForMessage(page, s_MOCHA_END_STATE);

   // Navigate to page
   await page.goto('http://localhost:8080/', { waitUntil: 'load' });

   const mochaEndState = await finishTests;

   const coverage = await page.evaluate(() => window.__coverage__);  // eslint-disable-line no-undef

   if (coverage !== void 0)
   {
      fs.writeJsonSync(`./.nyc_output/out.json`, coverage);
   }

   await browser.close();
   await liveServer.shutdown();

   // Exit with failure state if browser tests failed.
   if (s_MOCHA_FAILED === mochaEndState) { process.exit(1); }
})();
