const s_ASYNC_EVENTS = [
   'plugins:async:invoke',
   'plugins:async:invoke:event',
];

const s_SYNC_EVENTS = [
   'plugins:get:method:names',
   'plugins:has:method',
   'plugins:has:plugin:method',
   'plugins:invoke',
   'plugins:sync:invoke',
   'plugins:sync:invoke:event'
];

export default class APIErrors
{
   static run(Module, data, chai)
   {
      const { expect } = chai;

      const PluginManager = Module.default;
      const { PluginInvokeSupport } = Module;

      describe('API Errors (PluginInvokeSupport):', () =>
      {
         describe('All sync triggered events throw:', () =>
         {
            describe('PluginManager destroyed (artificial):', () =>
            {
               let eventbus, pluginManager;

               beforeEach(() =>
               {
                  pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
                  eventbus = pluginManager.getEventbus();

                  // Artificially destroy the pluginManager -> _pluginMap
                  pluginManager._pluginMap = null;
               });

               for (const event of s_SYNC_EVENTS)
               {
                  it(event, () =>
                  {
                     expect(() => eventbus.triggerSync(event)).to.throw(ReferenceError,
                      'This PluginManager instance has been destroyed.');
                  });
               }
            });

            describe('PluginInvokeSupport manager reference lost (artificial)', () =>
            {
               let eventbus, pluginManager;

               beforeEach(() =>
               {
                  pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
                  eventbus = pluginManager.getEventbus();

                  // Artificially destroy the pluginManager
                  pluginManager._pluginSupport[0]._pluginManager = null;
               });

               for (const event of s_SYNC_EVENTS)
               {
                  it(event, () =>
                  {
                     expect(() => eventbus.triggerSync(event)).to.throw(ReferenceError,
                      'This PluginManager instance has been destroyed.');
                  });
               }
            });
         });

         describe('All async triggered events throw:', () =>
         {
            describe('PluginManager destroyed (artificial):', () =>
            {
               let eventbus, pluginManager;

               beforeEach(() =>
               {
                  pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
                  eventbus = pluginManager.getEventbus();

                  // Artificially destroy the pluginManager -> _pluginMap
                  pluginManager._pluginMap = null;
               });

               for (const event of s_ASYNC_EVENTS)
               {
                  it(event, async () =>
                  {
                     await expect(eventbus.triggerAsync(event)).to.be.rejectedWith(ReferenceError,
                      'This PluginManager instance has been destroyed.');
                  });
               }
            });

            describe('PluginInvokeSupport manager reference lost (artificial):', () =>
            {
               let eventbus, pluginManager;

               beforeEach(() =>
               {
                  pluginManager = new PluginManager({ PluginSupport: PluginInvokeSupport });
                  eventbus = pluginManager.getEventbus();

                  // Artificially destroy the pluginManager
                  pluginManager._pluginSupport[0]._pluginManager = null;
               });

               for (const event of s_ASYNC_EVENTS)
               {
                  it(event, async () =>
                  {
                     await expect(eventbus.triggerAsync(event)).to.be.rejectedWith(ReferenceError,
                      'This PluginManager instance has been destroyed.');
                  });
               }
            });
         });
      });
   }
}
