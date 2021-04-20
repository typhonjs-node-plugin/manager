import path          from 'path';

import resolve       from '@rollup/plugin-node-resolve'; // This resolves NPM modules from node_modules.
import { terser }    from 'rollup-plugin-terser';        // Terser is used for minification / mangling

// Import config files for Terser and Postcss; refer to respective documentation for more information.
import terserConfig  from './terser.config';

// The deploy path for the distribution for browser & Node.
const s_DIST_PATH_BROWSER = './dist/browser';
const s_DIST_PATH_NODE = './dist/node';

// Produce sourcemaps or not.
const s_SOURCEMAP = true;

// Adds Terser to the output plugins for server bundle if true.
const s_MINIFY = typeof process.env.ROLLUP_MINIFY === 'string' ? process.env.ROLLUP_MINIFY === 'true' : true;

console.log(`!!!!!! rollup.config - process.env.ROLLUP_MINIFY: ${process.env.ROLLUP_MINIFY}\ns_MINIFY: ${s_MINIFY}`);

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
   // const relativeDistBrowserPath = path.relative(`${s_DIST_PATH_BROWSER}`, '.');
   // const relativeDistNodePath = path.relative(`${s_DIST_PATH_NODE}`, '.');

   // Ignore circular dependency from @typhonjs-plugin/eventbus as it is valid.
   const onwarn = (warning) =>
   {
      if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message.match(/@typhonjs-plugin\/eventbus/)) { return; }
      console.error(`(!) ${warning.message}`);
   };

   return [{   // This bundle is for the Node distribution.
         input: ['src/node/index.js'],
         output: [{
            file: `${s_DIST_PATH_NODE}${path.sep}PluginManager.js`,
            format: 'es',
            plugins: outputPlugins,
            preferConst: true,
            sourcemap: s_SOURCEMAP,
            // sourcemapPathTransform: (sourcePath) => sourcePath.replace(relativeDistNodePath, `.`)
         }],
         plugins: [
            resolve(),
         ],
         onwarn
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
            // sourcemapPathTransform: (sourcePath) => sourcePath.replace(relativeDistBrowserPath, `.`)
         }],
         plugins: [
            resolve({ browser: true })
         ],
         onwarn
      }
   ];
};
