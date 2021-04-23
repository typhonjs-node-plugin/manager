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
