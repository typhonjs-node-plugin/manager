/**
 * @param {object}                              opts - Test options
 *
 * @param {import('../../../../../../types')}   opts.Module - Module to test
 *
 * @param {object}                              opts.chai - Chai
 */
export function run({ Module, chai })
{
   const { assert, expect } = chai;

   const { PluginManager } = Module;
   const { PluginInvokeSupport } = Module;

   describe(`PluginInvokeSupport Runtime (invoke):`, () =>
   {
      describe('invoke:', () =>
      {
         let count, eventbus, pluginManager;

         beforeEach(() =>
         {
            count = 0;
            pluginManager = new PluginManager({ PluginSupport: [PluginInvokeSupport] });
            eventbus = pluginManager.createEventbusProxy();
         });

         it('invoke - has invoked one', () =>
         {
            pluginManager.add({ name: 'PluginTest', instance: { test: () => { count++; } } });

            eventbus.trigger('plugins:invoke', { method: 'test', plugins: 'PluginTest' });

            assert.strictEqual(count, 1);
         });

         it('invoke - has invoked two', () =>
         {
            let count = 0;

            pluginManager.add({ name: 'PluginTest', instance: { test: () => { count++; } } });
            pluginManager.add({ name: 'PluginTest2', instance: { test: () => { count++; } } });

            eventbus.trigger('plugins:invoke', { method: 'test' });

            assert.strictEqual(count, 2);
         });

         it('invoke - has invoked one w/ args', () =>
         {
            pluginManager.add({ name: 'PluginTest', instance: { test: (add) => { count += add; } } });

            eventbus.trigger('plugins:invoke', { method: 'test', args: [2], plugins: 'PluginTest' });

            assert.strictEqual(count, 2);
         });

         it('invoke - has invoked two', () =>
         {
            let count = 0;

            pluginManager.add({ name: 'PluginTest', instance: { test: (add) => { count += add; } } });
            pluginManager.add({ name: 'PluginTest2', instance: { test: (add) => { count += add; } } });

            eventbus.trigger('plugins:invoke', { method: 'test', args: [2] });

            assert.strictEqual(count, 4);
         });
      });

      describe('invoke - options - throwNoPlugins / throwNoMethod true:', () =>
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
            expect(() => eventbus.trigger('plugins:invoke', { method: 'test' })).to.throw(
             Error, `PluginManager failed to find any target plugins.`);
         });

         it('throws no method', async () =>
         {
            await pluginManager.add({ name: 'PluginTestSync', instance: {} });

            expect(() => eventbus.trigger('plugins:invoke',
             { method: 'badMethod' })).to.throw(Error, `PluginManager failed to invoke 'badMethod'.`);
         });
      });
   });
}

