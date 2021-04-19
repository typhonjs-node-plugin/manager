import TestRunner from '@typhonjs-utils/build-test-browser';

(async () =>
{
   await TestRunner.runServerAndTestSuite();
})().catch((err) =>
{
   console.log(err);
   process.exit(1);
});
