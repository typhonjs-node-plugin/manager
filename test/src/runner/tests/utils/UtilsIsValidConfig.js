/**
 * @param {object}                           opts - Test options
 *
 * @param {import('../../../../../types')}   opts.Module - Module to test
 *
 * @param {object}                           opts.data - Extra test data.
 *
 * @param {object}                           opts.chai - Chai
 */
export function run({ Module, data, chai })
{
   const { assert } = chai;

   const { isValidConfig } = Module;
   const PluginManager = Module.default;

   describe('Utility (PluginConfig):', () =>
   {
      describe('isValidConfig:', () =>
      {
         it('is valid', () =>
         {
            assert.isTrue(isValidConfig({ name: 'test' }));
            assert.isTrue(isValidConfig({ name: 'test', target: 'target' }));
            assert.isTrue(isValidConfig({ name: 'test', target: 'target', options: {} }));
            assert.isTrue(isValidConfig({ name: 'test', options: {} }));
            assert.isTrue(isValidConfig({
               name: 'test',
               target: data.moduleURL
            }));
            assert.isTrue(isValidConfig({
               name: 'test',
               target: data.moduleURLString
            }));
         });

         it('is invalid', () =>
         {
            assert.isFalse(isValidConfig());
            assert.isFalse(isValidConfig({}));
            assert.isFalse(isValidConfig({ name: 123 }));
            assert.isFalse(isValidConfig({ target: 'target' }));
            assert.isFalse(isValidConfig({ options: {} }));
            assert.isFalse(isValidConfig({ name: 'test', target: 123 }));
            assert.isFalse(isValidConfig({ name: 'test', target: 'target', options: 123 }));
            assert.isFalse(isValidConfig({ name: 'test', options: 123 }));
         });
      });

      describe(`${data.scopedName} -> isValidConfig:`, () =>
      {
         let pluginManager;

         beforeEach(() =>
         {
            pluginManager = new PluginManager();
         });

         it('PluginConfig is valid', () =>
         {
            assert.isTrue(pluginManager.isValidConfig({ name: 'test' }));
            assert.isTrue(pluginManager.isValidConfig({ name: 'test', target: 'target' }));
            assert.isTrue(pluginManager.isValidConfig({ name: 'test', target: 'target', options: {} }));
            assert.isTrue(pluginManager.isValidConfig({ name: 'test', options: {} }));
            assert.isTrue(pluginManager.isValidConfig({
               name: 'test',
               target: data.moduleURL
            }));
            assert.isTrue(pluginManager.isValidConfig({
               name: 'test',
               target: data.moduleURLString
            }));
         });

         it('PluginConfig is invalid', () =>
         {
            assert.isFalse(pluginManager.isValidConfig());
            assert.isFalse(pluginManager.isValidConfig({}));
            assert.isFalse(pluginManager.isValidConfig({ name: 123 }));
            assert.isFalse(pluginManager.isValidConfig({ target: 'target' }));
            assert.isFalse(pluginManager.isValidConfig({ options: {} }));
            assert.isFalse(pluginManager.isValidConfig({ name: 'test', target: 123 }));
            assert.isFalse(pluginManager.isValidConfig({ name: 'test', target: 'target', options: 123 }));
            assert.isFalse(pluginManager.isValidConfig({ name: 'test', options: 123 }));
         });
      });
   });
}
