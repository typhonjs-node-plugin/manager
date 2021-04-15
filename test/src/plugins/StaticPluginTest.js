import { assert } from 'chai';

/**
 * A static plugin class
 */
export default class StaticPluginTest
{
   /**
    * Increments a result count.
    *
    * @param {object} event - PluginEvent - A plugin event.
    */
   static test(event)
   {
      event.data.result.count++;
      assert.strictEqual(event.pluginName, 'StaticPluginTest');
   }

   /**
    * Register event bindings
    *
    * @param {object} ev - PluginEvent - A plugin event.
    */
   static onPluginLoad(ev)
   {
      if (ev.eventbus)
      {
         ev.eventbus.on('test:trigger', () => {});
         ev.eventbus.on('test:trigger2', () => {});
         ev.eventbus.on('test:trigger3', () => {});
      }
   }
}
