import { assert } from 'chai';

/**
 * A plugin class
 */
export default class PluginTest
{
   /**
    * Increments a result count.
    * @param {PluginEvent} event - A plugin event.
    */
   test(event)
   {
      event.data.result.count++;
      assert.strictEqual(event.pluginName, 'PluginTest');
   }

   /**
    * Register event bindings
    * @param {PluginEvent} ev - A plugin event.
    */
   onPluginLoad(ev)
   {
      if (ev.eventbus)
      {
         ev.eventbus.on('test:trigger', () => {});
         ev.eventbus.on('test:trigger2', () => {});
         ev.eventbus.on('test:trigger3', () => {});
      }
   }
}
