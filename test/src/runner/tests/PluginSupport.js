// const s_ALL_EVENTS = [
//    'plugins:get:method:names',
//    'plugins:get:plugin:data',
//    'plugins:get:plugin:events',
//    'plugins:get:plugin:method:names',
//    'plugins:get:plugin:names',
//    'plugins:get:plugins:by:event:name',
//    'plugins:has:method',
//    'plugins:has:plugin:method'
// ];

export default class APIErrorsPluginSupport
{
   static run(Module, data, chai)
   {
      const { assert } = chai;

      const PluginManager = Module.default;
      const { Eventbus, PluginSupport } = Module;

      describe('PluginSupport:', () =>
      {
         let eventbus, pluginManager;

         beforeEach(() =>
         {
            pluginManager = new PluginManager({ PluginSupport });
            eventbus = pluginManager.getEventbus();
         });

         it('destroy() invoked when plugin manager is destroyed', async () =>
         {
            assert.isAtLeast(eventbus.eventCount, 20);

            await pluginManager.destroy();

            assert.strictEqual(eventbus.eventCount, 0);

            assert.strictEqual(pluginManager._pluginSupport.length, 0);
         });

         it('get all unique method names', async () =>
         {
            await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
            await pluginManager.add({ name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() });

            const results = eventbus.triggerSync('plugins:get:method:names');

            assert.isArray(results);
            assert.lengthOf(results, 2);
            assert.strictEqual(results[0], 'test');
            assert.strictEqual(results[1], 'test2');
         });

         it('get method names for plugin', async () =>
         {
            await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
            await pluginManager.add({ name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() });

            const results = eventbus.triggerSync('plugins:get:method:names', { plugins: 'PluginTestSync' });

            assert.isArray(results);
            assert.lengthOf(results, 1);
            assert.strictEqual(results[0], 'test');
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
