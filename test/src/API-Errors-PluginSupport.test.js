import { expect }          from 'chai';

import NodePluginManager   from '../../src/node/index.js';
import { PluginSupport }   from '../../src/node/index.js';

import tests               from '../utils/tests.js';

const s_ALL_EVENTS = [
   'plugins:get:all:plugin:data',
   'plugins:get:method:names',
   'plugins:get:plugin:data',
   'plugins:get:plugin:event:names',
   'plugins:get:plugin:method:names',
   'plugins:get:plugin:names',
   'plugins:get:plugin:options',
   'plugins:get:plugins:by:event:name',
   'plugins:get:plugins:event:names',
   'plugins:has:method',
   'plugins:has:plugin:method'
];

/*
TODO: Implement
         assert.throws(() => pluginManager.getPluginsByEventName());
 */

if (tests.apiErrorsPluginSupport)
{
   describe('API Errors (PluginSupport):', () =>
   {
      let eventbus, pluginManager;

      beforeEach(() =>
      {
         pluginManager = new NodePluginManager({ PluginSupport });
         eventbus = pluginManager.getEventbus();
      });

      describe('PluginManager destroyed (artificial) - all triggered events throw:', () =>
      {
         beforeEach(() =>
         {
            pluginManager = new NodePluginManager({ PluginSupport });
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
         beforeEach(() =>
         {
            pluginManager = new NodePluginManager({ PluginSupport });
            eventbus = pluginManager.getEventbus();

            // Artificially destroy the pluginManager
            pluginManager._pluginSupport._pluginManager = null;
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
