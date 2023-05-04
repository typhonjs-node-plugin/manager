import fs               from 'fs';
import path             from 'path';

import resolve          from '@rollup/plugin-node-resolve'; // This resolves NPM modules from node_modules.
import { generateDTS }  from '@typhonjs-build-test/esm-d-ts';

// Extra TS explicit interface as a string.
import interfaces from './src/types/ts-interfaces.js';

await generateDTS({
   input: './src/index.js',
   output: './types/index.d.ts',
   prependGen: ['./src/types/typedef.js'],
   prependString: [interfaces],
   exportCondition: { browser: true }
});

// Add local typedefs.js file to the end of the bundles as a footer.
const footer = fs.readFileSync('./src/types/typedef.js', 'utf-8');

// The deploy path for the distribution for browser & Node.
const s_DIST_PATH_BROWSER = './dist/browser';
const s_DIST_PATH_NODE = './dist/node';

// Produce sourcemaps or not.
const s_SOURCEMAP = true;

export default () =>
{
   return [{   // This bundle is for the Node distribution.
         input: ['src/index.js'],
         output: [{
            file: `${s_DIST_PATH_NODE}${path.sep}PluginManager.js`,
            footer,
            format: 'es',
            generatedCode: { constBindings: true },
            sourcemap: s_SOURCEMAP
         }],
         plugins: [
            resolve({ exportConditions: ['node'] })
         ]
      },

      // This bundle is for the browser distribution.
      {
         input: ['src/index.js'],
         output: [{
            file: `${s_DIST_PATH_BROWSER}${path.sep}PluginManager.js`,
            footer,
            format: 'es',
            generatedCode: { constBindings: true },
            sourcemap: s_SOURCEMAP
         }],
         plugins: [
            resolve({ browser: true })
         ]
      }
   ];
};
