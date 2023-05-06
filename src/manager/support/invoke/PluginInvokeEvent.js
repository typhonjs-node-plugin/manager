/**
 * PluginEvent - Provides the data / event passed to all invoked methods in
 * {@link PluginInvokeSupport#invokeSyncEvent}. The `event.data` field is returned to the caller. Before returning
 * though additional the following additional metadata is attached:
 *
 * (number)    `$$plugin_invoke_count` - The count of plugins invoked.
 *
 * (string[])  `$$plugin_invoke_names` - The names of plugins invoked.
 */
export class PluginInvokeEvent
{
   /**
    * Initializes PluginEvent.
    *
    * @param {object} copyProps - Event data to copy.
    *
    * @param {object} passthruProps - Event data to pass through.
    */
   constructor(copyProps = {}, passthruProps = {})
   {
      /**
       * Provides the unified event data assigning any pass through data to the copied data supplied. Invoked functions
       * may add to or modify this data.
       *
       * @type {import('../../').PluginEventData}
       */
      this.data = Object.assign(JSON.parse(JSON.stringify(copyProps)), passthruProps);

      /**
       * Unique data available in each plugin invoked.
       *
       * @type {import('#eventbus').EventbusProxy} - The active EventbusProxy for that particular plugin.
       */
      this.eventbus = null;

      /**
       * Unique data available in each plugin invoked.
       *
       * @type {string} - The active plugin name.
       */
      this.pluginName = '';

      /**
       * Unique data available in each plugin invoked.
       *
       * @type {object} - The active plugin options.
       */
      this.pluginOptions = '';
   }
}
