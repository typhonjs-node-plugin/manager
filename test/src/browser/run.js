import fs         from 'fs-extra';

import TestRunner from '@typhonjs-utils/build-test-browser';

// Empty / copy test fixtures to web server root.
fs.ensureDirSync('./test/public/test/fixture');
fs.emptyDirSync('./test/public/test/fixture');
fs.copySync('./test/fixture', './test/public/test/fixture');

/**
 * Provides the main async execution function
 *
 * @returns {Promise<void>} A Promise
 */
async function main()
{
   await TestRunner.runServerAndTestSuite({
      reportDir: './coverage-browser',
      // keepAlive: true   // Uncomment to keep HTTP server alive / useful for testing other browsers.
   });
}

main().catch((err) =>
{
   console.log(err);
   process.exit(1);
});
