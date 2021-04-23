export default class Runtime
{
   static run(Module, data, chai)
   {
      const { assert, expect } = chai;

      const PluginManager = Module.default;
      const { Eventbus, EventbusProxy } = Module;

      describe(`Runtime (${data.suitePrefix}):`, () =>
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

         describe('invokeAsync:', () =>
         {
            let pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager();
            });

            it('promise - has invoked one result (async)', (done) =>
            {
               pluginManager.add({ name: 'PluginTestAsync', instance: new data.plugins.PluginTestAsync() }).then(() =>
               {
                  pluginManager.invokeAsync({ method: 'test', args: [1, 2], plugins: 'PluginTestAsync' }).then(
                   (results) =>
                  {
                     assert.isNumber(results);
                     assert.strictEqual(results, 6);
                     done();
                  });
               });
            });

            it('promise - has invoked two results (async)', (done) =>
            {
               pluginManager.addAll([
                  { name: 'PluginTestAsync', instance: new data.plugins.PluginTestAsync() },
                  { name: 'PluginTestAsync2', instance: new data.plugins.PluginTestAsync() }
               ]).then(() =>
               {
                  pluginManager.invokeAsync({ method: 'test', args: [1, 2] }).then((results) =>
                  {
                     assert.isArray(results);
                     assert.isNumber(results[0]);
                     assert.isNumber(results[1]);
                     assert.strictEqual(results[0], 6);
                     assert.strictEqual(results[1], 6);
                     done();
                  });
               });
            });

            it('async / await - has invoked one result (async)', async () =>
            {
               await pluginManager.add({ name: 'PluginTestAsync', instance: new data.plugins.PluginTestAsync() });

               const results = await pluginManager.invokeAsync(
                { method: 'test', args: [1, 2], plugins: 'PluginTestAsync' });

               assert.isNumber(results);
               assert.strictEqual(results, 6);
            });

            it('async / await - has invoked two results (async)', async () =>
            {
               await pluginManager.add({ name: 'PluginTestAsync', instance: new data.plugins.PluginTestAsync() });
               await pluginManager.add({ name: 'PluginTestAsync2', instance: new data.plugins.PluginTestAsync() });

               const results = await pluginManager.invokeAsync({ method: 'test', args: [1, 2] });

               assert.isArray(results);
               assert.isNumber(results[0]);
               assert.isNumber(results[1]);
               assert.strictEqual(results[0], 6);
               assert.strictEqual(results[1], 6);
            });
         });

         describe('invokeAsyncEvent:', () =>
         {
            let pluginManager, testData;

            beforeEach(() =>
            {
               pluginManager = new PluginManager();
               testData = { result: { count: 0 } };
            });

            it('has empty result', async () =>
            {
               const event = await pluginManager.invokeAsyncEvent({ method: 'test' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('w/ plugin and missing method has empty event result', async () =>
            {
               // No await necessary as instance used.
               pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               const event = await pluginManager.invokeAsyncEvent({ method: 'nop' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('w/ static plugin and missing method has empty event result', async () =>
            {
               await pluginManager.add(
                { name: 'StaticPluginTest', target: './test/fixture/plugins/StaticPluginTest.js' });

               const event = await pluginManager.invokeAsyncEvent({ method: 'nop' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('w/ module plugin and missing method has empty event result', async () =>
            {
               await pluginManager.add(
                { name: 'modulePluginTest', target: './test/fixture/plugins/modulePluginTest.js' });

               const event = await pluginManager.invokeAsyncEvent({ method: 'nop' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('has valid test / class result (pass through)', async () =>
            {
               // No await necessary as instance used.
               pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               const event = await pluginManager.invokeAsyncEvent({ method: 'test', passthruProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 1);
               assert.strictEqual(event.$$plugin_invoke_count, 1);
            });

            it('static plugin has valid test / class result (pass through)', async () =>
            {
               await pluginManager.add(
                { name: 'StaticPluginTest', target: './test/fixture/plugins/StaticPluginTest.js' });

               const event = await pluginManager.invokeAsyncEvent({ method: 'test', passthruProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 1);
               assert.strictEqual(event.$$plugin_invoke_count, 1);
            });

            it('module plugin has valid test / class result (pass through)', async () =>
            {
               await pluginManager.add(
                { name: 'modulePluginTest', target: './test/fixture/plugins/modulePluginTest.js' });

               const event = await pluginManager.invokeAsyncEvent({ method: 'test', passthruProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 1);
               assert.strictEqual(event.$$plugin_invoke_count, 1);
            });

            it('has valid test / object result (pass through)', async () =>
            {
               await pluginManager.add(
                { name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

               const event = await pluginManager.invokeAsyncEvent({ method: 'test', passthruProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 1);
            });

            it('has invoked both plugins (pass through)', async () =>
            {
               // No await necessary as instance used.
               pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               await pluginManager.add(
                { name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

               const event = await pluginManager.invokeAsyncEvent({ method: 'test', passthruProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 2);
               assert.strictEqual(testData.result.count, 2);
            });

            it('has valid test / class result (copy)', async () =>
            {
               // No await necessary as instance used.
               pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               const event = await pluginManager.invokeAsyncEvent({ method: 'test', copyProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 0);
               assert.strictEqual(event.$$plugin_invoke_count, 1);
               assert.strictEqual(event.$$plugin_invoke_names[0], 'PluginTest');
            });

            it('has valid test / object result (copy)', async () =>
            {
               await pluginManager.add(
                { name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

               const event = await pluginManager.invokeAsyncEvent({ method: 'test', copyProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 0);
            });

            it('has invoked both plugins (copy)', async () =>
            {
               // No await necessary as instance used.
               pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               await pluginManager.add(
                { name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

               const event = await pluginManager.invokeAsyncEvent({ method: 'test', copyProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 2);
               assert.strictEqual(testData.result.count, 0);
            });

            it('has invoked both plugins (copy)', async () =>
            {
               await pluginManager.add({ name: 'PluginTestAsync', instance: new data.plugins.PluginTestAsync() });
               await pluginManager.add({ name: 'PluginTestAsync2', instance: new data.plugins.PluginTestAsync() });

               const event = await pluginManager.invokeAsyncEvent({ method: 'test2', copyProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 2);
               assert.strictEqual(testData.result.count, 0);
            });
         });

         describe('invokeSync:', () =>
         {
            let pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager();
            });

            it('has invoked one result', () =>
            {
               pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });

               const result = pluginManager.invokeSync({ method: 'test', args: [1, 2], plugins: 'PluginTestSync' });

               assert.isNumber(result);
               assert.strictEqual(result, 6);
            });

            it('has invoked two result', () =>
            {
               pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
               pluginManager.add({ name: 'PluginTestSync2', instance: new data.plugins.PluginTestSync() });

               const result = pluginManager.invokeSync({ method: 'test', args: [1, 2] });

               assert.isArray(result);
               assert.strictEqual(result[0], 6);
               assert.strictEqual(result[1], 6);
            });
         });

         describe('invokeSyncEvent:', () =>
         {
            let pluginManager, testData;

            beforeEach(() =>
            {
               pluginManager = new PluginManager();
               testData = { result: { count: 0 } };
            });

            it('has empty result', () =>
            {
               const event = pluginManager.invokeSyncEvent({ method: 'test' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('w/ plugin and missing method has empty event result', () =>
            {
               // No await necessary as instance used.
               pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               const event = pluginManager.invokeSyncEvent({ method: 'nop' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('w/ static plugin and missing method has empty event result', async () =>
            {
               await pluginManager.add(
                { name: 'StaticPluginTest', target: './test/fixture/plugins/StaticPluginTest.js' });

               const event = pluginManager.invokeSyncEvent({ method: 'nop' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('w/ module plugin and missing method has empty event result', async () =>
            {
               await pluginManager.add(
                { name: 'modulePluginTest', target: './test/fixture/plugins/modulePluginTest.js' });

               const event = pluginManager.invokeSyncEvent({ method: 'nop' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('instance plugin has valid test / class result (pass through)', () =>
            {
               // No await necessary as instance used.
               pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               const event = pluginManager.invokeSyncEvent({ method: 'test', passthruProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 1);
               assert.strictEqual(event.$$plugin_invoke_count, 1);
            });

            it('static plugin has valid test / class result (pass through)', async () =>
            {
               await pluginManager.add(
                { name: 'StaticPluginTest', target: './test/fixture/plugins/StaticPluginTest.js' });

               const event = pluginManager.invokeSyncEvent({ method: 'test', passthruProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 1);
               assert.strictEqual(event.$$plugin_invoke_count, 1);
            });

            it('module plugin has valid test / class result (pass through)', async () =>
            {
               await pluginManager.add(
                { name: 'modulePluginTest', target: './test/fixture/plugins/modulePluginTest.js' });

               const event = pluginManager.invokeSyncEvent({ method: 'test', passthruProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 1);
               assert.strictEqual(event.$$plugin_invoke_count, 1);
            });

            it('has valid test / object result (pass through)', async () =>
            {
               await pluginManager.add(
                { name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

               const event = pluginManager.invokeSyncEvent({ method: 'test', passthruProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 1);
            });

            it('has invoked both plugins (pass through)', async () =>
            {
               // No await necessary as instance used.
               pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               await pluginManager.add(
                { name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

               const event = pluginManager.invokeSyncEvent({ method: 'test', passthruProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 2);
               assert.strictEqual(testData.result.count, 2);
            });

            it('has valid test / class result (copy)', () =>
            {
               // No await necessary as instance used.
               pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               const event = pluginManager.invokeSyncEvent({ method: 'test', copyProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 0);
               assert.strictEqual(event.$$plugin_invoke_count, 1);
               assert.strictEqual(event.$$plugin_invoke_names[0], 'PluginTest');
            });

            it('has valid test / object result (copy)', async () =>
            {
               await pluginManager.add(
                { name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

               const event = pluginManager.invokeSyncEvent({ method: 'test', copyProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 0);
            });

            it('has invoked both plugins (copy)', async () =>
            {
               // No await necessary as instance used.
               pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               await pluginManager.add(
                { name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

               const event = pluginManager.invokeSyncEvent({ method: 'test', copyProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 2);
               assert.strictEqual(testData.result.count, 0);
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
                  assert.strictEqual(pData[cntr].plugin.type, data.pluginFormats[cntr].type);
               }

               const rData = await pluginManager.removeAll();

               assert.isArray(rData);
               assert.strictEqual(rData.length, pData.length);

               for (const entry of rData)
               {
                  assert.strictEqual(entry.result, true);
               }
            });
         });
      });
   }
}
