/**
 * A plugin class
 */
export default class PluginTest
{
   /**
    * Increments a result count.
    *
    * @param {object} event - PluginEvent - A plugin event.
    */
   test(event)
   {
      event.data.result.count++;

      if (event.pluginName !== 'PluginTest') { throw new Error(`event.pluginName !== PluginTest`); }
   }

   /**
    * Register event bindings.
    *
    * @param {object} ev - PluginEvent - A plugin event.
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
