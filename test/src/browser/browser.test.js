import fs         from 'fs-extra';
import path       from 'path';

import LiveServer from 'five-server';

import puppeteer  from 'puppeteer-core';

const liveServer = new LiveServer.default();

describe('Browser:', () =>
{
   after('Shutdown:', async () =>
   {
      await liveServer.shutdown();
   });

   before('Start live server:', async () =>
   {
      await liveServer.start({
         root: path.resolve('./test/fixture/public'),
         port: 8080,
         open: false,
      });
   });

   it('sanity check', async () =>
   {
      const browser = await puppeteer.launch({
         executablePath: process.env.PUPPETEER_BIN,
         headless: process.env.PUPPETEER_HEADLESS === 'true',
      });

      // const browser = await puppeteer.launch({ headless: false });
      const page = await browser.newPage();

      // Navigate to page
      await page.goto('http://localhost:8080/', { waitUntil: 'load' });

      await page.waitForTimeout(2000);

      const coverage = await page.evaluate(() => window.__coverage__);  // eslint-disable-line no-undef

      fs.writeJsonSync(`./.nyc_output/out.json`, coverage);

      await browser.close();
   });
});
