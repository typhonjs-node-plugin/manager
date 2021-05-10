import fs            from 'fs';
import path          from 'path';

import { babel }     from '@rollup/plugin-babel';        // Babel is used for private class fields for browser usage.
import resolve       from '@rollup/plugin-node-resolve'; // This resolves NPM modules from node_modules.
import { terser }    from 'rollup-plugin-terser';        // Terser is used for minification / mangling

// Import config file for Terser
import terserConfig from './terser.config';

// Add local typedefs.js file to the end of the bundles as a footer.
const footer = fs.readFileSync('./src/types/typedef.js', 'utf-8');

// The deploy path for the distribution for browser & Node.
const s_DIST_PATH_BROWSER = './dist/browser';
const s_DIST_PATH_NODE = './dist/node';

// Produce sourcemaps or not.
const s_SOURCEMAP = true;

// Adds Terser to the output plugins for server bundle if true; testing on Node 12.2.0 w/ ESM will set this to false.
const s_MINIFY = typeof process.env.ROLLUP_MINIFY === 'string' ? process.env.ROLLUP_MINIFY === 'true' : true;

export default () =>
{
   const outputPlugins = [];
   if (s_MINIFY)
   {
      outputPlugins.push(terser(terserConfig));
   }

   // Reverse relative path from the deploy path to local directory; used to replace source maps path, so that it
   // shows up correctly in Chrome dev tools.
   // const relativeDistBrowserPath = path.relative(`${s_DIST_PATH_BROWSER}`, '.');
   // const relativeDistNodePath = path.relative(`${s_DIST_PATH_NODE}`, '.');

   return [{   // This bundle is for the Node distribution.
         input: ['src/index.js'],
         output: [{
            file: `${s_DIST_PATH_NODE}${path.sep}PluginManager.js`,
            footer,
            format: 'es',
            plugins: outputPlugins,
            preferConst: true,
            sourcemap: s_SOURCEMAP,
            // sourcemapPathTransform: (sourcePath) => sourcePath.replace(relativeDistNodePath, `.`)
         }],
         plugins: [
            resolve(),
         ]
      },

      // This bundle is for the browser distribution.
      {
         input: ['src/index.js'],
         output: [{
            file: `${s_DIST_PATH_BROWSER}${path.sep}PluginManager.js`,
            footer,
            format: 'es',
            plugins: outputPlugins,
            preferConst: true,
            sourcemap: s_SOURCEMAP,
            // sourcemapPathTransform: (sourcePath) => sourcePath.replace(relativeDistBrowserPath, `.`)
         }],
         plugins: [
            resolve({ browser: true }),
            babel({
               babelHelpers: 'bundled',
               presets: [
                  ['@babel/preset-env', {
                     bugfixes: true,
                     shippedProposals: true,
                     targets: { esmodules: true }
                  }]
               ]
            })
         ]
      }
   ];
};
