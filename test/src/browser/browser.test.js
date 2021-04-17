import fs         from 'fs';
import path       from 'path';

import LiveServer from 'five-server';

import puppeteer  from 'puppeteer-core';

const liveServer = new LiveServer.default();

describe('Browser:', () =>
{
   it('sanity check', async () =>
   {
      await liveServer.start({
         root: path.resolve('./test/fixture/public'),
         port: 8080,
         open: false,
      });

      const browser = await puppeteer.launch({
         executablePath: process.env.PUPPETEER_BIN,
         headless: process.env.PUPPETEER_HEADLESS,
      });

      // const browser = await puppeteer.launch({ headless: false });
      const page = await browser.newPage();

      // Navigate to page
      await page.goto('http://localhost:8080/', { waitUntil: 'load' });

      await page.waitForTimeout(2000);

      const coverage = await page.evaluate(() => window.__coverage__);  // eslint-disable-line no-undef

      if (!fs.existsSync('.nyc_output')) { fs.mkdirSync('.nyc_output'); }

      fs.writeFileSync(`./.nyc_output/out.json`, JSON.stringify(coverage, null, 3));

      await browser.close();
      await liveServer.shutdown();
   });
});
