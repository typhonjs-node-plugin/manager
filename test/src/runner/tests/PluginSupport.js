// const s_ALL_EVENTS = [
//    'plugins:get:all:plugin:data',
//    'plugins:get:method:names',
//    'plugins:get:plugin:data',
//    'plugins:get:plugin:event:names',
//    'plugins:get:plugin:method:names',
//    'plugins:get:plugin:names',
//    'plugins:get:plugin:options',
//    'plugins:get:plugins:by:event:name',
//    'plugins:get:plugins:event:names',
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

         it('get all plugin data', async () =>
         {
            await pluginManager.addAll(
            [
               { name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() },
               { name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() }
            ], { name: 'modulename' });

            const results = eventbus.triggerSync('plugins:get:all:plugin:data');

            assert.isArray(results);

            assert.strictEqual(JSON.stringify(results),
             '[{"manager":{"eventPrepend":"plugins"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestSync","scopedName":"plugins:PluginTestSync","target":"PluginTestSync","targetEscaped":"PluginTestSync","type":"instance","options":{}}},{"manager":{"eventPrepend":"plugins"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestNoName2","scopedName":"plugins:PluginTestNoName2","target":"PluginTestNoName2","targetEscaped":"PluginTestNoName2","type":"instance","options":{}}}]');
         });

         it('get unique method names', async () =>
         {
            await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
            await pluginManager.add({ name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() });

            const results = eventbus.triggerSync('plugins:get:method:names');

            assert.isArray(results);
            assert.lengthOf(results, 2);
            assert.strictEqual(results[0], 'test');
            assert.strictEqual(results[1], 'test2');
         });

         it('get plugin data', async () =>
         {
            await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() },
             { name: 'modulename' });

            const results = eventbus.triggerSync('plugins:get:plugin:data', 'PluginTestSync');

            assert.isObject(results);

            assert.strictEqual(JSON.stringify(results),
             '{"manager":{"eventPrepend":"plugins"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestSync","scopedName":"plugins:PluginTestSync","target":"PluginTestSync","targetEscaped":"PluginTestSync","type":"instance","options":{}}}');
         });

         it('get plugin event names', async () =>
         {
            await pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

            await pluginManager.add({ name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

            let results = eventbus.triggerSync('plugins:get:plugins:event:names');

            assert.strictEqual(JSON.stringify(results),
             '[{"pluginName":"PluginTest","events":["test:trigger","test:trigger2","test:trigger3"]},{"pluginName":"objectPluginTest","events":["test:trigger","test:trigger4","test:trigger5"]}]');

            results = eventbus.triggerSync('plugins:get:plugins:event:names', 'PluginTest');

            assert.strictEqual(JSON.stringify(results),
             '[{"pluginName":"PluginTest","events":["test:trigger","test:trigger2","test:trigger3"]}]');

            results = eventbus.triggerSync('plugins:get:plugins:event:names', 'objectPluginTest');

            assert.strictEqual(JSON.stringify(results),
             '[{"pluginName":"objectPluginTest","events":["test:trigger","test:trigger4","test:trigger5"]}]');
         });

         it('get plugin name from event name', async () =>
         {
            await pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

            await pluginManager.add({ name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

            let results = eventbus.triggerSync('plugins:get:plugins:by:event:name', 'test:trigger');

            assert.strictEqual(JSON.stringify(results), '["PluginTest","objectPluginTest"]');

            results = eventbus.triggerSync('plugins:get:plugins:by:event:name', 'test:trigger2');

            assert.strictEqual(JSON.stringify(results), '["PluginTest"]');

            results = eventbus.triggerSync('plugins:get:plugins:by:event:name', 'test:trigger4');

            assert.strictEqual(JSON.stringify(results), '["objectPluginTest"]');
         });

         it('get plugin / method names', async () =>
         {
            await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
            await pluginManager.add({ name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() });

            const results = eventbus.triggerSync('plugins:get:plugin:method:names');

            assert.isArray(results);
            assert.lengthOf(results, 2);
            assert.strictEqual(results[0].plugin, 'PluginTestSync');
            assert.strictEqual(results[0].method, 'test');
            assert.strictEqual(results[1].plugin, 'PluginTestNoName2');
            assert.strictEqual(results[1].method, 'test2');
         });

         it('get plugin names', async () =>
         {
            await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
            await pluginManager.add({ name: 'PluginTestSync2', instance: new data.plugins.PluginTestSync() });

            const results = eventbus.triggerSync('plugins:get:plugin:names');

            assert.isArray(results);
            assert.lengthOf(results, 2);
            assert.strictEqual(results[0], 'PluginTestSync');
            assert.strictEqual(results[1], 'PluginTestSync2');
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