export default class Runtime
{
   static run(Module, data, chai)
   {
      const { assert } = chai;

      const PluginManager = Module.default;
      const { Eventbus, PluginInvokeSupport } = Module;

      describe('PluginInvokeSupport Runtime:', () =>
      {
         let eventbus, pluginManager;

         beforeEach(() =>
         {
            pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
            eventbus = pluginManager.getEventbus();
         });

         it('destroy() invoked when plugin manager is destroyed', async () =>
         {
            assert.isAtLeast(eventbus.eventCount, 20);

            await pluginManager.destroy();

            assert.strictEqual(eventbus.eventCount, 0);
         });

         it('get all unique method names', async () =>
         {
            await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
            await pluginManager.add({ name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() });

            const results = eventbus.triggerSync('plugins:get:method:names');

            assert.isArray(results);
            assert.lengthOf(results, 3);
            assert.strictEqual(results[0], 'onPluginLoad');
            assert.strictEqual(results[1], 'test');
            assert.strictEqual(results[2], 'test2');
         });

         it('get method names for plugin', async () =>
         {
            await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
            await pluginManager.add({ name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() });

            const results = eventbus.triggerSync('plugins:get:method:names', { plugins: 'PluginTestSync' });

            assert.isArray(results);
            assert.lengthOf(results, 2);
            assert.strictEqual(results[0], 'onPluginLoad');
            assert.strictEqual(results[1], 'test');
         });

         it('setEventbus() unregisters old eventbus / registers on new eventbus', async () =>
         {
            assert.isAtLeast(eventbus.eventCount, 20);

            const newEventbus = new Eventbus('newEventbus');

            await pluginManager.setEventbus({ eventbus: newEventbus });

            assert.strictEqual(eventbus.eventCount, 0);
            assert.isAtLeast(newEventbus.eventCount, 20);

            assert.strictEqual(pluginManager.getEventbus().name, 'newEventbus');
         });
      });
   }
}
