import Eventbus      from '@typhonjs-plugin/eventbus';

import PluginEntry   from './PluginEntry.js';

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
 * `plugins:get:all:plugin:data` - {@link PluginSupport#getAllPluginData}
 *
 * `plugins:get:method:names` - {@link PluginSupport#getMethodNames}
 *
 * `plugins:get:plugin:data` - {@link PluginSupport#getPluginData}
 *
 * `plugins:get:plugin:event:names` - {@link PluginSupport#getPluginEventNames}
 *
 * `plugins:get:plugin:method:names` - {@link PluginSupport#getPluginMethodNames}
 *
 * `plugins:get:plugin:names` - {@link PluginSupport#getPluginNames}
 *
 * `plugins:get:plugin:options` - {@link PluginSupport#getPluginOptions}
 *
 * `plugins:get:plugins:by:event:name` - {@link PluginSupport#getPluginsByEventName}
 *
 * `plugins:get:plugins:event:names` - {@link PluginSupport#getPluginsEventNames}
 *
 * `plugins:has:method` - {@link PluginSupport#hasMethod}
 *
 * `plugins:has:plugin:method` - {@link PluginSupport#hasPluginMethod}
 *
 * @example
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
         eventbus.off(`${eventPrepend}:get:all:plugin:data`, this.getAllPluginData, this);
         eventbus.off(`${eventPrepend}:get:method:names`, this.getMethodNames, this);
         eventbus.off(`${eventPrepend}:get:plugin:data`, this.getPluginData, this);
         eventbus.off(`${eventPrepend}:get:plugin:event:names`, this.getPluginEventNames, this);
         eventbus.off(`${eventPrepend}:get:plugin:method:names`, this.getPluginMethodNames, this);
         eventbus.off(`${eventPrepend}:get:plugin:names`, this.getPluginNames, this);
         eventbus.off(`${eventPrepend}:get:plugin:options`, this.getPluginOptions, this);
         eventbus.off(`${eventPrepend}:get:plugins:by:event:name`, this.getPluginsByEventName, this);
         eventbus.off(`${eventPrepend}:get:plugins:event:names`, this.getPluginsEventNames, this);
         eventbus.off(`${eventPrepend}:has:method`, this.hasMethod, this);
         eventbus.off(`${eventPrepend}:has:plugin:method`, this.hasPluginMethod, this);
      }

      this._pluginManager = null;
   }

   /**
    * Returns all plugin data or if a boolean is passed in will return plugin data by current enabled state.
    *
    * @param {boolean|undefined} enabled - If enabled is a boolean it will return plugins given their enabled state.
    *
    * @returns {PluginData[]} A list of all PluginData or just enabled / disabled plugins.
    */
   getAllPluginData(enabled = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof enabled !== 'boolean' && typeof enabled !== 'undefined')
      {
         throw new TypeError(`'enabled' is not a 'boolean' or 'undefined'.`);
      }

      const results = [];

      // Return all plugin data if enabled is not defined.
      const allPlugins = enabled === void 0;

      for (const entry of this.pluginMap.values())
      {
         if (allPlugins || entry.enabled === enabled)
         {
            results.push(this.getPluginData(entry.name));
         }
      }

      return results;
   }

   /**
    * Returns all method names or if a boolean is passed in will return method names for plugins by current enabled
    * state.
    *
    * @param {boolean|undefined} [enabled] - If enabled is a boolean it will return plugin methods names given their
    *                                        enabled state.
    *
    * @param {string|undefined}  [pluginName] - If a string then just this plugins methods names are returned.
    *
    * @returns {string[]} A list of method names
    */
   getMethodNames(enabled = void 0, pluginName = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof enabled !== 'boolean' && typeof enabled !== 'undefined')
      {
         throw new TypeError(`'enabled' is not a 'boolean' or 'undefined'.`);
      }

      const results = {};
      const allEnabled = typeof enabled === 'undefined';
      const allNames = typeof pluginName === 'undefined';

      for (const entry of this.pluginMap.values())
      {
         if (entry.instance && (allEnabled || entry.enabled === enabled) && (allNames || entry.name === pluginName))
         {
            for (const name of s_GET_ALL_PROPERTY_NAMES(entry.instance))
            {
               // Skip any names that are not a function or are the constructor.
               if (entry.instance[name] instanceof Function && name !== 'constructor') { results[name] = true; }
            }
         }
      }

      return Object.keys(results);
   }

   /**
    * Gets the plugin data for a plugin by name.
    *
    * @param {string}   pluginName - A plugin name.
    *
    * @returns {PluginData|undefined} The plugin data for a specific plugin.
    */
   getPluginData(pluginName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginName !== 'string') { throw new TypeError(`'pluginName' is not a string.`); }

      const entry = this.pluginMap.get(pluginName);

      if (entry instanceof PluginEntry)
      {
         return JSON.parse(JSON.stringify(entry.data));
      }

      return void 0;
   }

// TODO FINISH IMPLEMENTING
   // /**
   //  * Returns the event binding names registered on any associated plugin EventbusProxy.
   //  *
   //  * @param {string}   pluginName - Plugin name to set state.
   //  *
   //  * @returns {string[]} - Event binding names registered from the plugin.
   //  *
   //  * @param {undefined|object}  [options] - Options object. If undefined all plugin enabled state is returned.
   //  *
   //  * @param {string|string[]}   [options.pluginNames] - Plugin name or list of names to get state.
   //  *
   //  * @returns {boolean|Array<{pluginName: string, enabled: boolean}>} - Event binding names registered from a
   //  *                                                                    plugin, list of plugins, or all plugins.
   //  */
   // newPluginEventNames({ pluginNames = [] } = {})
   // {
   //    if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }
   //
   //    if (typeof pluginName !== 'string') { throw new TypeError(`'pluginName' is not a string.`); }
   //
   //    const entry = this.pluginMap.get(pluginName);
   //
   //    return entry instanceof PluginEntry && entry.eventbusProxy ? entry.eventbusProxy.proxyEventNames : [];
   // }

   /**
    * Returns the event binding names registered on any associated plugin EventbusProxy.
    *
    * @param {string}   pluginName - Plugin name to set state.
    *
    * @returns {string[]} - Event binding names registered from the plugin.
    */
   getPluginEventNames(pluginName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginName !== 'string') { throw new TypeError(`'pluginName' is not a string.`); }

      const entry = this.pluginMap.get(pluginName);

      return entry instanceof PluginEntry && entry.eventbusProxy ? Array.from(entry.eventbusProxy.proxyKeys()) : [];
   }

   /**
    * Returns the event binding names registered from each plugin.
    *
    * @param {string|string[]} [nameOrList] - An array / iterable of plugin names.
    *
    * @returns {Array<{pluginName: string, events: string[]}>} A list of objects with plugin name and event binding
    *                                                          names registered from the plugin.
    */
   getPluginsEventNames(nameOrList)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof nameOrList === 'undefined') { nameOrList = this.pluginMap.keys(); }
      if (typeof nameOrList === 'string') { nameOrList = [nameOrList]; }

      const results = [];

      for (const pluginName of nameOrList)
      {
         results.push({ pluginName, events: this.getPluginEventNames(pluginName) });
      }

      return results;
   }

   /**
    * Returns the plugin names that registered the given event binding name.
    *
    * @param {string} eventName - An event name that plugins may have registered.
    *
    * @returns {string[]} A list of plugin names that has registered the given event name.
    */
   getPluginsByEventName(eventName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof eventName !== 'string') { throw new TypeError(`'eventName' is not a 'string'.`); }

      const results = [];

      const pluginEventNames = this.getPluginsEventNames();

      for (const entry of pluginEventNames)
      {
         if (entry.events.indexOf(eventName) >= 0) { results.push(entry.pluginName); }
      }

      return results;
   }

   /**
    * Returns all plugin names or if a boolean is passed in will return plugin names by current enabled state.
    *
    * @param {boolean|undefined} enabled - If enabled is a boolean it will return plugins given their enabled state.
    *
    * @returns {Array<{plugin: string, method: string}>} A list of plugin names and method names.
    */
   getPluginMethodNames(enabled = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof enabled !== 'boolean' && typeof enabled !== 'undefined')
      {
         throw new TypeError(`'enabled' is not a 'boolean' or 'undefined'.`);
      }

      const results = [];
      const allPlugins = typeof enabled === 'undefined';

      for (const entry of this.pluginMap.values())
      {
         if (entry.instance && (allPlugins || entry.enabled === enabled))
         {
            for (const name of s_GET_ALL_PROPERTY_NAMES(entry.instance))
            {
               // Skip any names that are not a function or are the constructor.
               if (entry.instance[name] instanceof Function && name !== 'constructor')
               {
                  results.push({ plugin: entry.name, method: name });
               }
            }
         }
      }

      return results;
   }

   /**
    * Returns all plugin names or if a boolean is passed in will return plugin names by current enabled state.
    *
    * @param {boolean|undefined} enabled - If enabled is a boolean it will return plugins given their enabled state.
    *
    * @returns {string[]} A list of plugin names optionally by enabled state.
    */
   getPluginNames(enabled = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof enabled !== 'boolean' && typeof enabled !== 'undefined')
      {
         throw new TypeError(`'enabled' is not a 'boolean' or 'undefined'.`);
      }

      // Return all plugin names if enabled is not defined.
      if (enabled === void 0) { return Array.from(this.pluginMap.keys()); }

      const results = [];

      for (const entry of this.pluginMap.values())
      {
         if (entry.enabled === enabled) { results.push(entry.name); }
      }

      return results;
   }

   /**
    * Returns a copy of the given plugin options.
    *
    * @param {string}   pluginName - Plugin name to retrieve.
    *
    * @returns {*} A copy of the given plugin options.
    */
   getPluginOptions(pluginName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginName !== 'string') { throw new TypeError(`'pluginName' is not a string.`); }

      let result;

      const entry = this.pluginMap.get(pluginName);

      if (entry instanceof PluginEntry) { result = JSON.parse(JSON.stringify(entry.data.plugin.options)); }

      return result;
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
         oldEventbus.off(`${oldPrepend}:get:all:plugin:data`, this.getAllPluginData, this);
         oldEventbus.off(`${oldPrepend}:get:method:names`, this.getMethodNames, this);
         oldEventbus.off(`${oldPrepend}:get:plugin:data`, this.getPluginData, this);
         oldEventbus.off(`${oldPrepend}:get:plugin:event:names`, this.getPluginEventNames, this);
         oldEventbus.off(`${oldPrepend}:get:plugin:method:names`, this.getPluginMethodNames, this);
         oldEventbus.off(`${oldPrepend}:get:plugin:names`, this.getPluginNames, this);
         oldEventbus.off(`${oldPrepend}:get:plugin:options`, this.getPluginOptions, this);
         oldEventbus.off(`${oldPrepend}:get:plugins:by:event:name`, this.getPluginsByEventName, this);
         oldEventbus.off(`${oldPrepend}:get:plugins:event:names`, this.getPluginsEventNames, this);
         oldEventbus.off(`${oldPrepend}:has:method`, this.hasMethod, this);
         oldEventbus.off(`${oldPrepend}:has:plugin:method`, this.hasPluginMethod, this);
      }

      if (newEventbus !== null && newEventbus !== void 0)
      {
         newEventbus.on(`${newPrepend}:get:all:plugin:data`, this.getAllPluginData, this);
         newEventbus.on(`${newPrepend}:get:method:names`, this.getMethodNames, this);
         newEventbus.on(`${newPrepend}:get:plugin:data`, this.getPluginData, this);
         newEventbus.on(`${newPrepend}:get:plugin:event:names`, this.getPluginEventNames, this);
         newEventbus.on(`${newPrepend}:get:plugin:method:names`, this.getPluginMethodNames, this);
         newEventbus.on(`${newPrepend}:get:plugin:names`, this.getPluginNames, this);
         newEventbus.on(`${newPrepend}:get:plugin:options`, this.getPluginOptions, this);
         newEventbus.on(`${newPrepend}:get:plugins:by:event:name`, this.getPluginsByEventName, this);
         newEventbus.on(`${newPrepend}:get:plugins:event:names`, this.getPluginsEventNames, this);
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

/**
 * Interface for PluginSupport instances.
 *
 * @interface PluginSupportImpl
 */

/**
 * A method to invoke when the plugin manager is destroyed.
 *
 * @function
 * @async
 * @name PluginSupportImpl#destroy
 */

/**
 * A method to invoke when the plugin manager eventbus is set.
 *
 * @function
 * @async
 * @name PluginSupportImpl#setEventbus
 */
