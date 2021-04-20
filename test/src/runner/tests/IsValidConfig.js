export default class IsValidConfig
{
   static run(Module, data, chai)
   {
      const { assert } = chai;

      const { isValidConfig } = Module;
      const PluginManager = Module.default;

      describe('PluginConfig checks:', () =>
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

         describe(`${data.suitePrefix} -> isValidConfig:`, () =>
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
}
