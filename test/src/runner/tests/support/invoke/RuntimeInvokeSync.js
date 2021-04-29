export default class Runtime
{
   static run(Module, data, chai)
   {
      const { assert, expect } = chai;

      const PluginManager = Module.default;
      const { PluginInvokeSupport } = Module;

      describe(`PluginInvokeSupport Runtime (invoke sync):`, () =>
      {
         describe('invokeSync:', () =>
         {
            let eventbus, pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
               eventbus = pluginManager.createEventbusProxy();
            });

            it('has invoked one result', async () =>
            {
               await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });

               const result = eventbus.triggerSync('plugins:sync:invoke',
                { method: 'test', args: [1, 2], plugins: 'PluginTestSync' });

               assert.isNumber(result);
               assert.strictEqual(result, 6);
            });

            it('has invoked two result', async () =>
            {
               await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
               await pluginManager.add({ name: 'PluginTestSync2', instance: new data.plugins.PluginTestSync() });

               const result = eventbus.triggerSync('plugins:sync:invoke', { method: 'test', args: [1, 2] });

               assert.isArray(result);
               assert.strictEqual(result[0], 6);
               assert.strictEqual(result[1], 6);
            });

            it('has invoked one result - no args', async () =>
            {
               await pluginManager.add({ name: 'PluginTest', instance: { test: () => { return true; } } });

               const results = eventbus.triggerSync('plugins:sync:invoke', { method: 'test', plugins: 'PluginTest' });

               assert.isBoolean(results);
               assert.isTrue(results);
            });

            it('has invoked two results - no args', async () =>
            {
               await pluginManager.add({ name: 'PluginTest', instance: { test: () => { return true; } } });
               await pluginManager.add({ name: 'PluginTest2', instance: { test: () => { return false; } } });

               const results = eventbus.triggerSync('plugins:sync:invoke', { method: 'test' });

               assert.isArray(results);
               assert.strictEqual(results.length, 2);
               assert.isBoolean(results[0]);
               assert.isBoolean(results[1]);
               assert.isTrue(results[0]);
               assert.isFalse(results[1]);
            });
         });

         describe('invokeSync - options - throwNoPlugins / throwNoMethod true:', () =>
         {
            let eventbus, pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
               pluginManager.setOptions({ throwNoPlugin: true, throwNoMethod: true });
               eventbus = pluginManager.createEventbusProxy();
            });

            it('throws no plugin', () =>
            {
               expect(() => eventbus.triggerSync('plugins:sync:invoke', { method: 'test' })).to.throw(
                Error, `PluginManager failed to find any target plugins.`);
            });

            it('throws no method', async () =>
            {
               await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });

               expect(() => eventbus.triggerSync('plugins:sync:invoke',
                { method: 'badMethod' })).to.throw(Error, `PluginManager failed to invoke 'badMethod'.`);
            });
         });

         describe('invokeSyncEvent:', () =>
         {
            let eventbus, pluginManager, testData;

            beforeEach(() =>
            {
               pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
               eventbus = pluginManager.createEventbusProxy();
               testData = { result: { count: 0 } };
            });

            it('has empty result', () =>
            {
               const event = eventbus.triggerSync('plugins:sync:invoke:event', { method: 'test' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('w/ plugin and missing method has empty event result', async () =>
            {
               await pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               const event = eventbus.triggerSync('plugins:sync:invoke:event', { method: 'nop' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('w/ static plugin and missing method has empty event result', async () =>
            {
               await pluginManager.add(
                { name: 'StaticPluginTest', target: './test/fixture/plugins/StaticPluginTest.js' });

               const event = eventbus.triggerSync('plugins:sync:invoke:event', { method: 'nop' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('w/ module plugin and missing method has empty event result', async () =>
            {
               await pluginManager.add(
                { name: 'modulePluginTest', target: './test/fixture/plugins/modulePluginTest.js' });

               const event = eventbus.triggerSync('plugins:sync:invoke:event', { method: 'nop' });

               assert.isObject(event);
               assert.lengthOf(Object.keys(event), 2);
               assert.strictEqual(event.$$plugin_invoke_count, 0);
            });

            it('instance plugin has valid test / class result (pass through)', async () =>
            {
               await pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               const event = eventbus.triggerSync('plugins:sync:invoke:event',
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

               const event = eventbus.triggerSync('plugins:sync:invoke:event',
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

               const event = eventbus.triggerSync('plugins:sync:invoke:event',
                { method: 'test', passthruProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 1);
               assert.strictEqual(event.$$plugin_invoke_count, 1);
            });

            it('has valid test / object result (pass through)', async () =>
            {
               await pluginManager.add(
                { name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

               const event = eventbus.triggerSync('plugins:sync:invoke:event',
                { method: 'test', passthruProps: testData, plugins: 'objectPluginTest' });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 1);
            });

            it('has invoked both plugins (pass through)', async () =>
            {
               await pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               await pluginManager.add(
                { name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

               const event = eventbus.triggerSync('plugins:sync:invoke:event',
                { method: 'test', passthruProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 2);
               assert.strictEqual(testData.result.count, 2);
            });

            it('has valid test / class result (copy)', async () =>
            {
               await pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               const event = eventbus.triggerSync('plugins:sync:invoke:event', { method: 'test', copyProps: testData });

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

               const event = eventbus.triggerSync('plugins:sync:invoke:event',
                { method: 'test', copyProps: testData, plugins: 'objectPluginTest' });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 1);
               assert.strictEqual(testData.result.count, 0);
            });

            it('has invoked both plugins (copy)', async () =>
            {
               await pluginManager.add({ name: 'PluginTest', instance: new data.plugins.PluginTest() });

               await pluginManager.add(
                { name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

               const event = eventbus.triggerSync('plugins:sync:invoke:event', { method: 'test', copyProps: testData });

               assert.isObject(event);
               assert.strictEqual(event.result.count, 2);
               assert.strictEqual(testData.result.count, 0);
            });
         });

         describe('invokeSyncEvent - options - throwNoPlugins / throwNoMethod true:', () =>
         {
            let eventbus, pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
               pluginManager.setOptions({ throwNoPlugin: true, throwNoMethod: true });
               eventbus = pluginManager.createEventbusProxy();
            });

            it('throws no plugin', () =>
            {
               expect(() => eventbus.triggerSync('plugins:sync:invoke:event', { method: 'test' })).to.throw(
                Error, `PluginManager failed to find any target plugins.`);
            });

            it('throws no method', async () =>
            {
               await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });

               expect(() => eventbus.triggerSync('plugins:sync:invoke:event',
                { method: 'badMethod' })).to.throw(Error, `PluginManager failed to invoke 'badMethod'.`);
            });
         });
      });
   }
}
