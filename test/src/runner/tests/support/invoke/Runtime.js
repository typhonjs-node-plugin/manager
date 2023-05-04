/**
 * @param {object}                              opts - Test options
 *
 * @param {import('../../../../../../types')}   opts.Module - Module to test
 *
 * @param {object}                              opts.data - Extra test data.
 *
 * @param {object}                              opts.chai - Chai
 */
export function run({ Module, data, chai })
{
   const { assert } = chai;

   const { PluginManager } = Module;
   const { Eventbus, PluginInvokeSupport } = Module;

   describe('PluginInvokeSupport Runtime:', () =>
   {
      let eventbus, pluginManager;

      beforeEach(() =>
      {
         pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
         eventbus = pluginManager.getEventbus();
      });

      it('destroy() invoked when plugin manager is destroyed', async () =>
      {
         assert.isAtLeast(eventbus.eventCount, 20);

         await pluginManager.destroy();

         assert.strictEqual(eventbus.eventCount, 0);
      });

      it('getMethodNames() - get all unique method names', async () =>
      {
         await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
         await pluginManager.add({ name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() });

         const results = eventbus.triggerSync('plugins:get:method:names');

         assert.isArray(results);
         assert.lengthOf(results, 3);
         assert.strictEqual(results[0], 'onPluginLoad');
         assert.strictEqual(results[1], 'test');
         assert.strictEqual(results[2], 'test2');
      });

      it('getMethodNames() - get all unique method names (enabled)', async () =>
      {
         await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
         await pluginManager.add({ name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() });

         const results = eventbus.triggerSync('plugins:get:method:names', { enabled: true });

         assert.isArray(results);
         assert.lengthOf(results, 3);
         assert.strictEqual(results[0], 'onPluginLoad');
         assert.strictEqual(results[1], 'test');
         assert.strictEqual(results[2], 'test2');
      });

      it('getMethodNames() - get method names for plugin', async () =>
      {
         await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
         await pluginManager.add({ name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() });

         const results = eventbus.triggerSync('plugins:get:method:names', { plugins: 'PluginTestSync' });

         assert.isArray(results);
         assert.lengthOf(results, 2);
         assert.strictEqual(results[0], 'onPluginLoad');
         assert.strictEqual(results[1], 'test');
      });

      it('getMethodNames() - get method names for plugin (enabled)', async () =>
      {
         await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
         await pluginManager.add({ name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() });

         const results = eventbus.triggerSync('plugins:get:method:names',
          { enabled: true, plugins: 'PluginTestSync' });

         assert.isArray(results);
         assert.lengthOf(results, 2);
         assert.strictEqual(results[0], 'onPluginLoad');
         assert.strictEqual(results[1], 'test');
      });

      it('getMethodNames() - get all unique method names (1 enabled / 1 disabled)', async () =>
      {
         await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
         await pluginManager.add({ name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() });

         pluginManager.setEnabled({ enabled: false, plugins: 'PluginTestNoName2' });

         const results = eventbus.triggerSync('plugins:get:method:names', { enabled: true });

         assert.isArray(results);
         assert.lengthOf(results, 2);
         assert.strictEqual(results[0], 'onPluginLoad');
         assert.strictEqual(results[1], 'test');
      });

      it('hasMethod() - has method name', async () =>
      {
         await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });

         const result = eventbus.triggerSync('plugins:has:method', { method: 'test' });

         assert.isBoolean(result);
         assert.isTrue(result);
      });

      it('hasMethod() - has method name for plugin', async () =>
      {
         await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });

         const result = eventbus.triggerSync('plugins:has:method', { method: 'test', plugins: 'PluginTestSync' });

         assert.isBoolean(result);
         assert.isTrue(result);
      });

      it('hasMethod() - has method name for plugin array', async () =>
      {
         await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
         await pluginManager.add({ name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() });

         const result = eventbus.triggerSync('plugins:has:method', { method: 'test', plugins: ['PluginTestSync'] });

         assert.isBoolean(result);
         assert.isTrue(result);
      });

      it('hasMethod() - has method name for plugin array (false)', async () =>
      {
         await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
         await pluginManager.add({ name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() });

         const result = eventbus.triggerSync('plugins:has:method',
          { method: 'test', plugins: ['PluginTestSync', 'PluginTestNoName2'] });

         assert.isBoolean(result);
         assert.isFalse(result);
      });

      it('hasMethod() - has method name for all plugins (false)', async () =>
      {
         await pluginManager.add({ name: 'PluginTestSync', instance: new data.plugins.PluginTestSync() });
         await pluginManager.add({ name: 'PluginTestNoName2', instance: new data.plugins.PluginTestNoName2() });

         const result = eventbus.triggerSync('plugins:has:method', { method: 'test' });

         assert.isBoolean(result);
         assert.isFalse(result);
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
