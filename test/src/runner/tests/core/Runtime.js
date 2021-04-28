export default class Runtime
{
   static run(Module, data, chai)
   {
      const { assert, expect } = chai;

      const PluginManager = Module.default;
      const { Eventbus, EventbusProxy } = Module;

      describe(`Core Runtime (${data.suitePrefix}):`, () =>
      {
         describe('Type checks:', () =>
         {
            let pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager();
            });

            it('constructor function is exported', () =>
            {
               assert.isFunction(PluginManager);
            });

            it('instance is object', () =>
            {
               assert.isObject(pluginManager);
            });

            it('returns EventbusProxy for createEventbusProxy when eventbus is assigned', () =>
            {
               assert.isTrue(pluginManager.createEventbusProxy() instanceof EventbusProxy);
            });
         });

         describe('Various methods:', () =>
         {
            let eventbus, pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager();
               eventbus = pluginManager.createEventbusProxy();
            });

            it('get all plugin data', async () =>
            {
               await pluginManager.addAll(
               [
                  { name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() },
                  { name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() }
               ], { name: 'modulename' });

               let results = pluginManager.getPluginData();

               assert.isArray(results);
               assert.strictEqual(JSON.stringify(results),
                '[{"manager":{"eventPrepend":"plugins","scopedName":"plugins:PluginTestSync"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestSync","target":"PluginTestSync","targetEscaped":"PluginTestSync","type":"instance","options":{}}},{"manager":{"eventPrepend":"plugins","scopedName":"plugins:PluginTestNoName2"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestNoName2","target":"PluginTestNoName2","targetEscaped":"PluginTestNoName2","type":"instance","options":{}}}]');

               results = eventbus.triggerSync('plugins:get:plugin:data');

               assert.isArray(results);
               assert.strictEqual(JSON.stringify(results),
                '[{"manager":{"eventPrepend":"plugins","scopedName":"plugins:PluginTestSync"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestSync","target":"PluginTestSync","targetEscaped":"PluginTestSync","type":"instance","options":{}}},{"manager":{"eventPrepend":"plugins","scopedName":"plugins:PluginTestNoName2"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestNoName2","target":"PluginTestNoName2","targetEscaped":"PluginTestNoName2","type":"instance","options":{}}}]');
            });

            it('get plugin data', async () =>
            {
               await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() },
                { name: 'modulename' });

               let results = pluginManager.getPluginData({ plugins: 'PluginTestSync' });

               assert.isObject(results);
               assert.strictEqual(JSON.stringify(results),
                '{"manager":{"eventPrepend":"plugins","scopedName":"plugins:PluginTestSync"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestSync","target":"PluginTestSync","targetEscaped":"PluginTestSync","type":"instance","options":{}}}');

               results = eventbus.triggerSync('plugins:get:plugin:data', { plugins: 'PluginTestSync' });

               assert.isObject(results);
               assert.strictEqual(JSON.stringify(results),
                '{"manager":{"eventPrepend":"plugins","scopedName":"plugins:PluginTestSync"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestSync","target":"PluginTestSync","targetEscaped":"PluginTestSync","type":"instance","options":{}}}');
            });

            it('get plugin event names', async () =>
            {
               await pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               await pluginManager.add({ name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

               let results = eventbus.triggerSync('plugins:get:plugin:events');

               assert.strictEqual(JSON.stringify(results),
                '[{"plugin":"PluginTest","events":["test:trigger","test:trigger2","test:trigger3"]},{"plugin":"objectPluginTest","events":["test:trigger","test:trigger4","test:trigger5"]}]');

               results = eventbus.triggerSync('plugins:get:plugin:events', { plugins: 'PluginTest' });

               assert.strictEqual(JSON.stringify(results),
                '["test:trigger","test:trigger2","test:trigger3"]');

               results = eventbus.triggerSync('plugins:get:plugin:events', { plugins: 'objectPluginTest' });

               assert.strictEqual(JSON.stringify(results),
                '["test:trigger","test:trigger4","test:trigger5"]');
            });

            it('get plugin name from event name', async () =>
            {
               await pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               await pluginManager.add({ name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

               let results = eventbus.triggerSync('plugins:get:plugin:by:event', { event: 'test:trigger' });

               assert.strictEqual(JSON.stringify(results), '["PluginTest","objectPluginTest"]');

               results = eventbus.triggerSync('plugins:get:plugin:by:event', { event: 'test:trigger2' });

               assert.strictEqual(JSON.stringify(results), '["PluginTest"]');

               results = eventbus.triggerSync('plugins:get:plugin:by:event', { event: 'test:trigger4' });

               assert.strictEqual(JSON.stringify(results), '["objectPluginTest"]');
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

            it('setEventbus - EventbusSecure updates', async () =>
            {
               const eventbus2 = new Eventbus('eventbus2');
               const eventbusSecure = pluginManager.createEventbusSecure();

               await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
               await pluginManager.add({ name: 'PluginTestSync2', instance: new data.plugins.PluginTestSync() });

               let results = eventbusSecure.triggerSync('plugins:get:plugin:names');

               assert.isArray(results);
               assert.lengthOf(results, 2);
               assert.strictEqual(results[0], 'PluginTestSync');
               assert.strictEqual(results[1], 'PluginTestSync2');

               results = eventbusSecure.triggerSync('plugin:test:sync:test', 1, 2);
               assert.isArray(results);
               assert.lengthOf(results, 2);
               assert.strictEqual(results[0], 6);
               assert.strictEqual(results[1], 6);

               await pluginManager.setEventbus({ eventbus: eventbus2, eventPrepend: 'plugins2' });

               assert.strictEqual(eventbusSecure.name, 'eventbus2');

               results = eventbusSecure.triggerSync('plugins2:get:plugin:names');

               assert.isArray(results);
               assert.lengthOf(results, 2);
               assert.strictEqual(results[0], 'PluginTestSync');
               assert.strictEqual(results[1], 'PluginTestSync2');

               results = eventbusSecure.triggerSync('plugin:test:sync:test', 1, 2);

               assert.isArray(results);
               assert.lengthOf(results, 2);
               assert.strictEqual(results[0], 6);
               assert.strictEqual(results[1], 6);
            });
         });

         describe('Multiple Invocations / Sequences:', () =>
         {
            let pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager();
            });

            it('EventbusProxy is destroyed when plugin manager destroyed.', async () =>
            {
               const eventbusProxy = pluginManager.createEventbusProxy();

               await pluginManager.destroy();

               expect(() => eventbusProxy.eventCount).to.throw(ReferenceError,
                'This EventbusProxy instance has been destroyed.');
            });

            it('EventbusProxy shows correct proxy event count.', async () =>
            {
               const eventbus = new Eventbus();
               pluginManager = new PluginManager({ eventbus });

               const eventCount = eventbus.eventCount;

               const eventbusProxy = pluginManager.createEventbusProxy();

               eventbusProxy.on('a:test', () => { /***/ });

               assert.strictEqual(eventbus.eventCount, eventCount + 1);
               assert.strictEqual(eventbusProxy.eventCount, eventCount + 1);
               assert.strictEqual(eventbusProxy.proxyEventCount, 1);

               eventbusProxy.off();

               assert.strictEqual(eventbus.eventCount, eventCount);
               assert.strictEqual(eventbusProxy.eventCount, eventCount);
               assert.strictEqual(eventbusProxy.proxyEventCount, 0);

               await pluginManager.destroy();
            });

            it('module loader add multiple', async () =>
            {
               let pData;

               for (const entry of data.pluginFormats)
               {
                  pData = await pluginManager.add(entry);
                  assert.strictEqual(pData.plugin.type, entry.type);
               }
            });

            it('module loader addAll / removeAll', async () =>
            {
               const pData = await pluginManager.addAll(data.pluginFormats);

               assert.isArray(pData);
               assert.strictEqual(pData.length, data.pluginFormats.length);

               for (let cntr = 0; cntr < pData.length; cntr++)
               {
                  assert.strictEqual(pData[cntr].plugin.name, data.pluginFormats[cntr].name);
                  assert.strictEqual(pData[cntr].plugin.type, data.pluginFormats[cntr].type);
               }

               const rData = await pluginManager.removeAll();

               assert.isArray(rData);
               assert.strictEqual(rData.length, pData.length);

               for (const entry of rData)
               {
                  assert.strictEqual(entry.success, true);
               }
            });
         });
      });
   }
}
