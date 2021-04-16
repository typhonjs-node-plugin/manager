import { EventbusProxy } from '@typhonjs-plugin/eventbus';

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
    * Provides a convenience method to escape file paths.
    *
    * @param {string}   value - A string to escape.
    *
    * @returns {string} An escaped string.
    */
   static escape(value)
   {
      if (typeof value !== 'string') { throw new TypeError(`'value' is not a string.`); }

      // Remove any leading relative directory paths.
      let escaped = value.replace(/^(\.\.|\.)/, '');

      // Escape any forward / reverse slashes for RegExp creation.
      escaped = escaped.replace(/[\\]/g, '\\');
      escaped = escaped.replace(/[/]/g, '\\/');

      return escaped;
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

/**
 * @typedef {object} PluginData
 *
 * @property {object}   manager - Data about the plugin manager
 *
 * @property {string}   manager.eventPrepend - The plugin manager event prepend string.
 *
 * @property {object}   module - Optional object hash to associate with plugin.
 *
 * @property {object}   plugin - Data about the plugin.
 *
 * @property {string}   plugin.name - The name of the plugin.
 *
 * @property {string}   plugin.scopedName - The name of the plugin with the plugin managers event prepend string.
 *
 * @property {string}   plugin.target - Defines the target NPM module to loaded or defines a local file (full
 *                               path or relative to current working directory to load.
 *
 * @property {string}   plugin.targetEscaped - Provides the target, but properly escaped for RegExp usage.
 *
 * @property {string}   plugin.type - The type of plugin: `instance` +
 *                                    In Node: `import-module`, `import-path`, `require-module`, or `require-path`.
 *                                    In Browser: `import-path`, `import-url`.
 *
 * @property {object}   plugin.options - Defines an object of options for the plugin.
 */
