import fs         from 'fs-extra';

import TestRunner from '@typhonjs-utils/build-test-browser';

// Empty / copy test fixtures to web server root.
fs.ensureDirSync('./test/live-server/test/fixture');
fs.emptyDirSync('./test/live-server/test/fixture');
fs.copySync('./test/fixture', './test/live-server/test/fixture');

(async () =>
{
   await TestRunner.runServerAndTestSuite();
})().catch((err) =>
{
   console.log(err);
   process.exit(1);
});
