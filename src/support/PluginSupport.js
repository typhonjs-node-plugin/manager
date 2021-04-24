import PluginEntry    from '../PluginEntry.js';
import { isIterable } from "@typhonjs-utils/object";

/**
 * Provides a lightweight plugin manager for Node / NPM & the browser with eventbus integration for plugins in a safe
 * and protected manner across NPM modules, local files, and preloaded object instances. This pattern facilitates
 * message passing between modules versus direct dependencies / method invocation.
 *
 * It isn't necessary to use an eventbus associated with the plugin manager though invocation then relies on invoking
 * methods directly with the plugin manager instance.
 *
 * A default eventbus will be created, but you may also pass in an eventbus from `@typhonjs-plugin/eventbus` and the
 * plugin manager will register by default under these event categories:
 *
 * `plugins:get:method:names` - {@link PluginSupport#getMethodNames}
 *
 * `plugins:has:method` - {@link PluginSupport#hasMethod}
 *
 * `plugins:has:plugin:method` - {@link PluginSupport#hasPluginMethod}
 *
 * @implements {PluginSupportImpl}
 */
export default class PluginSupport
{
   constructor(pluginManager)
   {
      this._pluginManager = pluginManager;
   }

   get isDestroyed()
   {
      return this._pluginManager === null || this._pluginManager === void 0 ||
         this._pluginManager._pluginMap === null || this._pluginManager._pluginMap === void 0;
   }

   get pluginMap()
   {
      /* c8 ignore next 4 */
      if (this.isDestroyed)
      {
         throw new ReferenceError('This PluginManager instance has been destroyed.');
      }

      return this._pluginManager._pluginMap;
   }

   /**
    * Destroys all managed plugins after unloading them.
    *
    * @param {object}     options - An options object.
    *
    * @param {Eventbus}   options.eventbus - The eventbus to disassociate.
    *
    * @param {string}     options.eventPrepend - The current event prepend.
    */
   async destroy({ eventbus, eventPrepend } = {})
   {
      if (eventbus !== null && eventbus !== void 0)
      {
         eventbus.off(`${eventPrepend}:get:method:names`, this.getMethodNames, this);
         eventbus.off(`${eventPrepend}:has:method`, this.hasMethod, this);
         eventbus.off(`${eventPrepend}:has:plugin:method`, this.hasPluginMethod, this);
      }

      this._pluginManager = null;
   }

   /**
    * Returns method names for a specific plugin, list of plugins, or all plugins. The enabled state can be specified
    * along with sorting methods by plugin name.
    *
    * @param {object}                  [opts] Options object. If undefined all plugin data is returned.
    *
    * @param {boolean}                 [opts.enabled] If enabled is a boolean it will return plugin methods names given
    *                                                 the respective enabled state.
    *
    * @param {string|Iterable<string>} [opts.plugins] Plugin name or iterable list of names.
    *
    * @returns {string[]} A list of method names
    */
   getMethodNames({ enabled = void 0, plugins = [] } = {})
   {
      if (this.isDestroyed)
      { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (enabled !== void 0 && typeof enabled !== 'boolean')
      {
         throw new TypeError(`'enabled' is not a boolean.`);
      }

      if (typeof plugins !== 'string' && !isIterable(plugins))
      {
         throw new TypeError(`'plugins' is not a string or iterable.`);
      }

      // Create an array from a single plugin name.
      if (typeof plugins === 'string')
      {
         plugins = [plugins];
      }

      const anyEnabledState = enabled === void 0;

      const results = {};

      let count = 0;

      for (const name of plugins)
      {
         const entry = this.pluginMap.get(name);

         if (entry.instance && (anyEnabledState || entry.enabled === enabled))
         {
            for (const name of s_GET_ALL_PROPERTY_NAMES(entry.instance))
            {
               // Skip any names that are not a function or are the constructor.
               if (entry.instance[name] instanceof Function && name !== 'constructor')
               { results[name] = true; }
            }
         }

         count++;
      }

      // Iterable plugins had no entries so return all plugin data.
      if (count === 0)
      {
         for (const entry of this.pluginMap.values())
         {
            if (entry.instance && (anyEnabledState || entry.enabled === enabled))
            {
               for (const name of s_GET_ALL_PROPERTY_NAMES(entry.instance))
               {
                  // Skip any names that are not a function or are the constructor.
                  if (entry.instance[name] instanceof Function && name !== 'constructor')
                  { results[name] = true; }
               }
            }
         }
      }

      return Object.keys(results).sort();
   }

   /**
    * Returns true if there is at least one plugin loaded with the given method name.
    *
    * @param {string}   methodName - Method name to test.
    *
    * @returns {boolean} - True method is found.
    */
   hasMethod(methodName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof methodName !== 'string') { throw new TypeError(`'methodName' is not a string.`); }

      for (const plugin of this.pluginMap.values())
      {
         if (typeof plugin.instance[methodName] === 'function') { return true; }
      }

      return false;
   }

