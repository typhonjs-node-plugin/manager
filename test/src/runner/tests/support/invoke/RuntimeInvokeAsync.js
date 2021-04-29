export default class Runtime
{
   static run(Module, data, chai)
   {
      const { assert, expect } = chai;

      const PluginManager = Module.default;
      const { PluginInvokeSupport } = Module;

      describe(`PluginInvokeSupport Runtime (invoke async):`, () =>
      {
         describe('invokeAsync:', () =>
         {
            let eventbus, pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
               eventbus = pluginManager.createEventbusProxy();
            });

            it('promise - has invoked one result (async)', (done) =>
            {
               pluginManager.add({ name: 'PluginTestAsync', instance: new data.plugins.PluginTestAsync() }).then(() =>
               {
                  eventbus.triggerAsync('plugins:async:invoke',
                   { method: 'test', args: [1, 2], plugins: 'PluginTestAsync' }).then((results) =>
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
                  eventbus.triggerAsync('plugins:async:invoke', { method: 'test', args: [1, 2] }).then((results) =>
                  {
                     assert.isArray(results);
                     assert.strictEqual(results.length, 2);
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

               const results = await eventbus.triggerAsync('plugins:async:invoke',
                { method: 'test', args: [1, 2], plugins: 'PluginTestAsync' });

               assert.isNumber(results);
               assert.strictEqual(results, 6);
            });

            it('async / await - has invoked two results (async)', async () =>
            {
               await pluginManager.add({ name: 'PluginTestAsync', instance: new data.plugins.PluginTestAsync() });
               await pluginManager.add({ name: 'PluginTestAsync2', instance: new data.plugins.PluginTestAsync() });

               const results = await eventbus.triggerAsync('plugins:async:invoke', { method: 'test', args: [1, 2] });

               assert.isArray(results);
               assert.strictEqual(results.length, 2);
               assert.isNumber(results[0]);
               assert.isNumber(results[1]);
               assert.strictEqual(results[0], 6);
               assert.strictEqual(results[1], 6);
            });

            it('async / await - has invoked one result - no args (async)', async () =>
            {
               await pluginManager.add({ name: 'PluginTest', instance: { test: async () => { return true; } } });

               const results = await eventbus.triggerAsync('plugins:async:invoke',
                { method: 'test', plugins: 'PluginTest' });

               assert.isBoolean(results);
               assert.isTrue(results);
            });

            it('async / await - has invoked two results - no args (async)', async () =>
            {
               await pluginManager.add({ name: 'PluginTest', instance: { test: async () => { return true; } } });
               await pluginManager.add({ name: 'PluginTest2', instance: { test: async () => { return false; } } });

               const results = await eventbus.triggerAsync('plugins:async:invoke', { method: 'test' });

               assert.isArray(results);
               assert.strictEqual(results.length, 2);
               assert.isBoolean(results[0]);
               assert.isBoolean(results[1]);
               assert.isTrue(results[0]);
               assert.isFalse(results[1]);
            });

            it('async / await - has invoked two results - one void - no args (async)', async () =>
            {
               await pluginManager.add({ name: 'PluginTest', instance: { test: async () => { return true; } } });
               await pluginManager.add({ name: 'PluginTest2', instance: { test: async () => {} } });

               const results = await eventbus.triggerAsync('plugins:async:invoke', { method: 'test' });

               assert.isBoolean(results);
               assert.isTrue(results);
            });

            it('async / await - has invoked two results - both void - no args (async)', async () =>
            {
               await pluginManager.add({ name: 'PluginTest', instance: { test: async () => {} } });
               await pluginManager.add({ name: 'PluginTest2', instance: { test: async () => {} } });

               const results = await eventbus.triggerAsync('plugins:async:invoke', { method: 'test' });

               assert.isUndefined(results);
            });
         });

         describe('invokeAsync - options - throwNoPlugins / throwNoMethod true:', () =>
         {
            let eventbus, pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
               pluginManager.setOptions({ throwNoPlugin: true, throwNoMethod: true });
               eventbus = pluginManager.createEventbusProxy();
            });

            it('throws no plugin', async () =>
            {
               await expect(eventbus.triggerAsync('plugins:async:invoke', { method: 'test' })).to.be.rejectedWith(
                Error, `PluginManager failed to find any target plugins.`);
            });

            it('throws no method', async () =>
            {
               await pluginManager.add({ name: 'PluginTestAsync', instance: new data.plugins.PluginTestAsync() });

               await expect(eventbus.triggerAsync('plugins:async:invoke',
                { method: 'badMethod' })).to.be.rejectedWith(Error, `PluginManager failed to invoke 'badMethod'.`);
            });
         });

         describe('invokeAsyncEvent:', () =>
         {
            let eventbus, pluginManager, testData;

            beforeEach(() =>
            {
               pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
               eventbus = pluginManager.createEventbusProxy();
               testData = { result: { count: 0 } };
            });

            it('has empty result', async () =>
            {
               const event = await eventbus.triggerAsync('plugins:async:invoke:event', { method: 'test' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('w/ plugin and missing method has empty event result', async () =>
            {
               // No await necessary as instance used.
               pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               const event = await eventbus.triggerAsync('plugins:async:invoke:event', { method: 'nop' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('w/ static plugin and missing method has empty event result', async () =>
            {
               await pluginManager.add(
                { name: 'StaticPluginTest', target: './test/fixture/plugins/StaticPluginTest.js' });

               const event = await eventbus.triggerAsync('plugins:async:invoke:event', { method: 'nop' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('w/ module plugin and missing method has empty event result', async () =>
            {
               await pluginManager.add(
                { name: 'modulePluginTest', target: './test/fixture/plugins/modulePluginTest.js' });

               const event = await eventbus.triggerAsync('plugins:async:invoke:event', { method: 'nop' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('has valid test / class result (pass through)', async () =>
            {
               // No await necessary as instance used.
               pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               const event = await eventbus.triggerAsync('plugins:async:invoke:event',
                { method: 'test', passthruProps: testData, plugins: 'PluginTest' });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 1);
               assert.strictEqual(event.$$plugin_invoke_count, 1);
            });

            it('static plugin has valid test / class result (pass through)', async () =>
            {
               await pluginManager.add(
                { name: 'StaticPluginTest', target: './test/fixture/plugins/StaticPluginTest.js' });

               const event = await eventbus.triggerAsync('plugins:async:invoke:event',
                { method: 'test', passthruProps: testData, plugins: 'StaticPluginTest' });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 1);
               assert.strictEqual(event.$$plugin_invoke_count, 1);
            });

            it('module plugin has valid test / class result (pass through)', async () =>
            {
               await pluginManager.add(
                { name: 'modulePluginTest', target: './test/fixture/plugins/modulePluginTest.js' });

               const event = await eventbus.triggerAsync('plugins:async:invoke:event',
                { method: 'test', passthruProps: testData, plugins: 'modulePluginTest' });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 1);
               assert.strictEqual(event.$$plugin_invoke_count, 1);
            });

            it('has valid test / object result (pass through)', async () =>
            {
               await pluginManager.add(
                { name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

               const event = await eventbus.triggerAsync('plugins:async:invoke:event',
                { method: 'test', passthruProps: testData, plugins: 'objectPluginTest' });

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

               const event = await eventbus.triggerAsync('plugins:async:invoke:event',
                { method: 'test', passthruProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 2);
               assert.strictEqual(testData.result.count, 2);
            });

            it('has valid test / class result (copy)', async () =>
            {
               // No await necessary as instance used.
               pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               const event = await eventbus.triggerAsync('plugins:async:invoke:event',
                { method: 'test', copyProps: testData, plugins: 'PluginTest' });

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

               const event = await eventbus.triggerAsync('plugins:async:invoke:event',
                { method: 'test', copyProps: testData, plugins: 'objectPluginTest' });

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

               const event = await eventbus.triggerAsync('plugins:async:invoke:event',
                { method: 'test', copyProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 2);
               assert.strictEqual(testData.result.count, 0);
            });

            it('has invoked both plugins (copy)', async () =>
            {
               await pluginManager.add({ name: 'PluginTestAsync', instance: new data.plugins.PluginTestAsync() });
               await pluginManager.add({ name: 'PluginTestAsync2', instance: new data.plugins.PluginTestAsync() });

               const event = await eventbus.triggerAsync('plugins:async:invoke:event',
                { method: 'test2', copyProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 2);
               assert.strictEqual(testData.result.count, 0);
            });
         });

         describe('invokeAsyncEvent - options - throwNoPlugins / throwNoMethod true:', () =>
         {
            let eventbus, pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
               pluginManager.setOptions({ throwNoPlugin: true, throwNoMethod: true });
               eventbus = pluginManager.createEventbusProxy();
            });

            it('throws no plugin', async () =>
            {
               await expect(eventbus.triggerAsync('plugins:async:invoke:event', { method: 'test' })).to.be.rejectedWith(
                Error, `PluginManager failed to find any target plugins.`);
            });

            it('throws no method', async () =>
            {
               await pluginManager.add({ name: 'PluginTestAsync', instance: new data.plugins.PluginTestAsync() });

               await expect(eventbus.triggerAsync('plugins:async:invoke:event',
                { method: 'badMethod' })).to.be.rejectedWith(Error, `PluginManager failed to invoke 'badMethod'.`);
            });
         });
      });
   }
}
