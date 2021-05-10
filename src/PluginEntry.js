/**
 * Defines a class holding the data associated with a plugin including its instance.
 */
export default class PluginEntry
{
   /**
    * Data describing the plugin, manager, and optional module data.
    *
    * @type {PluginData}
    * @private
    */
   #data;

   /**
    * The plugin enabled state.
    *
    * @type {boolean}
    * @private
    */
   #enabled;

   /**
    * The plugin name.
    *
    * @type {string}
    * @private
    */
   #name;

   /**
    * Any stored import.meta data.
    *
    * @type {object}
    * @private
    */
   #importmeta;

   /**
    * The loaded plugin instance.
    *
    * @type {object}
    * @private
    */
   #instance;

   /**
    * An EventbusProxy associated with the plugin wrapping the plugin manager eventbus.
    *
    * @type {EventbusProxy}
    * @private
    */
   #eventbusProxy;

   /**
    * Stores the proxied event names, callback functions, context and guarded state when this plugin is disabled.
    *
    * @type {Array<[string, Function, object, boolean]>}
    * @private
    */
   #events;

   /**
    * Instantiates a PluginEntry.
    *
    * @param {string}      name - The plugin name.
    *
    * @param {PluginData}  data - Describes the plugin, manager, and optional module data.
    *
    * @param {object}      instance - The loaded plugin instance.
    *
    * @param {EventbusProxy}  eventbusProxy - The EventbusProxy associated with the plugin wrapping the plugin manager
    *                                         eventbus.
    */
   constructor(name, data, instance, eventbusProxy = void 0)
   {
      this.#data = data;

      this.#enabled = true;

      this.#name = name;

      this.#instance = instance;

      this.#eventbusProxy = eventbusProxy;
   }

   /**
    * Get plugin data.
    *
    * @returns {PluginData} The associated PluginData.
    */
   get data() { return this.#data; }

   /**
    * Get enabled.
    *
    * @returns {boolean} Current enabled state.
    */
   get enabled() { return this.#enabled; }

   /**
    * Get any stored import.meta object.
    *
    * @returns {undefined|object} Any set import.meta info.
    */
   get importmeta() { return this.#importmeta }

   /**
    * Set enabled.
    *
    * @param {boolean} enabled - New enabled state.
    */
   set enabled(enabled)
   {
      this.#enabled = enabled;

      // If enabled and there are stored events then turn them on with the eventbus proxy.
      if (enabled)
      {
         if (this.#eventbusProxy !== void 0 && Array.isArray(this.#events))
         {
            for (const event of this.#events)
            {
               this.#eventbusProxy.on(...event);
            }

            this.#events = void 0;
         }
      }
      else // Store any proxied events and unregister the proxied events.
      {
         if (this.#eventbusProxy !== void 0)
         {
            this.#events = Array.from(this.#eventbusProxy.proxyEntries());
            this.#eventbusProxy.off();
         }
      }
   }

   /**
    * Get associated EventbusProxy.
    *
    * @returns {EventbusProxy} Associated EventbusProxy.
    */
   get eventbusProxy() { return this.#eventbusProxy; }

   /**
    * Get plugin instance.
    *
    * @returns {object} The plugin instance.
    */
   get instance() { return this.#instance; }

   /**
    * Get plugin name.
    *
    * @returns {string} Plugin name.
    */
   get name() { return this.#name; }


   /**
    * Set associated EventbusProxy.
    *
    * @param {EventbusProxy} eventbusProxy - EventbusProxy instance to associate.
    */
   set eventbusProxy(eventbusProxy) { this.#eventbusProxy = eventbusProxy; }

   /**
    * Set any associated import.meta data.
    *
    * @param {object} importmeta - import.meta data.
    */
   set importmeta(importmeta) { this.#importmeta = importmeta; }

   /**
    * Set plugin instance.
    *
    * @param {object} instance - The plugin instance.
    */
   set instance(instance) { this.#instance = instance; }
}