   /**
    * Returns true if there is a plugin loaded with the given plugin name that also has a method with the given
    * method name.
    *
    * @param {string}   pluginName - Plugin name to test.
    * @param {string}   methodName - Method name to test.
    *
    * @returns {boolean} - True if a plugin and method exists.
    */
   hasPluginMethod(pluginName, methodName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginName !== 'string') { throw new TypeError(`'pluginName' is not a string.`); }
      if (typeof methodName !== 'string') { throw new TypeError(`'methodName' is not a string.`); }

      const plugin = this.pluginMap.get(pluginName);

      return plugin instanceof PluginEntry && typeof plugin[methodName] === 'function';
   }

   /**
    * Sets the eventbus associated with this plugin manager. If any previous eventbus was associated all plugin manager
    * events will be removed then added to the new eventbus. If there are any existing plugins being managed their
    * events will be removed from the old eventbus and then `onPluginLoad` will be called with the new eventbus.
    *
    * @param {object}     options - An options object.
    *
    * @param {Eventbus}   options.oldEventbus - The old eventbus to disassociate.
    *
    * @param {Eventbus}   options.newEventbus - The new eventbus to associate.
    *
    * @param {string}     options.oldPrepend - The old event prepend.
    *
    * @param {string}     options.newPrepend - The new event prepend.
    */
   setEventbus({ oldEventbus, newEventbus, oldPrepend, newPrepend } = {})
   {
      if (oldEventbus !== null && oldEventbus !== void 0)
      {
         oldEventbus.off(`${oldPrepend}:get:plugin:by:event`, this.getPluginByEvent, this);
         oldEventbus.off(`${oldPrepend}:get:plugin:data`, this.getPluginData, this);
         oldEventbus.off(`${oldPrepend}:get:plugin:events`, this.getPluginEvents, this);
         oldEventbus.off(`${oldPrepend}:get:plugin:names`, this.getPluginNames, this);

         oldEventbus.off(`${oldPrepend}:get:method:names`, this.getMethodNames, this);
         oldEventbus.off(`${oldPrepend}:has:method`, this.hasMethod, this);
         oldEventbus.off(`${oldPrepend}:has:plugin:method`, this.hasPluginMethod, this);
      }

      if (newEventbus !== null && newEventbus !== void 0)
      {
         newEventbus.on(`${newPrepend}:get:plugin:by:event`, this.getPluginByEvent, this);
         newEventbus.on(`${newPrepend}:get:plugin:data`, this.getPluginData, this);
         newEventbus.on(`${newPrepend}:get:plugin:events`, this.getPluginEvents, this);
         newEventbus.on(`${newPrepend}:get:plugin:names`, this.getPluginNames, this);

         newEventbus.on(`${newPrepend}:get:method:names`, this.getMethodNames, this);
         newEventbus.on(`${newPrepend}:has:method`, this.hasMethod, this);
         newEventbus.on(`${newPrepend}:has:plugin:method`, this.hasPluginMethod, this);
      }
   }
}

// Module Private ----------------------------------------------------------------------------------------------------

/**
 * Walks an objects inheritance tree collecting property names stopping before `Object` is reached.
 *
 * @param {object}   obj - object to walks.
 *
 * @returns {string[]} A list of property names.
 * @ignore
 */
const s_GET_ALL_PROPERTY_NAMES = (obj) =>
{
   const props = [];

   do
   {
      Object.getOwnPropertyNames(obj).forEach((prop) => { if (props.indexOf(prop) === -1) { props.push(prop); } });
      obj = Object.getPrototypeOf(obj);
   } while (typeof obj !== 'undefined' && obj !== null && !(obj === Object.prototype));

   return props;
};

/**
 * @typedef {object} DataOutPluginEvents
 *
 * @property {string}   plugin The plugin name.
 *
 * @property {string[]} events The event names registered.
 */
