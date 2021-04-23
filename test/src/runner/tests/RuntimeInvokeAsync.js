export default class Runtime
{
   static run(Module, data, chai)
   {
      const { assert } = chai;

      const PluginManager = Module.default;

      describe(`Runtime (${data.suitePrefix}):`, () =>
      {
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
      });
   }
}
