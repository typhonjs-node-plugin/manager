import resolve             from '@rollup/plugin-node-resolve'; // This resolves NPM modules from node_modules.
import { generateDTS }     from '@typhonjs-build-test/esm-d-ts';
import { importsExternal } from "@typhonjs-build-test/rollup-external-imports";

// Produce sourcemaps or not.
const sourcemap = true;

// Bundle all top level external package exports.
const dtsPluginOptions = { bundlePackageExports: true };

export default () =>
{
   return [
      {   // This bundle is for the Node distribution.
         input: './src/eventbus/index.js',
         output: [{
            file: `./dist/eventbus/index.js`,
            format: 'es',
            generatedCode: { constBindings: true },
            sourcemap
         }],
         plugins: [
            importsExternal(),
            resolve(),
            generateDTS.plugin(dtsPluginOptions)
         ]
      },

      {   // This bundle is for the Node distribution.
         input: './src/manager/index.js',
         output: [{
            file: `./dist/manager/node/index.js`,
            format: 'es',
            generatedCode: { constBindings: true },
            sourcemap
         }],
         plugins: [
            importsExternal(),
            resolve({ exportConditions: ['node', 'import'] }),
            generateDTS.plugin()
         ]
      },

      // This bundle is for the browser distribution.
      {
         input: './src/manager/index.js',
         output: [{
            file: `./dist/manager/browser/index.js`,
            format: 'es',
            generatedCode: { constBindings: true },
            sourcemap
         }],
         plugins: [
            importsExternal(),
            resolve({ exportConditions: ['browser', 'import'] }),
            generateDTS.plugin()
         ]
      }
   ];
};
