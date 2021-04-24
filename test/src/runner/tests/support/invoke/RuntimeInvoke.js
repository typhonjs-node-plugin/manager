export default class Runtime
{
   static run(Module, data, chai)
   {
      const { assert } = chai;

      const PluginManager = Module.default;
      const { PluginInvokeSupport } = Module;

      describe(`Runtime (${data.suitePrefix}):`, () =>
      {
         describe('invoke:', () =>
         {
            let eventbus, pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
               eventbus = pluginManager.createEventbusProxy();
            });

            it('invoke - has invoked with no results', () =>
            {
               let invoked = false;

               pluginManager.add({ name: 'PluginTestSync', instance: { test: () => { invoked = true; } } });

               eventbus.trigger('plugins:invoke', { method: 'test', plugins: 'PluginTestSync' });

               assert.strictEqual(invoked, true);
            });
         });
      });
   }
}
