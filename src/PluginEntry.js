/**
 * Defines a class holding the data associated with a plugin including its instance.
 */
export default class PluginEntry
{
   /**
    * Instantiates a PluginEntry.
    *
    * @param {string}      name - The plugin name.
    *
    * @param {PluginData}  data -  describing the plugin, manager, and optional module data.
    *
    * @param {object}      instance - The loaded plugin instance.
    *
    * @param {EventbusProxy}  eventbusProxy - An EventProxy associated with the plugin wrapping the plugin manager
    * eventbus.
    */
   constructor(name, data, instance, eventbusProxy = void 0)
   {
      /**
       * Data describing the plugin, manager, and optional module data.
       *
       * @type {PluginData}
       * @private
       */
      this._data = data;

      /**
       * The plugin enabled state.
       *
       * @type {boolean}
       * @private
       */
      this._enabled = true;

      /**
       * The plugin name.
       *
       * @type {string}
       * @private
       */
      this._name = name;

      /**
       * The loaded plugin instance.
       *
       * @type {object}
       * @private
       */
      this._instance = instance;

      /**
       * An EventbusProxy associated with the plugin wrapping the plugin manager eventbus.
       *
       * @type {EventbusProxy}
       * @private
       */
      this._eventbusProxy = eventbusProxy;
   }

   /**
    * Get plugin data.
    *
    * @returns {PluginData} The associated PluginData.
    */
   get data() { return this._data; }

   /**
    * Get enabled.
    *
    * @returns {boolean} Current enabled state.
    */
   get enabled() { return this._enabled; }

   /**
    * Set enabled.
    *
    * @param {boolean} enabled - New enabled state.
    */
   set enabled(enabled)
   {
      /**
       * The plugin enabled state.
       *
       * @type {boolean}
       * @private
       */
      this._enabled = enabled;
   }

   /**
    * Get associated EventbusProxy.
    *
    * @returns {EventbusProxy} Associated EventbusProxy.
    */
   get eventbusProxy() { return this._eventbusProxy; }

   /**
    * Get plugin instance.
    *
    * @returns {object} The plugin instance.
    */
   get instance() { return this._instance; }

   /**
    * Get plugin name.
    *
    * @returns {string} Plugin name.
    */
   get name() { return this._name; }
}
