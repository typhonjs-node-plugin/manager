import path     from 'path';

import istanbul from 'rollup-plugin-istanbul';      // Adds Istanbul instrumentation.
import resolve  from '@rollup/plugin-node-resolve'; // This resolves NPM modules from node_modules.

// The test browser distribution is bundled to `./test/live-server`.
const s_TEST_BROWSER_PATH = './test/live-server';

// Produce sourcemaps or not.
const s_SOURCEMAP = true;

const relativeTestBrowserPath = path.relative(`${s_TEST_BROWSER_PATH}`, '.');

export default () =>
{
   // Ignore circular dependency from @typhonjs-plugin/eventbus as it is valid.
   const onwarn = (warning) =>
   {
      if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message.match(/@typhonjs-plugin\/eventbus/)) { return; }
      console.error(`(!) ${warning.message}`);
   };

   return [{ // This bundle is for the Istanbul instrumented browser test.
         input: ['src/browser/index.js'],
         output: [{
            file: `${s_TEST_BROWSER_PATH}/PluginManager.js`,
            format: 'es',
            preferConst: true,
            sourcemap: s_SOURCEMAP,
            sourcemapPathTransform: (sourcePath) => sourcePath.replace(relativeTestBrowserPath, `.`)
         }],
         plugins: [
            resolve({ browser: true }),
            istanbul()
         ],
         onwarn
      },

      // This bundle is the test suite
      {
         input: ['test/src/runner/TestSuiteRunner.js'],
         output: [{
            file: `${s_TEST_BROWSER_PATH}/TestSuiteRunner.js`,
            format: 'es',
            preferConst: true
         }]
      }
   ];
};
