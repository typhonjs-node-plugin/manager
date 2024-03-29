/**
 * Defines a class holding the data associated with a plugin including its instance.
 */
export class PluginEntry
{
   /**
    * Data describing the plugin, manager, and optional module data.
    *
    * @type {import('.').PluginData}
    */
   #data;

   /**
    * The plugin enabled state.
    *
    * @type {boolean}
    */
   #enabled;

   /**
    * The plugin name.
    *
    * @type {string}
    */
   #name;

   /**
    * Any stored import.meta data.
    *
    * @type {object}
    */
   #importmeta;

   /**
    * The loaded plugin instance.
    *
    * @type {object}
    */
   #instance;

   /**
    * An EventbusProxy associated with the plugin wrapping the plugin manager eventbus.
    *
    * @type {import('#runtime/plugin/manager/eventbus').EventbusProxy}
    */
   #eventbusProxy;

   /**
    * Stores the proxied event names, callback functions, context and guarded state when this plugin is disabled.
    *
    * @type {Array<[string, Function, object, import('#runtime/plugin/manager/eventbus').EventOptionsOut]>}
    */
   #events;

   /**
    * Instantiates a PluginEntry.
    *
    * @param {string}      name - The plugin name.
    *
    * @param {import('.').PluginData}  data - Describes the plugin, manager, and optional module data.
    *
    * @param {object}      instance - The loaded plugin instance.
    *
    * @param {import('#runtime/plugin/manager/eventbus').EventbusProxy}  eventbusProxy - The EventbusProxy associated with the plugin
    *        wrapping the plugin manager eventbus.
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
    * @returns {import('.').PluginData} The associated PluginData.
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
   get importmeta() { return this.#importmeta; }

   /**
    * Reset will cleanup most resources for remove / reload. 'remove' should manually destroy #eventbusProxy.
    */
   reset()
   {
      try
      {
         this.#events = void 0;
         this.#importmeta = void 0;

         // Automatically remove any potential reference to a stored event proxy instance.
         delete this.#instance._eventbus;
      }
      catch (err) { /* noop */ }
   }

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
    * @returns {import('#runtime/plugin/manager/eventbus').EventbusProxy} Associated EventbusProxy.
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
    * @param {import('#runtime/plugin/manager/eventbus').EventbusProxy} eventbusProxy - EventbusProxy instance to associate.
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
