import { assert }          from 'chai';

import NodePluginManager   from '../../src/node/index.js';

import PluginTest          from './plugins/PluginTest.js';
import PluginTestNoName2   from './plugins/PluginTestNoName2.js';
import PluginTestSync      from './plugins/PluginTestSync.js';

import tests               from '../utils/tests.js';

if (tests.pluginSupport)
{
   describe('PluginSupport:', () =>
   {
      let pluginManager;

      beforeEach(() =>
      {
         pluginManager = new NodePluginManager();
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

         assert(JSON.stringify(results),
          '{"manager":{"eventPrepend":"plugins"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestSync","scopedName":"plugins:PluginTestSync","target":"PluginTestSync","targetEscaped":"PluginTestSync","type":"instance","options":{}}}');
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

         assert(JSON.stringify(results),
          '[{"manager":{"eventPrepend":"plugins"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestSync","scopedName":"plugins:PluginTestSync","target":"PluginTestSync","targetEscaped":"PluginTestSync","type":"instance","options":{}}},{"manager":{"eventPrepend":"plugins"},"module":{"name":"modulename"},"plugin":{"name":"PluginTestNoName2","scopedName":"plugins:PluginTestNoName2","target":"PluginTestNoName2","targetEscaped":"PluginTestNoName2","type":"instance","options":{}}}]');
      });

      it('get plugin event names', async () =>
      {
         // No await necessary as instance used.
         pluginManager.add({ name: 'PluginTest', instance: new PluginTest() });

         await pluginManager.add({ name: 'objectPluginTest', target: './test/src/plugins/objectPluginTest.js' });

         let results = pluginManager.getPluginsEventNames();

         assert(JSON.stringify(results),
          '[{"pluginName":"PluginTest","events":["test:trigger","test:trigger2,"test:trigger3"]},{"pluginName":"pluginTest","events":["test:trigger","test:trigger4","test:trigger5"]}]');

         results = pluginManager.getPluginsEventNames('PluginTest');

         assert(JSON.stringify(results),
          '[{"pluginName":"PluginTest","events":["test:trigger","test:trigger2","test:trigger3"]}]');

         results = pluginManager.getPluginsEventNames('pluginTest');

         assert(JSON.stringify(results),
          '[{"pluginName":"pluginTest","events":["test:trigger","test:trigger4","test:trigger5"]}]');
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
   });
}
