/**
 * A ES Module as plugin
 */

/**
 * Increments a result count.
 *
 * @param {object} event - PluginEvent - A plugin event.
 */
export function test(event)
{
   event.data.result.count++;

   if (event.pluginName !== 'modulePluginTest') { throw new Error(`event.pluginName !== modulePluginTest`); }
}

/**
 * Register event bindings
 *
 * @param {object} ev - PluginEvent - A plugin event.
 */
export function onPluginLoad(ev)
{
   if (ev.eventbus)
   {
      ev.eventbus.on('test:trigger', () => {});
      ev.eventbus.on('test:trigger2', () => {});
      ev.eventbus.on('test:trigger3', () => {});
   }
}
