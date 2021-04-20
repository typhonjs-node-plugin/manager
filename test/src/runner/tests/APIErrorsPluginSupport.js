const s_ALL_EVENTS = [
   'plugins:get:plugin:event:names',
   'plugins:get:plugins:event:names',

   'plugins:get:all:plugin:data',
   'plugins:get:plugin:data',

   'plugins:get:method:names',
   'plugins:get:plugin:method:names',
   'plugins:get:plugin:names',
   'plugins:get:plugin:options',
   'plugins:get:plugins:by:event:name',
   'plugins:has:method',
   'plugins:has:plugin:method'
];

/*
TODO: Implement
         assert.throws(() => pluginManager.getPluginsByEventName());
 */

export default class APIErrorsPluginSupport
{
   static run(Module, data, chai)
   {
      const { expect } = chai;

      const PluginManager = Module.default;
      const { PluginSupport } = Module;

      describe('API Errors (PluginSupport):', () =>
      {
         describe('PluginManager destroyed (artificial) - all triggered events throw:', () =>
         {
            let eventbus, pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager({ PluginSupport });
               eventbus = pluginManager.getEventbus();

               // Artificially destroy the pluginManager -> _pluginMap
               pluginManager._pluginMap = null;
            });

            for (const event of s_ALL_EVENTS)
            {
               it(event, async () =>
               {
                  expect(() => eventbus.triggerSync(event)).to.throw(ReferenceError,
                   'This PluginManager instance has been destroyed.');
               });
            }
         });

         describe('PluginSupport manager reference lost (artificial) - all triggered events throw:', () =>
         {
            let eventbus, pluginManager;

            beforeEach(() =>
            {
               pluginManager = new PluginManager({ PluginSupport });
               eventbus = pluginManager.getEventbus();

               // Artificially destroy the pluginManager
               pluginManager._pluginSupport[0]._pluginManager = null;
            });

            for (const event of s_ALL_EVENTS)
            {
               it(event, async () =>
               {
                  expect(() => eventbus.triggerSync(event)).to.throw(ReferenceError,
                   'This PluginManager instance has been destroyed.');
               });
            }
         });
      });
   }
}
