import path                         from 'path';
import url                          from 'url';

import { assert, expect }           from 'chai';

import NodePluginManager            from '../../../src/node/index.js';
import { Eventbus, EventbusProxy }  from '../../../src/node/index.js';

import PluginTest                   from '../../fixture/plugins/PluginTest.js';
import PluginTestAsync              from '../../fixture/plugins/PluginTestAsync.js';
import PluginTestSync               from '../../fixture/plugins/PluginTestSync.js';

import tests                        from '../../utils/tests.js';

if (tests.runtimeTests)
{
   describe('Runtime (NodePluginManager):', () =>
   {
      describe('Type checks', () =>
      {
         let pluginManager;

         beforeEach(() =>
         {
            pluginManager = new NodePluginManager();
         });

         it('constructor function is exported', () =>
         {
            assert.isFunction(NodePluginManager);
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
            pluginManager = new NodePluginManager();
         });

         it('invoke - has invoked with no results', () =>
         {
            let invoked = false;

            pluginManager.add({ name: 'PluginTestSync', instance: { test: () => { invoked = true; } } });

            pluginManager.invoke('test', void 0, 'PluginTestSync');

            assert.strictEqual(invoked, true);
         });
      });

      describe('invokeAsync:', () =>
      {
         let pluginManager;

         beforeEach(() =>
         {
            pluginManager = new NodePluginManager();
         });

         it('promise - has invoked one result (async)', (done) =>
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

         it('promise - has invoked two results (async)', (done) =>
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

         it('async / await - has invoked one result (async)', async () =>
         {
            await pluginManager.add({ name: 'PluginTestAsync', instance: new PluginTestAsync() });

            const results = await pluginManager.invokeAsync('test', [1, 2], 'PluginTestAsync');

            assert.isNumber(results);
            assert.strictEqual(results, 6);
         });

         it('async / await - has invoked two results (async)', async () =>
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
      });

      describe('invokeAsyncEvent:', () =>
      {
         let pluginManager, testData;

         beforeEach(() =>
         {
            pluginManager = new NodePluginManager();
            testData = { result: { count: 0 } };
         });

         it('has empty result', async () =>
         {
            const event = await pluginManager.invokeAsyncEvent('test');

            assert.isObject(event);
            assert.lengthOf(Object.keys(event), 2);
            assert.strictEqual(event.$$plugin_invoke_count, 0);
         });

         it('w/ plugin and missing method has empty event result', async () =>
         {
            // No await necessary as instance used.
            pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

            const event = await pluginManager.invokeAsyncEvent('nop');

            assert.isObject(event);
            assert.lengthOf(Object.keys(event), 2);
            assert.strictEqual(event.$$plugin_invoke_count, 0);
         });

         it('w/ static plugin and missing method has empty event result', async () =>
         {
            await pluginManager.add({ name: 'StaticPluginTest', target: './test/fixture/plugins/StaticPluginTest.js' });

            const event = await pluginManager.invokeAsyncEvent('nop');

            assert.isObject(event);
            assert.lengthOf(Object.keys(event), 2);
            assert.strictEqual(event.$$plugin_invoke_count, 0);
         });

         it('w/ module plugin and missing method has empty event result', async () =>
         {
            await pluginManager.add({ name: 'modulePluginTest', target: './test/fixture/plugins/modulePluginTest.js' });

            const event = await pluginManager.invokeAsyncEvent('nop');

            assert.isObject(event);
            assert.lengthOf(Object.keys(event), 2);
            assert.strictEqual(event.$$plugin_invoke_count, 0);
         });

         it('has valid test / class result (pass through)', async () =>
         {
            // No await necessary as instance used.
            pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

            const event = await pluginManager.invokeAsyncEvent('test', void 0, testData);

            assert.isObject(event);
            assert.strictEqual(event.result.count, 1);
            assert.strictEqual(testData.result.count, 1);
            assert.strictEqual(event.$$plugin_invoke_count, 1);
         });

         it('static plugin has valid test / class result (pass through)', async () =>
         {
            await pluginManager.add({ name: 'StaticPluginTest', target: './test/fixture/plugins/StaticPluginTest.js' });

            const event = await pluginManager.invokeAsyncEvent('test', void 0, testData);

            assert.isObject(event);
            assert.strictEqual(event.result.count, 1);
            assert.strictEqual(testData.result.count, 1);
            assert.strictEqual(event.$$plugin_invoke_count, 1);
         });

         it('module plugin has valid test / class result (pass through)', async () =>
         {
            await pluginManager.add({ name: 'modulePluginTest', target: './test/fixture/plugins/modulePluginTest.js' });

            const event = await pluginManager.invokeAsyncEvent('test', void 0, testData);

            assert.isObject(event);
            assert.strictEqual(event.result.count, 1);
            assert.strictEqual(testData.result.count, 1);
            assert.strictEqual(event.$$plugin_invoke_count, 1);
         });

         it('has valid test / object result (pass through)', async () =>
         {
            await pluginManager.add({ name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

            const event = await pluginManager.invokeAsyncEvent('test', void 0, testData);

            assert.isObject(event);
            assert.strictEqual(event.result.count, 1);
            assert.strictEqual(testData.result.count, 1);
         });

         it('has invoked both plugins (pass through)', async () =>
         {
            // No await necessary as instance used.
            pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

            await pluginManager.add({ name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

            const event = await pluginManager.invokeAsyncEvent('test', void 0, testData);

            assert.isObject(event);
            assert.strictEqual(event.result.count, 2);
            assert.strictEqual(testData.result.count, 2);
         });

         it('has valid test / class result (copy)', async () =>
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

         it('has valid test / object result (copy)', async () =>
         {
            await pluginManager.add({ name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

            const event = await pluginManager.invokeAsyncEvent('test', testData);

            assert.isObject(event);
            assert.strictEqual(event.result.count, 1);
            assert.strictEqual(testData.result.count, 0);
         });

         it('has invoked both plugins (copy)', async () =>
         {
            // No await necessary as instance used.
            pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

            await pluginManager.add({ name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

            const event = await pluginManager.invokeAsyncEvent('test', testData);

            assert.isObject(event);
            assert.strictEqual(event.result.count, 2);
            assert.strictEqual(testData.result.count, 0);
         });

         it('has invoked both plugins (copy)', async () =>
         {
            await pluginManager.add({ name: 'PluginTestAsync', instance: new PluginTestAsync() });
            await pluginManager.add({ name: 'PluginTestAsync2', instance: new PluginTestAsync() });

            const event = await pluginManager.invokeAsyncEvent('test2', testData);

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
            pluginManager = new NodePluginManager();
         });

         it('has invoked one result', () =>
         {
            pluginManager.add({ name: 'PluginTestSync', instance: new PluginTestSync() });

            const result = pluginManager.invokeSync('test', [1, 2], 'PluginTestSync');

            assert.isNumber(result);
            assert.strictEqual(result, 6);
         });

         it('has invoked two result', () =>
         {
            pluginManager.add({ name: 'PluginTestSync', instance: new PluginTestSync() });
            pluginManager.add({ name: 'PluginTestSync2', instance: new PluginTestSync() });

            const result = pluginManager.invokeSync('test', [1, 2]);

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
            pluginManager = new NodePluginManager();
            testData = { result: { count: 0 } };
         });

         it('has empty result', () =>
         {
            const event = pluginManager.invokeSyncEvent('test');

            assert.isObject(event);
            assert.lengthOf(Object.keys(event), 2);
            assert.strictEqual(event.$$plugin_invoke_count, 0);
         });

         it('w/ plugin and missing method has empty event result', () =>
         {
            // No await necessary as instance used.
            pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

            const event = pluginManager.invokeSyncEvent('nop');

            assert.isObject(event);
            assert.lengthOf(Object.keys(event), 2);
            assert.strictEqual(event.$$plugin_invoke_count, 0);
         });

         it('w/ static plugin and missing method has empty event result', async () =>
         {
            await pluginManager.add({ name: 'StaticPluginTest', target: './test/fixture/plugins/StaticPluginTest.js' });

            const event = pluginManager.invokeSyncEvent('nop');

            assert.isObject(event);
            assert.lengthOf(Object.keys(event), 2);
            assert.strictEqual(event.$$plugin_invoke_count, 0);
         });

         it('w/ module plugin and missing method has empty event result', async () =>
         {
            await pluginManager.add({ name: 'modulePluginTest', target: './test/fixture/plugins/modulePluginTest.js' });

            const event = pluginManager.invokeSyncEvent('nop');

            assert.isObject(event);
            assert.lengthOf(Object.keys(event), 2);
            assert.strictEqual(event.$$plugin_invoke_count, 0);
         });

         it('instance plugin has valid test / class result (pass through)', () =>
         {
            // No await necessary as instance used.
            pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

            const event = pluginManager.invokeSyncEvent('test', void 0, testData);

            assert.isObject(event);
            assert.strictEqual(event.result.count, 1);
            assert.strictEqual(testData.result.count, 1);
            assert.strictEqual(event.$$plugin_invoke_count, 1);
         });

         it('static plugin has valid test / class result (pass through)', async () =>
         {
            await pluginManager.add({ name: 'StaticPluginTest', target: './test/fixture/plugins/StaticPluginTest.js' });

            const event = pluginManager.invokeSyncEvent('test', void 0, testData);

            assert.isObject(event);
            assert.strictEqual(event.result.count, 1);
            assert.strictEqual(testData.result.count, 1);
            assert.strictEqual(event.$$plugin_invoke_count, 1);
         });

         it('module plugin has valid test / class result (pass through)', async () =>
         {
            await pluginManager.add({ name: 'modulePluginTest', target: './test/fixture/plugins/modulePluginTest.js' });

            const event = pluginManager.invokeSyncEvent('test', void 0, testData);

            assert.isObject(event);
            assert.strictEqual(event.result.count, 1);
            assert.strictEqual(testData.result.count, 1);
            assert.strictEqual(event.$$plugin_invoke_count, 1);
         });

         it('has valid test / object result (pass through)', async () =>
         {
            await pluginManager.add({ name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

            const event = pluginManager.invokeSyncEvent('test', void 0, testData);

            assert.isObject(event);
            assert.strictEqual(event.result.count, 1);
            assert.strictEqual(testData.result.count, 1);
         });

         it('has invoked both plugins (pass through)', async () =>
         {
            // No await necessary as instance used.
            pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

            await pluginManager.add({ name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

            const event = pluginManager.invokeSyncEvent('test', void 0, testData);

            assert.isObject(event);
            assert.strictEqual(event.result.count, 2);
            assert.strictEqual(testData.result.count, 2);
         });

         it('has valid test / class result (copy)', () =>
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

         it('has valid test / object result (copy)', async () =>
         {
            await pluginManager.add({ name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

            const event = pluginManager.invokeSyncEvent('test', testData);

            assert.isObject(event);
            assert.strictEqual(event.result.count, 1);
            assert.strictEqual(testData.result.count, 0);
         });

         it('has invoked both plugins (copy)', async () =>
         {
            // No await necessary as instance used.
            pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

            await pluginManager.add({ name: 'objectPluginTest', target: './test/fixture/plugins/objectPluginTest.js' });

            const event = pluginManager.invokeSyncEvent('test', testData);

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
            pluginManager = new NodePluginManager();
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

         it('module loader add multiple', async () =>
         {
            let pData;

            pData = await pluginManager.add(
             { name: 'CJS-InstancePlugin', target: './test/fixture/formats/cjs/InstancePlugin.js' });
            assert.strictEqual(pData.plugin.type, 'require-path');

            pData = await pluginManager.add(
             { name: 'CJS-StaticPlugin', target: './test/fixture/formats/cjs/StaticPlugin.js' });
            assert.strictEqual(pData.plugin.type, 'require-path');

            pData = await pluginManager.add(
             { name: 'CJS-namedExport', target: './test/fixture/formats/cjs/namedExport.js' });
            assert.strictEqual(pData.plugin.type, 'require-path');

            pData = await pluginManager.add(
             { name: 'ESM-InstancePlugin', target: './test/fixture/formats/esm/InstancePlugin.js' });
            assert.strictEqual(pData.plugin.type, 'import-path');

            pData = await pluginManager.add(
             { name: 'ESM-StaticPlugin', target: './test/fixture/formats/esm/StaticPlugin.js' });
            assert.strictEqual(pData.plugin.type, 'import-path');

            pData = await pluginManager.add(
             { name: 'ESM-namedExport', target: './test/fixture/formats/esm/namedExport.js' });
            assert.strictEqual(pData.plugin.type, 'import-path');

            // Test loading dev dependency plugin
            pData = await pluginManager.add({ name: '@typhonjs-utils/package-json' });
            assert.strictEqual(pData.plugin.type, 'import-module');

            // Test loading file URL
            pData = await pluginManager.add({
               name: 'ESM-URL-namedExport',
               target: url.pathToFileURL(path.resolve('./test/fixture/formats/esm/namedExport.js'))
            });
            assert.strictEqual(pData.plugin.type, 'import-path');

            // Test loading file URL string
            pData = await pluginManager.add({
               name: 'ESM-file-URL-namedExport',
               target: url.pathToFileURL(path.resolve('./test/fixture/formats/esm/namedExport.js')).toString()
            });
            assert.strictEqual(pData.plugin.type, 'import-path');

         });

         it('module loader addAll / removeAll', async () =>
         {
            const pData = await pluginManager.addAll([
               { name: 'CJS-InstancePlugin', target: './test/fixture/formats/cjs/InstancePlugin.js' },
               { name: 'CJS-StaticPlugin', target: './test/fixture/formats/cjs/StaticPlugin.js' },
               { name: 'CJS-namedExport', target: './test/fixture/formats/cjs/namedExport.js' },
               { name: 'ESM-InstancePlugin', target: './test/fixture/formats/esm/InstancePlugin.js' },
               { name: 'ESM-StaticPlugin', target: './test/fixture/formats/esm/StaticPlugin.js' },
               { name: 'ESM-namedExport', target: './test/fixture/formats/esm/namedExport.js' },
               { name: '@typhonjs-utils/package-json' },
               {
                  name: 'ESM-URL-namedExport',
                  target: url.pathToFileURL(path.resolve('./test/fixture/formats/esm/namedExport.js'))
               },
               {
                  name: 'ESM-file-URL-namedExport',
                  target: url.pathToFileURL(path.resolve('./test/fixture/formats/esm/namedExport.js')).toString()
               }
            ]);

            assert.isArray(pData);
            assert.strictEqual(pData.length, 9);

            assert.strictEqual(pData[0].plugin.type, 'require-path');
            assert.strictEqual(pData[1].plugin.type, 'require-path');
            assert.strictEqual(pData[2].plugin.type, 'require-path');
            assert.strictEqual(pData[3].plugin.type, 'import-path');
            assert.strictEqual(pData[4].plugin.type, 'import-path');
            assert.strictEqual(pData[5].plugin.type, 'import-path');
            assert.strictEqual(pData[6].plugin.type, 'import-module');
            assert.strictEqual(pData[7].plugin.type, 'import-path');
            assert.strictEqual(pData[8].plugin.type, 'import-path');

            const rData = await pluginManager.removeAll();

            assert.isArray(rData);
            assert.strictEqual(rData.length, 9);

            assert.strictEqual(rData[0].result, true);
            assert.strictEqual(rData[1].result, true);
            assert.strictEqual(rData[2].result, true);
            assert.strictEqual(rData[3].result, true);
            assert.strictEqual(rData[4].result, true);
            assert.strictEqual(rData[5].result, true);
            assert.strictEqual(rData[6].result, true);
            assert.strictEqual(rData[7].result, true);
            assert.strictEqual(rData[8].result, true);
         });
      });
   });
}
