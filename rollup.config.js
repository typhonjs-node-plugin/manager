import path          from 'path';

import istanbul      from 'rollup-plugin-istanbul';      // Adds Istanbul instrumentation.
import resolve       from '@rollup/plugin-node-resolve'; // This resolves NPM modules from node_modules.
import { terser }    from 'rollup-plugin-terser';        // Terser is used for minification / mangling

// Import config files for Terser and Postcss; refer to respective documentation for more information.
import terserConfig  from './terser.config';

// The deploy path for the distribution for browser & Node.
const s_DIST_PATH_BROWSER = './dist/browser';
const s_DIST_PATH_NODE = './dist/node';

// The test browser distribution is bundled to `./test/fixture/public`.
const s_TEST_BROWSER_PATH = './test/fixture/public';

// Produce sourcemaps or not.
const s_SOURCEMAP = true;

// Adds Terser to the output plugins for server bundle if true.
const s_MINIFY = false;

export default () =>
{
   // Defines potential output plugins to use conditionally if the .env file indicates the bundles should be
   // minified / mangled.
   const outputPlugins = [];
   if (s_MINIFY)
   {
      outputPlugins.push(terser(terserConfig));
   }

   // Reverse relative path from the deploy path to local directory; used to replace source maps path, so that it
   // shows up correctly in Chrome dev tools.
   const relativeDistBrowserPath = path.relative(`${s_DIST_PATH_BROWSER}`, '.');
   // const relativeDistNodePath = path.relative(`${s_DIST_PATH_NODE}`, '.');
   const relativeTestBrowserPath = path.relative(`${s_TEST_BROWSER_PATH}`, '.');

   return [{   // This bundle is for the Node distribution.
         input: ['src/node/index.js'],
         output: [{
            file: `${s_DIST_PATH_NODE}${path.sep}PluginManager.js`,
            format: 'es',
            plugins: outputPlugins,
            preferConst: true,
            sourcemap: s_SOURCEMAP,
//            sourcemapPathTransform: (sourcePath) => sourcePath.replace(relativeDistNodePath, `.`)
         }],
         plugins: [
            resolve(),
         ]
      },

      // This bundle is for the browser distribution.
      {
         input: ['src/browser/index.js'],
         output: [{
            file: `${s_DIST_PATH_BROWSER}${path.sep}PluginManager.js`,
            format: 'es',
            plugins: outputPlugins,
            preferConst: true,
            sourcemap: s_SOURCEMAP,
            sourcemapPathTransform: (sourcePath) => sourcePath.replace(relativeDistBrowserPath, `.`)
         }],
         plugins: [
            resolve({ browser: true })
         ]
      },

      // This bundle is for the Istanbul instrumented browser test.
      {
         input: ['src/browser/index.js'],
         output: [{
            file: `${s_TEST_BROWSER_PATH}${path.sep}PluginManager.js`,
            format: 'es',
            plugins: outputPlugins,
            preferConst: true,
            sourcemap: s_SOURCEMAP,
            sourcemapPathTransform: (sourcePath) => sourcePath.replace(relativeTestBrowserPath, `.`)
         }],
         plugins: [
            resolve({ browser: true }),
            istanbul()
         ]
      }
   ];
};
