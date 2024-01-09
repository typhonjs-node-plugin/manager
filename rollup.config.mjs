import resolve             from '@rollup/plugin-node-resolve';
import { generateDTS }     from '@typhonjs-build-test/esm-d-ts';
import {
   importsExternal,
   importsResolve }        from '@typhonjs-build-test/rollup-plugin-pkg-imports';

// Produce sourcemaps or not.
const sourcemap = true;

// Bundle all top level external package exports.
const dtsEventbusOptions = { bundlePackageExports: true };

export default () =>
{
   return [
      {   // This bundle is for the main eventbus subpath export
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
            generateDTS.plugin(dtsEventbusOptions)
         ]
      },

      {   // This bundle is for the pre-defined eventbus buses subpath export
         input: './src/eventbus/buses/index.js',
         output: [{
            file: `./dist/eventbus/buses/index.js`,
            format: 'es',
            generatedCode: { constBindings: true },
            sourcemap
         }],
         plugins: [
            importsExternal(),
            resolve(),
            generateDTS.plugin(dtsEventbusOptions)
         ]
      },

      {   // This bundle is for the plugin manager Node distribution.
         input: './src/manager/index.js',
         output: [{
            file: `./dist/manager/node/index.js`,
            format: 'es',
            generatedCode: { constBindings: true },
            sourcemap
         }],
         plugins: [
            importsExternal({ importKeys: ['#runtime/plugin/manager/*'] }),
            importsResolve({
               exportConditions: ['node', 'import'],
               importKeys: ['#runtime/util/loader-module', '#runtime/util/object'] }
            ),
            resolve({ exportConditions: ['node', 'import'] }),
            generateDTS.plugin()
         ]
      },

      // This bundle is for the plugin manager browser distribution.
      {
         input: './src/manager/index.js',
         output: [{
            file: `./dist/manager/browser/index.js`,
            format: 'es',
            generatedCode: { constBindings: true },
            sourcemap
         }],
         plugins: [
            importsExternal({ importKeys: ['#runtime/plugin/manager/*'] }),
            importsResolve({
               exportConditions: ['browser', 'import'],
               importKeys: ['#runtime/util/loader-module', '#runtime/util/object']
            }),
            resolve({ exportConditions: ['browser', 'import'] }),
            generateDTS.plugin()
         ]
      }
   ];
};
