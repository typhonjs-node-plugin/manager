export default class Runtime
{
   static run(Module, data, chai)
   {
      const { assert } = chai;

      const PluginManager = Module.default;

      describe(`Runtime (${data.suitePrefix}):`, () =>
      {
         describe('invoke:', () =>
         {
            let pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager();
            });

            it('invoke - has invoked with no results', () =>
            {
               let invoked = false;

               pluginManager.add({ name: 'PluginTestSync', instance: { test: () => { invoked = true; } } });

               pluginManager.invoke({ method: 'test', plugins: 'PluginTestSync' });

               assert.strictEqual(invoked, true);
            });
         });
      });
   }
}
