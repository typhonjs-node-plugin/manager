import path          from 'path';

import istanbul      from 'rollup-plugin-istanbul';
import resolve       from '@rollup/plugin-node-resolve'; // This resolves NPM modules from node_modules.
import { terser }    from 'rollup-plugin-terser';        // Terser is used for minification / mangling

// Import config files for Terser and Postcss; refer to respective documentation for more information.
import terserConfig  from './terser.config';

// Basic directories paths. The `foundry.js` client code is bundled to `./public` in order to serve it via `http-server`
const s_TEST_PATH = './test/fixture/public';

// The deploy path for the server bundle which includes the common code.
const s_DEPLOY_PATH = './dist';

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
   const relativeClientPath = path.relative(`${s_TEST_PATH}`, '.');
   const relativeServerPath = path.relative(`${s_DEPLOY_PATH}`, '.');

   // This bundle is for the test client.
   return [{
      input: ['src/browser/index.js'],
      output: [{
         file: `${s_TEST_PATH}${path.sep}BrowserPluginManager.js`,
         format: 'es',
         plugins: outputPlugins,
         preferConst: true,
         sourcemap: s_SOURCEMAP,
         sourcemapPathTransform: (sourcePath) => sourcePath.replace(relativeClientPath, `.`)
      }],
      plugins: [
         resolve({ browser: true }),
         // istanbul()
         istanbul({ include: ['src/browser/BrowserPluginManager.js'] })
      ]
   },

      // This bundle is for the distribution.
      {
         input: ['src/browser/index.js'],
         output: [{
            file: `${s_DEPLOY_PATH}${path.sep}BrowserPluginManager.js`,
            format: 'es',
            plugins: outputPlugins,
            preferConst: true,
            sourcemap: s_SOURCEMAP,
            sourcemapPathTransform: (sourcePath) => sourcePath.replace(relativeServerPath, `.`)
         }],
         plugins: [
            resolve({ browser: true })
         ]
      }];
};
