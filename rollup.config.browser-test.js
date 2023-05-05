/**
 * ATTENTION: This Rollup configuration file bundles up the separate subpath exports for the main package and the
 * `eventbus` subpath export. The main package is bundled to `./test/public/PluginManager.js` and the `eventbus`
 * subpath export is bundled to `./test/public/Eventbus.js`. There is an import map in `./test/public/index.html` that
 * redirects `#eventbus` to the `Eventbus.js` bundle. `#eventbus` is marked as an external in the main
 * `PluginManager.js` bundle.
 *
 * In `test/public/index.html` the script section imports both `PluginManager.js` passing that on to the tests as
 * `Module` and the `Eventbus.js` file as `ModuleEB`.
 */

import path                from 'node:path';

import istanbul            from 'rollup-plugin-istanbul';      // Adds Istanbul instrumentation.
import resolve             from '@rollup/plugin-node-resolve'; // This resolves NPM modules from node_modules.

// The test browser distribution is bundled to `./test/public`.
const s_TEST_BROWSER_PATH = './test/public';

// Produce sourcemaps or not.
const s_SOURCEMAP = true;

const relativeTestBrowserPath = path.relative(`${s_TEST_BROWSER_PATH}`, '.');

export default () =>
{
   return [
      { // This bundle is for `eventbus` subpath export.
         input: './src/eventbus/index.js',
         output: [{
            file: `${s_TEST_BROWSER_PATH}/Eventbus.js`,
            format: 'es',
            generatedCode: { constBindings: true },
            sourcemap: s_SOURCEMAP,
            sourcemapPathTransform: (sourcePath) => sourcePath.replace(relativeTestBrowserPath, `.`)
         }],
         plugins: [
            resolve()
         ]
      },

      { // This bundle is the main package export and includes Istanbul instrumentation for coverage.
         input: './src/index.js',
         external: ['#eventbus'],
         output: [{
            file: `${s_TEST_BROWSER_PATH}/PluginManager.js`,
            format: 'es',
            generatedCode: { constBindings: true },
            sourcemap: s_SOURCEMAP,
            sourcemapPathTransform: (sourcePath) => sourcePath.replace(relativeTestBrowserPath, `.`)
         }],
         plugins: [
            resolve({ browser: true }),
            istanbul()
         ]
      },

      // This bundle is the test suite
      {
         input: './test/src/runner/TestsuiteRunner.js',
         output: [{
            file: `${s_TEST_BROWSER_PATH}/TestsuiteRunner.js`,
            format: 'es',
            generatedCode: { constBindings: true },
         }],
         plugins: [
            resolve({ browser: true })
         ]
      }
   ];
};
