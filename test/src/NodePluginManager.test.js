import path                from 'path';
import url                 from 'url';

import { assert, expect }  from 'chai';

import Eventbus            from '@typhonjs-plugin/eventbus';
import { EventbusProxy }   from '@typhonjs-plugin/eventbus';

import NodePluginManager   from '../../src/node/NodePluginManager.js';

import PluginTest          from './plugins/PluginTest.js';
import PluginTestAsync     from './plugins/PluginTestAsync.js';
import PluginTestNoName2   from './plugins/PluginTestNoName2.js';
import PluginTestSync      from './plugins/PluginTestSync.js';

describe('NodePluginManager:', () =>
{
   let pluginManager, testData;

   beforeEach(() =>
   {
      pluginManager = new NodePluginManager();
      testData = { result: { count: 0 } };
   });

   it('constructor function is exported', () =>
   {
      assert.isFunction(NodePluginManager);
   });

   it('instance is object', () =>
   {
      assert.isObject(pluginManager);
   });

   it('invokeAsyncEvent - throws when called with empty parameters', async () =>
   {
      try
      {
         await pluginManager.invokeAsyncEvent();
      }
      catch (err)
      {
         return;
      }

      throw new Error('invokeAsyncEvent should have thrown an error');
   });

   it('invokeSyncEvent - throws when called with empty parameters', () =>
   {
      assert.throws(() => { pluginManager.invokeSyncEvent(); });
   });

   it('throws w/ add (no options)', async () =>
   {
      try
      {
         await pluginManager.add();
      }
      catch (err)
      {
         return;
      }

      throw new Error('No error thrown: should not reach here!');
   });

   it('returns EventbusProxy for createEventbusProxy when eventbus is assigned', () =>
   {
      assert.isTrue(pluginManager.createEventbusProxy() instanceof EventbusProxy);
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
      pluginManager = new NodePluginManager({ eventbus });

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

   it('invokeAsyncEvent - has empty result', async () =>
   {
      const event = await pluginManager.invokeAsyncEvent('test');

      assert.isObject(event);
      assert.lengthOf(Object.keys(event), 2);
      assert.strictEqual(event.$$plugin_invoke_count, 0);
   });

   it('invokeSyncEvent - has empty result', () =>
   {
      const event = pluginManager.invokeSyncEvent('test');

      assert.isObject(event);
      assert.lengthOf(Object.keys(event), 2);
      assert.strictEqual(event.$$plugin_invoke_count, 0);
   });

   it('invokeAsyncEvent - w/ plugin and missing method has empty event result', async () =>
   {
      // No await necessary as instance used.
      pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

      const event = await pluginManager.invokeAsyncEvent('nop');

      assert.isObject(event);
      assert.lengthOf(Object.keys(event), 2);
      assert.strictEqual(event.$$plugin_invoke_count, 0);
   });

   it('invokeAsyncEvent - w/ static plugin and missing method has empty event result', async () =>
   {
      await pluginManager.add({ name: 'StaticPluginTest', target: './test/src/plugins/StaticPluginTest.js' });

      const event = await pluginManager.invokeAsyncEvent('nop');

      assert.isObject(event);
      assert.lengthOf(Object.keys(event), 2);
      assert.strictEqual(event.$$plugin_invoke_count, 0);
   });

   it('invokeAsyncEvent - w/ module plugin and missing method has empty event result', async () =>
   {
      await pluginManager.add({ name: 'modulePluginTest', target: './test/src/plugins/modulePluginTest.js' });

      const event = await pluginManager.invokeAsyncEvent('nop');

      assert.isObject(event);
      assert.lengthOf(Object.keys(event), 2);
      assert.strictEqual(event.$$plugin_invoke_count, 0);
   });

   it('invokeSyncEvent - w/ plugin and missing method has empty event result', () =>
   {
      // No await necessary as instance used.
      pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

      const event = pluginManager.invokeSyncEvent('nop');

      assert.isObject(event);
      assert.lengthOf(Object.keys(event), 2);
      assert.strictEqual(event.$$plugin_invoke_count, 0);
   });

   it('invokeSyncEvent - w/ static plugin and missing method has empty event result', async () =>
   {
      await pluginManager.add({ name: 'StaticPluginTest', target: './test/src/plugins/StaticPluginTest.js' });

      const event = pluginManager.invokeSyncEvent('nop');

      assert.isObject(event);
      assert.lengthOf(Object.keys(event), 2);
      assert.strictEqual(event.$$plugin_invoke_count, 0);
   });

   it('invokeSyncEvent - w/ module plugin and missing method has empty event result', async () =>
   {
      await pluginManager.add({ name: 'modulePluginTest', target: './test/src/plugins/modulePluginTest.js' });

      const event = pluginManager.invokeSyncEvent('nop');

      assert.isObject(event);
      assert.lengthOf(Object.keys(event), 2);
      assert.strictEqual(event.$$plugin_invoke_count, 0);
   });

   it('invokeAsyncEvent - has valid test / class result (pass through)', async () =>
   {
      // No await necessary as instance used.
      pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

      const event = await pluginManager.invokeAsyncEvent('test', void 0, testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 1);
      assert.strictEqual(testData.result.count, 1);
      assert.strictEqual(event.$$plugin_invoke_count, 1);
   });

   it('invokeAsyncEvent - static plugin has valid test / class result (pass through)', async () =>
   {
      await pluginManager.add({ name: 'StaticPluginTest', target: './test/src/plugins/StaticPluginTest.js' });

      const event = await pluginManager.invokeAsyncEvent('test', void 0, testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 1);
      assert.strictEqual(testData.result.count, 1);
      assert.strictEqual(event.$$plugin_invoke_count, 1);
   });

   it('invokeAsyncEvent - module plugin has valid test / class result (pass through)', async () =>
   {
      await pluginManager.add({ name: 'modulePluginTest', target: './test/src/plugins/modulePluginTest.js' });

      const event = await pluginManager.invokeAsyncEvent('test', void 0, testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 1);
      assert.strictEqual(testData.result.count, 1);
      assert.strictEqual(event.$$plugin_invoke_count, 1);
   });

   it('invokeSyncEvent - instance plugin has valid test / class result (pass through)', () =>
   {
      // No await necessary as instance used.
      pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

      const event = pluginManager.invokeSyncEvent('test', void 0, testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 1);
      assert.strictEqual(testData.result.count, 1);
      assert.strictEqual(event.$$plugin_invoke_count, 1);
   });

   it('invokeSyncEvent - static plugin has valid test / class result (pass through)', async () =>
   {
      await pluginManager.add({ name: 'StaticPluginTest', target: './test/src/plugins/StaticPluginTest.js' });

      const event = pluginManager.invokeSyncEvent('test', void 0, testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 1);
      assert.strictEqual(testData.result.count, 1);
      assert.strictEqual(event.$$plugin_invoke_count, 1);
   });

   it('invokeSyncEvent - module plugin has valid test / class result (pass through)', async () =>
   {
      await pluginManager.add({ name: 'modulePluginTest', target: './test/src/plugins/modulePluginTest.js' });

      const event = pluginManager.invokeSyncEvent('test', void 0, testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 1);
      assert.strictEqual(testData.result.count, 1);
      assert.strictEqual(event.$$plugin_invoke_count, 1);
   });

   it('invokeAsyncEvent - has valid test / object result (pass through)', async () =>
   {
      await pluginManager.add({ name: 'objectPluginTest', target: './test/src/plugins/objectPluginTest.js' });

      const event = await pluginManager.invokeAsyncEvent('test', void 0, testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 1);
      assert.strictEqual(testData.result.count, 1);
   });

   it('invokeSyncEvent - has valid test / object result (pass through)', async () =>
   {
      await pluginManager.add({ name: 'objectPluginTest', target: './test/src/plugins/objectPluginTest.js' });

      const event = pluginManager.invokeSyncEvent('test', void 0, testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 1);
      assert.strictEqual(testData.result.count, 1);
   });

   it('invokeAsyncEvent - has invoked both plugins (pass through)', async () =>
   {
      // No await necessary as instance used.
      pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

      await pluginManager.add({ name: 'objectPluginTest', target: './test/src/plugins/objectPluginTest.js' });

      const event = await pluginManager.invokeAsyncEvent('test', void 0, testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 2);
      assert.strictEqual(testData.result.count, 2);
   });

   it('invokeSyncEvent - has invoked both plugins (pass through)', async () =>
   {
      // No await necessary as instance used.
      pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

      await pluginManager.add({ name: 'objectPluginTest', target: './test/src/plugins/objectPluginTest.js' });

      const event = pluginManager.invokeSyncEvent('test', void 0, testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 2);
      assert.strictEqual(testData.result.count, 2);
   });

   it('invokeAsyncEvent - has valid test / class result (copy)', async () =>
   {
      // No await necessary as instance used.
      pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

      const event = await pluginManager.invokeAsyncEvent('test', testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 1);
      assert.strictEqual(testData.result.count, 0);
      assert.strictEqual(event.$$plugin_invoke_count, 1);
      assert.strictEqual(event.$$plugin_invoke_names[0], 'PluginTest');
   });

   it('invokeSyncEvent - has valid test / class result (copy)', () =>
   {
      // No await necessary as instance used.
      pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

      const event = pluginManager.invokeSyncEvent('test', testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 1);
      assert.strictEqual(testData.result.count, 0);
      assert.strictEqual(event.$$plugin_invoke_count, 1);
      assert.strictEqual(event.$$plugin_invoke_names[0], 'PluginTest');
   });

   it('invokeAsyncEvent - has valid test / object result (copy)', async () =>
   {
      await pluginManager.add({ name: 'objectPluginTest', target: './test/src/plugins/objectPluginTest.js' });

      const event = await pluginManager.invokeAsyncEvent('test', testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 1);
      assert.strictEqual(testData.result.count, 0);
   });

   it('invokeSyncEvent - has valid test / object result (copy)', async () =>
   {
      await pluginManager.add({ name: 'objectPluginTest', target: './test/src/plugins/objectPluginTest.js' });

      const event = pluginManager.invokeSyncEvent('test', testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 1);
      assert.strictEqual(testData.result.count, 0);
   });

   it('invokeAsyncEvent - has invoked both plugins (copy)', async () =>
   {
      // No await necessary as instance used.
      pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

      await pluginManager.add({ name: 'objectPluginTest', target: './test/src/plugins/objectPluginTest.js' });

      const event = await pluginManager.invokeAsyncEvent('test', testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 2);
      assert.strictEqual(testData.result.count, 0);
   });

   it('invokeSyncEvent - has invoked both plugins (copy)', async () =>
   {
      // No await necessary as instance used.
      pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

      await pluginManager.add({ name: 'objectPluginTest', target: './test/src/plugins/objectPluginTest.js' });

      const event = pluginManager.invokeSyncEvent('test', testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 2);
      assert.strictEqual(testData.result.count, 0);
   });

   it('invokeAsyncEvent - has invoked both plugins (copy)', async () =>
   {
      await pluginManager.add({ name: 'PluginTestAsync', instance: new PluginTestAsync() });
      await pluginManager.add({ name: 'PluginTestAsync2', instance: new PluginTestAsync() });

      const event = await pluginManager.invokeAsyncEvent('test2', testData);

      assert.isObject(event);
      assert.strictEqual(event.result.count, 2);
      assert.strictEqual(testData.result.count, 0);
   });

   it('invoke - has invoked with no results', () =>
   {
      let invoked = false;

      pluginManager.add({ name: 'PluginTestSync', instance: { test: () => { invoked = true; } } });

      pluginManager.invoke('test', void 0, 'PluginTestSync');

      assert.strictEqual(invoked, true);
   });

   it('promise - invokeAsync - has invoked one result (async)', (done) =>
   {
      pluginManager.add({ name: 'PluginTestAsync', instance: new PluginTestAsync() }).then(() =>
      {
         pluginManager.invokeAsync('test', [1, 2], 'PluginTestAsync').then((results) =>
         {
            assert.isNumber(results);
            assert.strictEqual(results, 6);
            done();
         });
      });
   });

   it('promise - invokeAsync - has invoked two results (async)', (done) =>
   {
      pluginManager.addAll([
         { name: 'PluginTestAsync', instance: new PluginTestAsync() },
         { name: 'PluginTestAsync2', instance: new PluginTestAsync() }
      ]).then(() =>
      {
         pluginManager.invokeAsync('test', [1, 2]).then((results) =>
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

   it('async / await - invokeAsync - has invoked one result (async)', async () =>
   {
      await pluginManager.add({ name: 'PluginTestAsync', instance: new PluginTestAsync() });

      const results = await pluginManager.invokeAsync('test', [1, 2], 'PluginTestAsync');

      assert.isNumber(results);
      assert.strictEqual(results, 6);
   });

   it('async / await - invokeAsync - has invoked two results (async)', async () =>
   {
      await pluginManager.add({ name: 'PluginTestAsync', instance: new PluginTestAsync() });
      await pluginManager.add({ name: 'PluginTestAsync2', instance: new PluginTestAsync() });

      const results = await pluginManager.invokeAsync('test', [1, 2]);

      assert.isArray(results);
      assert.isNumber(results[0]);
      assert.isNumber(results[1]);
      assert.strictEqual(results[0], 6);
      assert.strictEqual(results[1], 6);
   });

   it('invokeSync - has invoked one result (sync)', () =>
   {
      pluginManager.add({ name: 'PluginTestSync', instance: new PluginTestSync() });

      const result = pluginManager.invokeSync('test', [1, 2], 'PluginTestSync');

      assert.isNumber(result);
      assert.strictEqual(result, 6);
   });

   it('invokeSync - has invoked two results (sync)', () =>
   {
      pluginManager.add({ name: 'PluginTestSync', instance: new PluginTestSync() });
      pluginManager.add({ name: 'PluginTestSync2', instance: new PluginTestSync() });

      const result = pluginManager.invokeSync('test', [1, 2]);

      assert.isArray(result);
      assert.strictEqual(result[0], 6);
      assert.strictEqual(result[1], 6);
   });

   it('PluginConfig is valid', () =>
   {
      assert.isTrue(pluginManager.isValidConfig({ name: 'test' }));
      assert.isTrue(pluginManager.isValidConfig({ name: 'test', target: 'target' }));
      assert.isTrue(pluginManager.isValidConfig({ name: 'test', target: 'target', options: {} }));
      assert.isTrue(pluginManager.isValidConfig({ name: 'test', options: {} }));
      assert.isTrue(pluginManager.isValidConfig({
         name: 'test',
         target: url.pathToFileURL(path.resolve('./test/fixture/esm/namedExport.js'))
      }));
   });

   it('PluginConfig is invalid', () =>
   {
      assert.isFalse(pluginManager.isValidConfig());
      assert.isFalse(pluginManager.isValidConfig({}));
      assert.isFalse(pluginManager.isValidConfig({ name: 123 }));
      assert.isFalse(pluginManager.isValidConfig({ target: 'target' }));
      assert.isFalse(pluginManager.isValidConfig({ options: {} }));
      assert.isFalse(pluginManager.isValidConfig({ name: 'test', target: 123 }));
      assert.isFalse(pluginManager.isValidConfig({ name: 'test', target: 'target', options: 123 }));
      assert.isFalse(pluginManager.isValidConfig({ name: 'test', options: 123 }));
   });

   it('get unique method names', () =>
   {
      pluginManager.add({ name: 'PluginTestSync', instance: new PluginTestSync() });
      pluginManager.add({ name: 'PluginTestNoName2', instance: new PluginTestNoName2() });

      const results = pluginManager.getMethodNames();

      assert.isArray(results);
      assert.lengthOf(results, 2);
      assert.strictEqual(results[0], 'test');
      assert.strictEqual(results[1], 'test2');
   });

   it('get plugin data', () =>
   {
      pluginManager.add({ name: 'PluginTestSync', instance: new PluginTestSync() }, { name: 'modulename' });

      const results = pluginManager.getPluginData('PluginTestSync');

      assert.isObject(results);

      assert(JSON.stringify(results), '{"manager":{"eventPrepend":"plugins"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestSync","scopedName":"plugins:PluginTestSync","target":"PluginTestSync","targetEscaped":"PluginTestSync","type":"instance","options":{}}}');
   });

   it('get all plugin data', () =>
   {
      pluginManager.addAll(
      [
         { name: 'PluginTestSync', instance: new PluginTestSync() },
         { name: 'PluginTestNoName2', instance: new PluginTestNoName2() }
      ], { name: 'modulename' });

      const results = pluginManager.getAllPluginData();

      assert.isArray(results);

      assert(JSON.stringify(results), '[{"manager":{"eventPrepend":"plugins"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestSync","scopedName":"plugins:PluginTestSync","target":"PluginTestSync","targetEscaped":"PluginTestSync","type":"instance","options":{}}},{"manager":{"eventPrepend":"plugins"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestNoName2","scopedName":"plugins:PluginTestNoName2","target":"PluginTestNoName2","targetEscaped":"PluginTestNoName2","type":"instance","options":{}}}]');
   });

   it('get plugin event names', async () =>
   {
      // No await necessary as instance used.
      pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

      await pluginManager.add({ name: 'objectPluginTest', target: './test/src/plugins/objectPluginTest.js' });

      let results = pluginManager.getPluginsEventNames();

      assert(JSON.stringify(results), '[{"pluginName":"PluginTest","events":["test:trigger","test:trigger2,"test:trigger3"]},{"pluginName":"pluginTest","events":["test:trigger","test:trigger4","test:trigger5"]}]');

      results = pluginManager.getPluginsEventNames('PluginTest');

      assert(JSON.stringify(results), '[{"pluginName":"PluginTest","events":["test:trigger","test:trigger2","test:trigger3"]}]');

      results = pluginManager.getPluginsEventNames('pluginTest');

      assert(JSON.stringify(results), '[{"pluginName":"pluginTest","events":["test:trigger","test:trigger4","test:trigger5"]}]');
   });

   it('get plugin name from event name', async () =>
   {
      // No await necessary as instance used.
      pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

      await pluginManager.add({ name: 'objectPluginTest', target: './test/src/plugins/objectPluginTest.js' });

      assert.throws(() => pluginManager.getPluginsByEventName());

      let results = pluginManager.getPluginsByEventName('test:trigger');

      assert(JSON.stringify(results), '["PluginTest","pluginTest"]');

      results = pluginManager.getPluginsByEventName('test:trigger2');

      assert(JSON.stringify(results), '["PluginTest"]');

      results = pluginManager.getPluginsByEventName('test:trigger4');

      assert(JSON.stringify(results), '["pluginTest"]');
   });

   it('get plugin names', () =>
   {
      pluginManager.add({ name: 'PluginTestSync', instance: new PluginTestSync() });
      pluginManager.add({ name: 'PluginTestSync2', instance: new PluginTestSync() });

      const results = pluginManager.getPluginNames();

      assert.isArray(results);
      assert.lengthOf(results, 2);
      assert.strictEqual(results[0], 'PluginTestSync');
      assert.strictEqual(results[1], 'PluginTestSync2');
   });

   it('get plugin / method names', () =>
   {
      pluginManager.add({ name: 'PluginTestSync', instance: new PluginTestSync() });
      pluginManager.add({ name: 'PluginTestNoName2', instance: new PluginTestNoName2() });

      const results = pluginManager.getPluginMethodNames();

      assert.isArray(results);
      assert.lengthOf(results, 2);
      assert.strictEqual(results[0].plugin, 'PluginTestSync');
      assert.strictEqual(results[0].method, 'test');
      assert.strictEqual(results[1].plugin, 'PluginTestNoName2');
      assert.strictEqual(results[1].method, 'test2');
   });

   it('module loader', async () =>
   {
      await pluginManager.add({ name: 'InstancePlugin.js', target: './test/fixture/cjs/InstancePlugin.js' });
      await pluginManager.add({ name: 'StaticPlugin.js', target: './test/fixture/cjs/StaticPlugin.js' });
      await pluginManager.add({ name: 'namedExport.js', target: './test/fixture/cjs/namedExport.js' });

      await pluginManager.add({ name: 'InstancePlugin.js', target: './test/fixture/esm/InstancePlugin.js' });
      await pluginManager.add({ name: 'StaticPlugin.js', target: './test/fixture/esm/StaticPlugin.js' });
      await pluginManager.add({ name: 'namedExport.js', target: './test/fixture/esm/namedExport.js' });

      // Test loading dev dependency plugin
      await pluginManager.add({ name: '@typhonjs-utils/package-json/plugin' });

      // Test loading file URL
      await pluginManager.add({
         name: 'namedExport.js',
         target: url.pathToFileURL(path.resolve('./test/fixture/esm/namedExport.js'))
      });

      // Test loading file URL string
      await pluginManager.add({
         name: 'namedExport.js',
         target: url.pathToFileURL(path.resolve('./test/fixture/esm/namedExport.js')).toString()
      });
   });
});
