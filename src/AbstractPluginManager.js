import Eventbus                     from '@typhonjs-plugin/eventbus';
import { EventbusProxy }            from '@typhonjs-plugin/eventbus';
import { deepFreeze, isIterable }   from '@typhonjs-utils/object';

import PluginEntry                  from './PluginEntry.js';
import PluginEvent                  from './PluginEvent.js';

import isValidConfig                from './isValidConfig.js';

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
 * `plugins:async:add` - {@link AbstractPluginManager#add}
 *
 * `plugins:async:add:all` - {@link AbstractPluginManager#addAll}
 *
 * `plugins:async:destroy:manager` - {@link AbstractPluginManager#destroy}
 *
 * `plugins:async:invoke` - {@link AbstractPluginManager#invokeAsync}
 *
 * `plugins:async:invoke:event` - {@link AbstractPluginManager#invokeAsyncEvent}
 *
 * `plugins:async:remove` - {@link AbstractPluginManager#remove}
 *
 * `plugins:async:remove:all` - {@link AbstractPluginManager#removeAll}
 *
 * `plugins:create:eventbus:proxy` - {@link AbstractPluginManager#createEventbusProxy}
 *
 * `plugins:get:enabled` - {@link AbstractPluginManager#getPluginsEnabled}
 *
 * `plugins:get:options` - {@link AbstractPluginManager#getOptions}
 *
 * `plugins:has:plugin` - {@link AbstractPluginManager#hasPlugin}
 *
 * `plugins:invoke` - {@link AbstractPluginManager#invoke}
 *
 * `plugins:is:valid:config` - {@link AbstractPluginManager#isValidConfig}
 *
 * `plugins:set:enabled` - {@link AbstractPluginManager#setPluginsEnabled}
 *
 * `plugins:set:options` - {@link AbstractPluginManager#setOptions}
 *
 * `plugins:sync:invoke` - {@link AbstractPluginManager#invokeSync}
 *
 * `plugins:sync:invoke:event` - {@link AbstractPluginManager#invokeSyncEvent}
 *
 * Automatically when a plugin is loaded and unloaded respective callbacks `onPluginLoad` and `onPluginUnload` will
 * be attempted to be invoked on the plugin. This is an opportunity for the plugin to receive any associated eventbus
 * and wire itself into it. It should be noted that a protected proxy around the eventbus is passed to the plugins
 * such that when the plugin is removed automatically all events registered on the eventbus are cleaned up without
 * a plugin author needing to do this manually in the `onPluginUnload` callback. This solves any dangling event binding
 * issues.
 *
 * By supporting ES Modules in Node and the browser and CJS on Node the plugin manager is by nature asynchronous for
 * the
 * core methods of adding / removing plugins and destroying the manager. The lifecycle methods `onPluginLoad` and
 * `onPluginUnload` will be awaited on such that if a plugin returns a Promise or is an async method
 * then it will complete before execution continues.
 *
 * It is recommended to interact with the plugin manager eventbus through an eventbus proxy. The
 * `createEventbusProxy` method will return a proxy to the default or currently set eventbus.
 *
 * If eventbus functionality is enabled it is important especially if using a process / global level eventbus such as
 * `@typhonjs-plugin/eventbus/instances` to call {@link AbstractPluginManager#destroy} to clean up all plugin eventbus
 * resources and the plugin manager event bindings; this is primarily a testing concern.
 *
 * @see https://www.npmjs.com/package/@typhonjs-plugin/eventbus
 *
 * @example
 * import PluginManager from '@typhonjs-plugin/manager';
 *
 * const pluginManager = new PluginManager();
 *
 * pluginManager.add({ name: 'an-npm-plugin-enabled-module' });
 * pluginManager.add({ name: 'my-local-module', target: './myModule.js' });
 *
 * const eventbus = pluginManager.createEventbusProxy();
 *
 * // Let's say an-npm-plugin-enabled-module responds to 'cool:event' which returns 'true'.
 * // Let's say my-local-module responds to 'hot:event' which returns 'false'.
 * // Both of the plugin / modules will have 'onPluginLoaded' invoked with a proxy to the eventbus and any plugin
 * // options defined.
 *
 * // One can then use the eventbus functionality to invoke associated module / plugin methods even retrieving results.
 * assert(eventbus.triggerSync('cool:event') === true);
 * assert(eventbus.triggerSync('hot:event') === false);
 *
 * // One can also indirectly invoke any method of the plugin via:
 * eventbus.triggerSync('plugins:invoke:sync:event', 'aCoolMethod'); // Any plugin with a method named `aCoolMethod` is
 *    invoked. eventbus.triggerSync('plugins:invoke:sync:event', 'aCoolMethod', {}, {},
 *    'an-npm-plugin-enabled-module'); // specific invocation.
 *
 * // The 3rd parameter will make a copy of the hash and the 4th defines a pass through object hash sending a single
 * // event / object hash to the invoked method.
 *
 * // -----------------------
 *
 * // Given that `@typhonjs-plugin/eventbus/instances` defines a global / process level eventbus you can import it in
 *    an
 * entirely different file or even NPM module and invoke methods of loaded plugins like this:
 *
 * import eventbus from '@typhonjs-plugin/eventbus/instances';
 *
 * eventbus.triggerSync('plugins:invoke', 'aCoolMethod'); // Any plugin with a method named `aCoolMethod` is invoked.
 *
 * assert(eventbus.triggerSync('cool:event') === true);
 *
 * eventbus.trigger('plugins:remove', 'an-npm-plugin-enabled-module'); // Removes the plugin and unregisters events.
 *
 * assert(eventbus.triggerSync('cool:event') === true); // Will now fail!
 *
 * // In this case though when using the global eventbus be mindful to always call `pluginManager.destroy()` in the
 *    main
 * // thread of execution scope to remove all plugins and the plugin manager event bindings!
 */
export default class AbstractPluginManager
{
   /**
    * Instantiates AbstractPluginManager
    *
    * @param {object}   [options] Provides various configuration options:
    *
    * @param {Eventbus} [options.eventbus] An instance of '@typhonjs-plugin/eventbus' used as the plugin
    *                                      eventbus. If not provided a default eventbus is created.
    *
    * @param {string}   [options.eventPrepend='plugin'] A customized name to prepend PluginManager events on the
    *                                                   eventbus.
    *
    * @param {boolean}  [options.throwNoMethod=false] If true then when a method fails to be invoked by any plugin
    *                                                 an exception will be thrown.
    *
    * @param {boolean}  [options.throwNoPlugin=false] If true then when no plugin is matched to be invoked an
    *                                                 exception will be thrown.
    *
    * @param {PluginSupportImpl|Iterable<PluginSupportImpl>} [options.PluginSupport] Optional classes to pass in which
    *                                                 extends the plugin manager. A default implementation is available:
    *                                                 {@link PluginSupport}
    */
   constructor(options = {})
   {
      if (typeof options !== 'object') { throw new TypeError(`'options' is not an object.`); }

      if (options.PluginSupport !== void 0 && typeof options.PluginSupport !== 'function' &&
       !isIterable(options.PluginSupport))
      {
         throw new TypeError(
          `'options.PluginSupport' must be a constructor function or array of such matching PluginSupportImpl.`);
      }

      /**
       * Stores the plugins by name with an associated PluginEntry.
       *
       * @type {Map<string, PluginEntry>}
       * @private
       */
      this._pluginMap = new Map();

      /**
       * Stores any associated eventbus.
       *
       * @type {Eventbus}
       * @protected
       */
      this._eventbus = null;

      /**
       * Stores any EventbusProxy instances created, so that they may be automatically destroyed.
       *
       * @type {EventbusProxy[]}
       * @private
       */
      this._eventbusProxies = [];

      /**
       * Provides an array of PluginSupportImpl interfaces to extend the plugin manager through the eventbus API.
       *
       * @type {PluginSupportImpl[]}
       * @private
       */
      this._pluginSupport = [];

      // Instantiate any PluginSupport classes
      if (isIterable(options.PluginSupport))
      {
         for (const PluginSupport of options.PluginSupport)
         {
            this._pluginSupport.push(new PluginSupport(this));
         }
      }
      else if (options.PluginSupport !== void 0)
      {
         this._pluginSupport.push(new options.PluginSupport(this));
      }

      /**
       * Defines options for throwing exceptions. Turned off by default.
       *
       * @type {PluginManagerOptions}
       * @private
       */
      this._options =
      {
         pluginsEnabled: true,
         noEventAdd: false,
         noEventDestroy: false,
         noEventOptions: true,
         noEventRemoval: false,
         throwNoMethod: false,
         throwNoPlugin: false
      };

      this.setEventbus({
         eventbus: options.eventbus !== void 0 ? options.eventbus : new Eventbus(),
         eventPrepend: options.eventPrepend
      });

      this.setOptions(options);
   }

   /**
    * Adds a plugin by the given configuration parameters. A plugin `name` is always required. If no other options
    * are provided then the `name` doubles as the NPM module / local file to load. The loading first checks for an
    * existing `instance` to use as the plugin. Then the `target` is chosen as the NPM module / local file to load.
    * By passing in `options` this will be stored and accessible to the plugin during all callbacks.
    *
    * @param {PluginConfig}   pluginConfig Defines the plugin to load.
    *
    * @param {object}         [moduleData] Optional object hash to associate with plugin.
    *
    * @returns {Promise<PluginData|undefined>} The PluginData that represents the plugin added.
    */
   async add(pluginConfig, moduleData)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginConfig !== 'object') { throw new TypeError(`'pluginConfig' is not an object.`); }

      if (typeof pluginConfig.name !== 'string')
      {
         throw new TypeError(`'pluginConfig.name' is not a string for entry: ${JSON.stringify(pluginConfig)}.`);
      }

      if (typeof pluginConfig.target !== 'undefined' && typeof pluginConfig.target !== 'string' &&
       !(pluginConfig.target instanceof URL))
      {
         throw new TypeError(
          `'pluginConfig.target' is not a string or URL for entry: ${JSON.stringify(pluginConfig)}.`);
      }

      if (typeof pluginConfig.options !== 'undefined' && typeof pluginConfig.options !== 'object')
      {
         throw new TypeError(`'pluginConfig.options' is not an object for entry: ${JSON.stringify(pluginConfig)}.`);
      }

      if (typeof moduleData !== 'undefined' && typeof moduleData !== 'object')
      {
         throw new TypeError(`'moduleData' is not an object for entry: ${JSON.stringify(pluginConfig)}.`);
      }

      // If a plugin with the same name already exists post a warning and exit early.
      if (this._pluginMap.has(pluginConfig.name))
      {
         throw new Error(`A plugin already exists with name: ${pluginConfig.name}.`);
      }

      let instance, target, type;

      // Use an existing instance of a plugin; a static class is assumed when instance is a function.
      if (typeof pluginConfig.instance === 'object' || typeof pluginConfig.instance === 'function')
      {
         instance = pluginConfig.instance;

         target = pluginConfig.name;

         type = 'instance';
      }
      else
      {
         // If a target is defined use it instead of the name.
         target = pluginConfig.target || pluginConfig.name;

         // Defer to child class to load module in Node or the browser.
         const result = await this._loadModule(target);

         instance = result.instance;
         type = result.type;
      }

      // Convert any URL target a string.
      if (target instanceof URL)
      {
         target = target.toString();
      }

      /**
       * Create an object hash with data describing the plugin, manager, and any extra module data.
       *
       * @type {PluginData}
       */
      const pluginData = JSON.parse(JSON.stringify(
      {
         manager:
         {
            eventPrepend: this._eventPrepend
         },

         module: moduleData || {},

         plugin:
         {
            name: pluginConfig.name,
            scopedName: `${this._eventPrepend}:${pluginConfig.name}`,
            target,
            targetEscaped: PluginEntry.escape(target),
            type,
            options: pluginConfig.options || {}
         }
      }));

      deepFreeze(pluginData, ['eventPrepend', 'scopedName']);

      const eventbusProxy = this._eventbus !== null && typeof this._eventbus !== 'undefined' ?
       new EventbusProxy(this._eventbus) : void 0;

      const entry = new PluginEntry(pluginConfig.name, pluginData, instance, eventbusProxy);

      this._pluginMap.set(pluginConfig.name, entry);

      // Invoke private module method which allows skipping optional error checking.
      await s_INVOKE_ASYNC_EVENTS('onPluginLoad', {}, {}, pluginConfig.name, this._pluginMap, this._options, false);

      // Invoke `typhonjs:plugin:manager:plugin:added` allowing external code to react to plugin addition.
      if (this._eventbus)
      {
         await this._eventbus.triggerAsync(`typhonjs:plugin:manager:plugin:added`, pluginData);
      }

      return pluginData;
   }

   /**
    * Initializes multiple plugins in a single call.
    *
    * @param {Iterable<PluginConfig>}  pluginConfigs An iterable list of plugin config object hash entries.
    *
    * @param {object}                  [moduleData] Optional object hash to associate with all plugins.
    *
    * @returns {Promise<PluginData[]>} An array of PluginData objects of all loaded plugins.
    */
   async addAll(pluginConfigs = [], moduleData)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!isIterable(pluginConfigs)) { throw new TypeError(`'pluginConfigs' is not iterable.`); }

      const pluginsData = [];

      for (const pluginConfig of pluginConfigs)
      {
         const result = await this.add(pluginConfig, moduleData);

         if (result) { pluginsData.push(result); }
      }

      return pluginsData;
   }

   /**
    * Provides the eventbus callback which may prevent addition if optional `noEventAdd` is enabled. This disables
    * the ability for plugins to be added via events preventing any external code adding plugins in this manner.
    *
    * @param {PluginConfig}   pluginConfig Defines the plugin to load.
    *
    * @param {object}         [moduleData] Optional object hash to associate with all plugins.
    *
    * @returns {Promise<PluginData|undefined>} - Operation success.
    * @private
    */
   async _addEventbus(pluginConfig, moduleData)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return !this._options.noEventAdd ? this.add(pluginConfig, moduleData) : void 0;
   }

   /**
    * Provides the eventbus callback which may prevent addition if optional `noEventAdd` is enabled. This disables
    * the ability for plugins to be added via events preventing any external code adding plugins in this manner.
    *
    * @param {Iterable<PluginConfig>}  pluginConfigs An iterable list of plugin config object hash entries.
    *
    * @param {object}                  [moduleData] Optional object hash to associate with all plugins.
    *
    * @returns {Promise<PluginData[]>} An array of PluginData objects of all loaded plugins.
    * @private
    */
   async _addAllEventbus(pluginConfigs, moduleData)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!this._options.noEventAdd) { return this.addAll(pluginConfigs, moduleData); }
   }

   /**
    * If an eventbus is assigned to this plugin manager then a new EventbusProxy wrapping this eventbus is returned.
    * It is added to `this._eventbusProxies` so †hat the instances are destroyed when the plugin manager is destroyed.
    *
    * @returns {EventbusProxy} A proxy for the currently set Eventbus.
    */
   createEventbusProxy()
   {
      if (!(this._eventbus instanceof Eventbus))
      {
         throw new ReferenceError('No eventbus assigned to plugin manager.');
      }

      const eventbusProxy = new EventbusProxy(this._eventbus);

      // Store proxy to make sure it is destroyed when the plugin manager is destroyed.
      this._eventbusProxies.push(eventbusProxy);

      return eventbusProxy;
   }

   /**
    * Destroys all managed plugins after unloading them.
    */
   async destroy()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      // Remove all plugins; this will invoke onPluginUnload.
      await this.removeAll();

      // Destroy any EventbusProxy instances created.
      for (const eventbusProxy of this._eventbusProxies)
      {
         eventbusProxy.destroy();
      }

      this._eventbusProxies = [];

      if (this._eventbus !== null && typeof this._eventbus !== 'undefined')
      {
         this._eventbus.off(`${this._eventPrepend}:async:add`, this._addEventbus, this);
         this._eventbus.off(`${this._eventPrepend}:async:add:all`, this._addAllEventbus, this);
         this._eventbus.off(`${this._eventPrepend}:async:destroy:manager`, this._destroyEventbus, this);
         this._eventbus.off(`${this._eventPrepend}:async:invoke`, this.invokeAsync, this);
         this._eventbus.off(`${this._eventPrepend}:async:invoke:event`, this.invokeAsyncEvent, this);
         this._eventbus.off(`${this._eventPrepend}:async:remove`, this._removeEventbus, this);
         this._eventbus.off(`${this._eventPrepend}:async:remove:all`, this._removeAllEventbus, this);
         this._eventbus.off(`${this._eventPrepend}:create:eventbus:proxy`, this.createEventbusProxy, this);
         this._eventbus.off(`${this._eventPrepend}:get:enabled`, this.getPluginsEnabled, this);
         this._eventbus.off(`${this._eventPrepend}:get:options`, this.getOptions, this);
         this._eventbus.off(`${this._eventPrepend}:has:plugin`, this.hasPlugin, this);
         this._eventbus.off(`${this._eventPrepend}:invoke`, this.invoke, this);
         this._eventbus.off(`${this._eventPrepend}:is:valid:config`, this.isValidConfig, this);
         this._eventbus.off(`${this._eventPrepend}:set:enabled`, this.setPluginsEnabled, this);
         this._eventbus.off(`${this._eventPrepend}:set:options`, this._setOptionsEventbus, this);
         this._eventbus.off(`${this._eventPrepend}:sync:invoke`, this.invokeSync, this);
         this._eventbus.off(`${this._eventPrepend}:sync:invoke:event`, this.invokeSyncEvent, this);
      }

      for (const pluginSupport of this._pluginSupport)
      {
         await pluginSupport.destroy({ eventbus: this._eventbus, eventPrepend: this._eventPrepend });
      }

      this._pluginSupport = [];
      this._pluginMap = null;
      this._eventbus = null;
   }

   /**
    * Provides the eventbus callback which may prevent plugin manager destruction if optional `noEventDestroy` is
    * enabled. This disables the ability for the plugin manager to be destroyed via events preventing any external
    * code removing plugins in this manner.
    *
    * @private
    * @returns {Promise} The promise returned from `destroy` or immediate resolution.
    */
   async _destroyEventbus()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!this._options.noEventDestroy) { return this.destroy(); }
   }

   /**
    * Returns whether this plugin manager has been destroyed.
    *
    * @returns {boolean} Returns whether this plugin manager has been destroyed.
    */
   get isDestroyed()
   {
      return this._pluginMap === null || this._pluginMap === void 0;
   }

   /**
    * Returns any associated eventbus.
    *
    * @returns {Eventbus|null} The associated eventbus.
    */
   getEventbus()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return this._eventbus;
   }

   /**
    * Returns a copy of the plugin manager options.
    *
    * @returns {PluginManagerOptions} A copy of the plugin manager options.
    */
   getOptions()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return JSON.parse(JSON.stringify(this._options));
   }

   /**
    * Returns the enabled state of a plugin, a list of plugins, or all plugins.
    *
    * @param {undefined|object}        [options] Options object. If undefined all plugin enabled state is returned.
    *
    * @param {string|Iterable<string>} [options.pluginNames] Plugin name or iterable list of names to get state.
    *
    * @returns {boolean|Array<{pluginName: string, enabled: boolean}>} Enabled state for single plugin or array of
    *                                                                  results for multiple plugins.
    */
   getPluginsEnabled({ pluginNames = [] } = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginNames !== 'string' && !isIterable(pluginNames))
      {
         throw new TypeError(`'pluginNames' is not a string or iterable.`);
      }

      // Return a single boolean enabled result for a single plugin if found.
      if (typeof pluginNames === 'string')
      {
         const entry = this._pluginMap.get(pluginNames);
         return entry instanceof PluginEntry && entry.enabled;
      }

      const results = [];

      let count = 0;

      for (const pluginName of pluginNames)
      {
         const entry = this._pluginMap.get(pluginName);
         const loaded = entry instanceof PluginEntry;
         results.push({ pluginName, enabled: loaded && entry.enabled, loaded });
         count++;
      }

      // Iterable pluginNames had no entries so return all plugin data.
      if (count === 0)
      {
         for (const [pluginName, entry] of this._pluginMap.entries())
         {
            const loaded = entry instanceof PluginEntry;
            results.push({ pluginName, enabled: loaded && entry.enabled, loaded });
         }
      }

      return results;
   }

   /**
    * Returns true if there is a plugin loaded with the given plugin name.
    *
    * @param {string}   pluginName Plugin name to test.
    *
    * @returns {boolean} True if a plugin exists.
    */
   hasPlugin(pluginName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginName !== 'string') { throw new TypeError(`'pluginName' is not a string.`); }

      return this._pluginMap.has(pluginName);
   }

   /**
    * This dispatch method simply invokes any plugin targets for the given methodName..
    *
    * @param {string}            methodName Method name to invoke.
    *
    * @param {*|Array<*>}        [args] Optional arguments. An array will be spread as multiple arguments.
    *
    * @param {string|Iterable<string>} [pluginNames] An optional plugin name or iterable list of plugin names to invoke.
    */
   invoke(methodName, args = void 0, pluginNames = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof methodName !== 'string') { throw new TypeError(`'methodName' is not a string.`); }

      if (pluginNames === void 0) { pluginNames = this._pluginMap.keys(); }

      if (typeof pluginNames !== 'string' && !isIterable(pluginNames))
      {
         throw new TypeError(`'pluginNames' is not a string or iterable.`);
      }

      // Track if a plugin method is invoked.
      let hasMethod = false;
      let hasPlugin = false;

      // Early out if plugins are not enabled.
      if (!this._options.pluginsEnabled) { return; }

      if (typeof pluginNames === 'string')
      {
         const plugin = this._pluginMap.get(pluginNames);

         if (plugin instanceof PluginEntry && plugin.enabled && plugin.instance)
         {
            hasPlugin = true;

            if (typeof plugin.instance[methodName] === 'function')
            {
               Array.isArray(args) ? plugin.instance[methodName](...args) : plugin.instance[methodName](args);

               hasMethod = true;
            }
         }
      }
      else
      {
         for (const name of pluginNames)
         {
            const plugin = this._pluginMap.get(name);

            if (plugin instanceof PluginEntry && plugin.enabled && plugin.instance)
            {
               hasPlugin = true;

               if (typeof plugin.instance[methodName] === 'function')
               {
                  Array.isArray(args) ? plugin.instance[methodName](...args) : plugin.instance[methodName](args);

                  hasMethod = true;
               }
            }
         }
      }

      if (this._options.throwNoPlugin && !hasPlugin)
      {
         throw new Error(`PluginManager failed to find any target plugins.`);
      }

      if (this._options.throwNoMethod && !hasMethod)
      {
         throw new Error(`PluginManager failed to invoke '${methodName}'.`);
      }
   }

   /**
    * This dispatch method uses ES6 Promises and adds any returned results to an array which is added to a Promise.all
    * construction which passes back a Promise which waits until all Promises complete. Any target invoked may return a
    * Promise or any result. This is very useful to use for any asynchronous operations.
    *
    * @param {string}            methodName Method name to invoke.
    *
    * @param {*|Array<*>}        [args] Optional arguments. An array will be spread as multiple arguments.
    *
    * @param {string|Iterable<string>} [pluginNames] An optional plugin name or iterable list of plugin names to invoke.
    *
    * @returns {Promise<*|Array<*>>} A Promise with any returned results.
    */
   async invokeAsync(methodName, args = void 0, pluginNames = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof methodName !== 'string') { throw new TypeError(`'methodName' is not a string.`); }

      if (typeof pluginNames === 'undefined') { pluginNames = this._pluginMap.keys(); }

      if (typeof pluginNames !== 'string' && !isIterable(pluginNames))
      {
         throw new TypeError(`'pluginNames' is not a string, array, or iterator.`);
      }

      // Track if a plugin method is invoked.
      let hasMethod = false;
      let hasPlugin = false;

      // Capture results.
      let result = void 0;
      const results = [];

      // Early out if plugins are not enabled.
      if (!this._options.pluginsEnabled) { return result; }

      try
      {
         if (typeof pluginNames === 'string')
         {
            const plugin = this._pluginMap.get(pluginNames);

            if (plugin instanceof PluginEntry && plugin.enabled && plugin.instance)
            {
               hasPlugin = true;

               if (typeof plugin.instance[methodName] === 'function')
               {
                  result = Array.isArray(args) ? plugin.instance[methodName](...args) :
                   plugin.instance[methodName](args);

                  // If we received a valid result return immediately.
                  if (result !== null || typeof result !== 'undefined') { results.push(result); }

                  hasMethod = true;
               }
            }
         }
         else
         {
            for (const name of pluginNames)
            {
               const plugin = this._pluginMap.get(name);

               if (plugin instanceof PluginEntry && plugin.enabled && plugin.instance)
               {
                  hasPlugin = true;

                  if (typeof plugin.instance[methodName] === 'function')
                  {
                     result = Array.isArray(args) ? plugin.instance[methodName](...args) :
                      plugin.instance[methodName](args);

                     // If we received a valid result return immediately.
                     if (result !== null || typeof result !== 'undefined') { results.push(result); }

                     hasMethod = true;
                  }
               }
            }
         }

         if (this._options.throwNoPlugin && !hasPlugin)
         {
            return Promise.reject(new Error(`PluginManager failed to find any target plugins.`));
         }

         if (this._options.throwNoMethod && !hasMethod)
         {
            return Promise.reject(new Error(`PluginManager failed to invoke '${methodName}'.`));
         }
      }
      catch (error)
      {
         return Promise.reject(error);
      }

      // If there are multiple results then use Promise.all otherwise Promise.resolve.
      // TODO Filter results for undefined values
      return results.length > 1 ? Promise.all(results) : result;
   }

   /**
    * This dispatch method synchronously passes to and returns from any invoked targets a PluginEvent.
    *
    * @param {string}            methodName Method name to invoke.
    *
    * @param {object}            [copyProps] plugin event object.
    *
    * @param {object}            [passthruProps] If true, event has plugin option.
    *
    * @param {string|Iterable<string>} [pluginNames] An optional plugin name or iterable list of plugin names to invoke.
    *
    * @returns {Promise<PluginEvent>} A PluginEvent representing the invocation results.
    */
   async invokeAsyncEvent(methodName, copyProps = {}, passthruProps = {}, pluginNames = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (pluginNames === void 0) { pluginNames = this._pluginMap.keys(); }

      // Early out if plugins are not enabled.
      if (!this._options.pluginsEnabled) { return void 0; }

      // Invokes the private internal async events method with optional error checking enabled.
      return s_INVOKE_ASYNC_EVENTS(methodName, copyProps, passthruProps, pluginNames, this._pluginMap, this._options);
   }

   /**
    * This dispatch method synchronously passes back a single value or an array with all results returned by any
    * invoked targets.
    *
    * @param {string}            methodName Method name to invoke.
    *
    * @param {*|Array<*>}        [args] Optional arguments. An array will be spread as multiple arguments.
    *
    * @param {string|Iterable<string>} [pluginNames] An optional plugin name or iterable list of plugin names to invoke.
    *
    * @returns {*|Array<*>} An array of results.
    */
   invokeSync(methodName, args = void 0, pluginNames = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof methodName !== 'string') { throw new TypeError(`'methodName' is not a string.`); }

      if (typeof pluginNames === 'undefined') { pluginNames = this._pluginMap.keys(); }

      if (typeof pluginNames !== 'string' && !isIterable(pluginNames))
      {
         throw new TypeError(`'pluginNames' is not a string or iterable.`);
      }

      // Track if a plugin method is invoked.
      let hasMethod = false;
      let hasPlugin = false;

      // Capture results.
      let result = void 0;
      const results = [];

      // Early out if plugins are not enabled.
      if (!this._options.pluginsEnabled) { return result; }

      if (typeof pluginNames === 'string')
      {
         const plugin = this._pluginMap.get(pluginNames);

         if (plugin instanceof PluginEntry && plugin.enabled && plugin.instance)
         {
            hasPlugin = true;

            if (typeof plugin.instance[methodName] === 'function')
            {
               result = Array.isArray(args) ? plugin.instance[methodName](...args) : plugin.instance[methodName](args);

               // If we received a valid result return immediately.
               if (result !== null || typeof result !== 'undefined') { results.push(result); }

               hasMethod = true;
            }
         }
      }
      else
      {
         for (const name of pluginNames)
         {
            const plugin = this._pluginMap.get(name);

            if (plugin instanceof PluginEntry && plugin.enabled && plugin.instance)
            {
               hasPlugin = true;

               if (typeof plugin.instance[methodName] === 'function')
               {
                  result = Array.isArray(args) ? plugin.instance[methodName](...args) :
                   plugin.instance[methodName](args);

                  // If we received a valid result return immediately.
                  if (result !== null || typeof result !== 'undefined') { results.push(result); }

                  hasMethod = true;
               }
            }
         }
      }

      if (this._options.throwNoPlugin && !hasPlugin)
      {
         throw new Error(`PluginManager failed to find any target plugins.`);
      }

      if (this._options.throwNoMethod && !hasMethod)
      {
         throw new Error(`PluginManager failed to invoke '${methodName}'.`);
      }

      // Return the results array if there are more than one or just a single result.
      return results.length > 1 ? results : result;
   }

   /**
    * This dispatch method synchronously passes to and returns from any invoked targets a PluginEvent.
    *
    * @param {string}            methodName Method name to invoke.
    *
    * @param {object}            [copyProps] Properties to copy.
    *
    * @param {object}            [passthruProps] Properties to pass through.
    *
    * @param {string|Iterable<string>} [pluginNames] An optional plugin name or iterable list of plugin names to invoke.
    *
    * @returns {PluginEvent|undefined} A plugin event with invocation results.
    */
   invokeSyncEvent(methodName, copyProps = {}, passthruProps = {}, pluginNames = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (pluginNames === void 0) { pluginNames = this._pluginMap.keys(); }

      // Early out if plugins are not enabled.
      if (!this._options.pluginsEnabled) { return void 0; }

      // Invokes the private internal sync events method with optional error checking enabled.
      return s_INVOKE_SYNC_EVENTS(methodName, copyProps, passthruProps, pluginNames, this._pluginMap, this._options);
   }

   /**
    * Performs validation of a PluginConfig.
    *
    * @param {PluginConfig}   pluginConfig A PluginConfig to validate.
    *
    * @returns {boolean} True if the given PluginConfig is valid.
    */
   isValidConfig(pluginConfig)
   {
      return isValidConfig(pluginConfig);
   }

   /**
    * Child implementations provide platform specific module loading by overriding this method.
    *
    * @param {string|URL}   moduleOrPath A module name, file path, or URL.
    *
    * @returns {Promise<*>} Loaded module.
    * @private
    */
   async _loadModule(moduleOrPath)  // eslint-disable-line no-unused-vars
   {
   }

   /**
    * Removes a plugin by name after unloading it and clearing any event bindings automatically.
    *
    * @param {string}   pluginName The plugin name to remove.
    *
    * @returns {Promise<boolean>} Operation success.
    */
   async remove(pluginName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      const entry = this._pluginMap.get(pluginName);

      if (entry instanceof PluginEntry)
      {
         // Invoke private module method which allows skipping optional error checking.
         await s_INVOKE_ASYNC_EVENTS('onPluginUnload', {}, {}, pluginName, this._pluginMap, this._options, false);

         // Automatically remove any potential reference to a stored event proxy instance.
         try
         {
            entry.instance._eventbus = void 0;
         }
         catch (err) { /* nop */ }

         if (entry.eventbusProxy instanceof EventbusProxy) { entry.eventbusProxy.destroy(); }

         this._pluginMap.delete(pluginName);

         // Invoke `typhonjs:plugin:manager:plugin:removed` allowing external code to react to plugin removed.
         if (this._eventbus)
         {
            await this._eventbus.triggerAsync(`typhonjs:plugin:manager:plugin:removed`,
             JSON.parse(JSON.stringify(entry.data)));
         }

         return true;
      }

      return false;
   }

   /**
    * Removes all plugins after unloading them and clearing any event bindings automatically.
    *
    * @returns {Promise.<Array<{plugin: string, result: boolean}>>} A list of plugin names and removal success state.
    */
   async removeAll()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      const values = [];

      for (const pluginName of this._pluginMap.keys())
      {
         const result = await this.remove(pluginName);
         values.push({ plugin: pluginName, result });
      }

      this._pluginMap.clear();

      return values;
   }

   /**
    * Provides the eventbus callback which may prevent removal if optional `noEventRemoval` is enabled. This disables
    * the ability for plugins to be removed via events preventing any external code removing plugins in this manner.
    *
    * @param {string}   pluginName The plugin name to remove.
    *
    * @returns {Promise<boolean>} Operation success.
    * @private
    */
   async _removeEventbus(pluginName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return !this._options.noEventRemoval ? this.remove(pluginName) : false;
   }

   /**
    * Provides the eventbus callback which may prevent removal if optional `noEventRemoval` is enabled. This disables
    * the ability for plugins to be removed via events preventing any external code removing plugins in this manner.
    *
    * @returns {Promise.<Array<{plugin: string, result: boolean}>>} A list of plugin names and removal success state.
    * @private
    */
   async _removeAllEventbus()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!this._options.noEventRemoval) { return this.removeAll(); }
   }

   /**
    * Sets the eventbus associated with this plugin manager. If any previous eventbus was associated all plugin manager
    * events will be removed then added to the new eventbus. If there are any existing plugins being managed their
    * events will be removed from the old eventbus and then `onPluginLoad` will be called with the new eventbus.
    *
    * @param {object}     options An options object.
    *
    * @param {Eventbus}   options.eventbus The new eventbus to associate.
    *
    * @param {string}     [options.eventPrepend='plugins'] An optional string to prepend to all of the event
    *                                                      binding targets.
    *
    * @returns {Promise<AbstractPluginManager>} This plugin manager.
    */
   async setEventbus({ eventbus, eventPrepend = 'plugins' } = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!(eventbus instanceof Eventbus)) { throw new TypeError(`'eventbus' is not an Eventbus.`); }
      if (typeof eventPrepend !== 'string') { throw new TypeError(`'eventPrepend' is not a string.`); }

      // Early escape if the eventbus is the same as the current eventbus.
      if (eventbus === this._eventbus) { return this; }

      const oldPrepend = this._eventPrepend;

      /**
       * Stores the prepend string for eventbus registration.
       *
       * @type {string}
       * @private
       */
      this._eventPrepend = eventPrepend;

      // Unload and reload any existing plugins from the old eventbus to the target eventbus.
      if (this._pluginMap.size > 0)
      {
         // Invoke private module method which allows skipping optional error checking.
         await s_INVOKE_ASYNC_EVENTS('onPluginUnload', {}, {}, this._pluginMap.keys(), this._pluginMap, this._options,
          false);

         for (const entry of this._pluginMap.values())
         {
            // Automatically remove any potential reference to a stored event proxy instance.
            try
            {
               entry.instance._eventbus = void 0;
            }
            catch (err) { /* nop */ }

            entry.data.manager.eventPrepend = eventPrepend;
            entry.data.plugin.scopedName = `${eventPrepend}:${entry.name}`;

            if (entry.eventbusProxy instanceof EventbusProxy) { entry.eventbusProxy.destroy(); }

            entry.eventbusProxy = new EventbusProxy(eventbus);
         }

         // Invoke private module method which allows skipping optional error checking.
         await s_INVOKE_ASYNC_EVENTS('onPluginLoad', {}, {}, this._pluginMap.keys(), this._pluginMap, this._options,
          false);

         for (const entry of this._pluginMap.values())
         {
            // Invoke `typhonjs:plugin:manager:eventbus:changed` allowing external code to react to plugin
            // changing eventbus.
            if (this._eventbus)
            {
               this._eventbus.trigger(`typhonjs:plugin:manager:eventbus:changed`, Object.assign({
                  oldEventbus: this._eventbus,
                  oldManagerEventPrepend: oldPrepend,
                  oldScopedName: `${oldPrepend}:${entry.name}`,
                  newEventbus: eventbus,
                  newManagerEventPrepend: eventPrepend,
                  newScopedName: `${eventPrepend}:${entry.name}`
               }, JSON.parse(JSON.stringify(entry.data))));
            }
         }
      }

      if (this._eventbus !== null)
      {
         this._eventbus.off(`${oldPrepend}:async:add`, this._addEventbus, this);
         this._eventbus.off(`${oldPrepend}:async:add:all`, this._addAllEventbus, this);
         this._eventbus.off(`${oldPrepend}:async:destroy:manager`, this._destroyEventbus, this);
         this._eventbus.off(`${oldPrepend}:async:invoke`, this.invokeAsync, this);
         this._eventbus.off(`${oldPrepend}:async:invoke:event`, this.invokeAsyncEvent, this);
         this._eventbus.off(`${oldPrepend}:async:remove`, this._removeEventbus, this);
         this._eventbus.off(`${oldPrepend}:async:remove:all`, this._removeAllEventbus, this);
         this._eventbus.off(`${oldPrepend}:create:eventbus:proxy`, this.createEventbusProxy, this);
         this._eventbus.off(`${oldPrepend}:get:enabled`, this.getPluginsEnabled, this);
         this._eventbus.off(`${oldPrepend}:get:options`, this.getOptions, this);
         this._eventbus.off(`${oldPrepend}:has:plugin`, this.hasPlugin, this);
         this._eventbus.off(`${oldPrepend}:invoke`, this.invoke, this);
         this._eventbus.off(`${oldPrepend}:is:valid:config`, this.isValidConfig, this);
         this._eventbus.off(`${oldPrepend}:set:enabled`, this.setPluginsEnabled, this);
         this._eventbus.off(`${oldPrepend}:set:options`, this._setOptionsEventbus, this);
         this._eventbus.off(`${oldPrepend}:sync:invoke`, this.invokeSync, this);
         this._eventbus.off(`${oldPrepend}:sync:invoke:event`, this.invokeSyncEvent, this);

         // Invoke `typhonjs:plugin:manager:eventbus:removed` allowing external code to react to eventbus removal.
         this._eventbus.trigger(`typhonjs:plugin:manager:eventbus:removed`,
         {
            oldEventbus: this._eventbus,
            oldEventPrepend: oldPrepend,
            newEventbus: eventbus,
            newEventPrepend: eventPrepend
         });
      }

      eventbus.on(`${eventPrepend}:async:add`, this._addEventbus, this);
      eventbus.on(`${eventPrepend}:async:add:all`, this._addAllEventbus, this);
      eventbus.on(`${eventPrepend}:async:destroy:manager`, this._destroyEventbus, this);
      eventbus.on(`${eventPrepend}:async:invoke`, this.invokeAsync, this);
      eventbus.on(`${eventPrepend}:async:invoke:event`, this.invokeAsyncEvent, this);
      eventbus.on(`${eventPrepend}:async:remove`, this._removeEventbus, this);
      eventbus.on(`${eventPrepend}:async:remove:all`, this._removeAllEventbus, this);
      eventbus.on(`${eventPrepend}:create:eventbus:proxy`, this.createEventbusProxy, this);
      eventbus.on(`${eventPrepend}:get:enabled`, this.getPluginsEnabled, this);
      eventbus.on(`${eventPrepend}:get:options`, this.getOptions, this);
      eventbus.on(`${eventPrepend}:has:plugin`, this.hasPlugin, this);
      eventbus.on(`${eventPrepend}:invoke`, this.invoke, this);
      eventbus.on(`${eventPrepend}:is:valid:config`, this.isValidConfig, this);
      eventbus.on(`${eventPrepend}:set:enabled`, this.setPluginsEnabled, this);
      eventbus.on(`${eventPrepend}:set:options`, this._setOptionsEventbus, this);
      eventbus.on(`${eventPrepend}:sync:invoke`, this.invokeSync, this);
      eventbus.on(`${eventPrepend}:sync:invoke:event`, this.invokeSyncEvent, this);

      // TODO REMOVE
      // // Invoke `typhonjs:plugin:manager:eventbus:set` allowing external code to react to eventbus set.
      // eventbus.trigger('typhonjs:plugin:manager:eventbus:set',
      // {
      //    oldEventbus: this._eventbus,
      //    oldEventPrepend: oldPrepend,
      //    newEventbus: eventbus,
      //    newEventPrepend: eventPrepend
      // });

      for (const pluginSupport of this._pluginSupport)
      {
         pluginSupport.setEventbus({
            oldEventbus: this._eventbus,
            newEventbus: eventbus,
            oldPrepend,
            newPrepend: eventPrepend
         });
      }

      this._eventbus = eventbus;

      return this;
   }

   /**
    * Set optional parameters. All parameters are off by default.
    *
    * @param {PluginManagerOptions} options Defines optional parameters to set.
    */
   setOptions(options = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof options !== 'object') { throw new TypeError(`'options' is not an object.`); }

      if (typeof options.pluginsEnabled === 'boolean') { this._options.pluginsEnabled = options.pluginsEnabled; }
      if (typeof options.noEventAdd === 'boolean') { this._options.noEventAdd = options.noEventAdd; }
      if (typeof options.noEventDestroy === 'boolean') { this._options.noEventDestroy = options.noEventDestroy; }
      if (typeof options.noEventOptions === 'boolean') { this._options.noEventOptions = options.noEventOptions; }
      if (typeof options.noEventRemoval === 'boolean') { this._options.noEventRemoval = options.noEventRemoval; }
      if (typeof options.throwNoMethod === 'boolean') { this._options.throwNoMethod = options.throwNoMethod; }
      if (typeof options.throwNoPlugin === 'boolean') { this._options.throwNoPlugin = options.throwNoPlugin; }
   }

   /**
    * Provides the eventbus callback which may prevent plugin manager options being set if optional `noEventOptions` is
    * enabled. This disables the ability for the plugin manager options to be set via events preventing any external
    * code modifying options.
    *
    * @param {PluginManagerOptions} options - Defines optional parameters to set.
    *
    * @private
    */
   _setOptionsEventbus(options = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!this._options.noEventOptions) { this.setOptions(options); }
   }

   /**
    * Sets the enabled state of a plugin, a list of plugins, or all plugins.
    *
    * @param {object}            options Options object.
    *
    * @param {boolean}           options.enabled The enabled state.
    *
    * @param {string|Iterable<string>} [options.pluginNames] Plugin name or iterable list of names to set state.
    */
   setPluginsEnabled({ enabled, pluginNames = [] } = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginNames !== 'string' && !isIterable(pluginNames))
      {
         throw new TypeError(`'pluginNames' is not a string or iterable.`);
      }

      if (typeof enabled !== 'boolean') { throw new TypeError(`'enabled' is not a boolean.`); }

      const setEntryEnabled = (entry) =>
      {
         if (entry instanceof PluginEntry)
         {
            entry.enabled = enabled;

            // Invoke `typhonjs:plugin:manager:plugin:enabled` allowing external code to react to plugin enabled state.
            if (this._eventbus)
            {
               this._eventbus.trigger(`typhonjs:plugin:manager:plugin:enabled`, Object.assign({
                  enabled
               }, JSON.parse(JSON.stringify(entry.data))));
            }
         }
      };

      // Set enabled state for a single plugin if found.
      if (typeof pluginNames === 'string')
      {
         setEntryEnabled(this._pluginMap.get(pluginNames));
      }

      let count = 0;

      // First attempt to iterate through pluginNames.
      for (const pluginName of pluginNames)
      {
         setEntryEnabled(this._pluginMap.get(pluginName));
         count++;
      }

      // If pluginNames is empty then set all plugins enabled state.
      if (count === 0)
      {
         for (const pluginEntry of this._pluginMap.values())
         {
            setEntryEnabled(pluginEntry);
         }
      }
   }
}

// Module Private ----------------------------------------------------------------------------------------------------

/**
 * Private implementation to invoke asynchronous events. This allows internal calls in PluginManager for
 * `onPluginLoad` and `onPluginUnload` callbacks to bypass optional error checking.
 *
 * This dispatch method asynchronously passes to and returns from any invoked targets a PluginEvent. Any invoked plugin
 * may return a Promise which is awaited upon by `Promise.all` before returning the PluginEvent data via a Promise.
 *
 * @param {string}                     methodName Method name to invoke.
 *
 * @param {object}                     copyProps Properties to copy
 *
 * @param {object}                     passthruProps Properties to pass through
 *
 * @param {string|Iterable<string>}    pluginNames Plugin name or iterable list of plugin names to invoke.
 *
 * @param {Map<string, PluginEvent>}   pluginMap Stores the plugins by name with an associated PluginEntry.
 *
 * @param {object}                     options Defines options for throwing exceptions. Turned off by default.
 *
 * @param {boolean}                    [performErrorCheck=true] If false optional error checking is disabled.
 *
 * @returns {Promise<PluginEvent>} A PluginEvent representing the invocation results.
 */
const s_INVOKE_ASYNC_EVENTS = async (methodName, copyProps = {}, passthruProps = {}, pluginNames, pluginMap, options,
 performErrorCheck = true) =>
{
   if (typeof methodName !== 'string') { throw new TypeError(`'methodName' is not a string.`); }
   if (typeof passthruProps !== 'object') { throw new TypeError(`'passthruProps' is not an object.`); }
   if (typeof copyProps !== 'object') { throw new TypeError(`'copyProps' is not an object.`); }

   if (typeof pluginNames !== 'string' && !isIterable(pluginNames))
   {
      throw new TypeError(`'pluginNames' is not a string, array, or iterator.`);
   }

   // Track how many plugins were invoked.
   let pluginInvokeCount = 0;
   const pluginInvokeNames = [];

   // Track if a plugin method is invoked
   let hasMethod = false;
   let hasPlugin = false;

   // Create plugin event.
   const ev = new PluginEvent(copyProps, passthruProps);

   const results = [];

   if (typeof pluginNames === 'string')
   {
      const entry = pluginMap.get(pluginNames);

      if (entry instanceof PluginEntry && entry.enabled && entry.instance)
      {
         hasPlugin = true;

         if (typeof entry.instance[methodName] === 'function')
         {
            ev.eventbus = entry.eventbusProxy;
            ev.pluginName = entry.name;
            ev.pluginOptions = entry.data.plugin.options;

            const result = entry.instance[methodName](ev);

            if (typeof result !== 'undefined' && result !== null) { results.push(result); }

            hasMethod = true;
            pluginInvokeCount++;
            pluginInvokeNames.push(entry.name);
         }
      }
   }
   else
   {
      for (const name of pluginNames)
      {
         const entry = pluginMap.get(name);

         if (entry instanceof PluginEntry && entry.enabled && entry.instance)
         {
            hasPlugin = true;

            if (typeof entry.instance[methodName] === 'function')
            {
               ev.eventbus = entry.eventbusProxy;
               ev.pluginName = entry.name;
               ev.pluginOptions = entry.data.plugin.options;

               const result = entry.instance[methodName](ev);

               if (typeof result !== 'undefined' && result !== null) { results.push(result); }

               hasMethod = true;
               pluginInvokeCount++;
               pluginInvokeNames.push(entry.name);
            }
         }
      }
   }

   if (performErrorCheck && options.throwNoPlugin && !hasPlugin)
   {
      throw new Error(`PluginManager failed to find any target plugins.`);
   }

   if (performErrorCheck && options.throwNoMethod && !hasMethod)
   {
      throw new Error(`PluginManager failed to invoke '${methodName}'.`);
   }

   // Add meta data for plugin invoke count.
   ev.data.$$plugin_invoke_count = pluginInvokeCount;
   ev.data.$$plugin_invoke_names = pluginInvokeNames;

   await Promise.all(results);

   return ev.data;
};

/**
 * Private implementation to invoke synchronous events. This allows internal calls in PluginManager for
 * `onPluginLoad` and `onPluginUnload` callbacks to bypass optional error checking.
 *
 * This dispatch method synchronously passes to and returns from any invoked targets a PluginEvent.
 *
 * @param {string}                     methodName Method name to invoke.
 *
 * @param {object}                     copyProps Properties copied.
 *
 * @param {object}                     passthruProps Properties possed through.
 *
 * @param {string|Iterable<string>}    pluginNames An optional plugin name or iterable list of plugin names to invoke.
 *
 * @param {Map<string, PluginEvent>}   pluginMap - Stores the plugins by name with an associated PluginEntry.
 *
 * @param {object}                     options - Defines options for throwing exceptions. Turned off by default.
 *
 * @param {boolean}                    [performErrorCheck=true] - If false optional error checking is disabled.
 *
 * @returns {PluginEvent} A PluginEvent representing the invocation results.
 */
const s_INVOKE_SYNC_EVENTS = (methodName, copyProps = {}, passthruProps = {}, pluginNames, pluginMap, options,
 performErrorCheck = true) =>
{
   if (typeof methodName !== 'string') { throw new TypeError(`'methodName' is not a string.`); }
   if (typeof passthruProps !== 'object') { throw new TypeError(`'passthruProps' is not an object.`); }
   if (typeof copyProps !== 'object') { throw new TypeError(`'copyProps' is not an object.`); }

   if (typeof pluginNames !== 'string' && !isIterable(pluginNames))
   {
      throw new TypeError(`'pluginNames' is not a string or iterable.`);
   }

   // Track how many plugins were invoked.
   let pluginInvokeCount = 0;
   const pluginInvokeNames = [];

   // Track if a plugin method is invoked
   let hasMethod = false;
   let hasPlugin = false;

   // Create plugin event.
   const ev = new PluginEvent(copyProps, passthruProps);

   if (typeof pluginNames === 'string')
   {
      const entry = pluginMap.get(pluginNames);

      if (entry instanceof PluginEntry && entry.enabled && entry.instance)
      {
         hasPlugin = true;

         if (typeof entry.instance[methodName] === 'function')
         {
            ev.eventbus = entry.eventbusProxy;
            ev.pluginName = entry.name;
            ev.pluginOptions = entry.data.plugin.options;

            entry.instance[methodName](ev);

            hasMethod = true;
            pluginInvokeCount++;
            pluginInvokeNames.push(entry.name);
         }
      }
   }
   else
   {
      for (const name of pluginNames)
      {
         const entry = pluginMap.get(name);

         if (entry instanceof PluginEntry && entry.enabled && entry.instance)
         {
            hasPlugin = true;

            if (typeof entry.instance[methodName] === 'function')
            {
               ev.eventbus = entry.eventbusProxy;
               ev.pluginName = entry.name;
               ev.pluginOptions = entry.data.plugin.options;

               entry.instance[methodName](ev);

               hasMethod = true;
               pluginInvokeCount++;
               pluginInvokeNames.push(entry.name);
            }
         }
      }
   }

   if (performErrorCheck && options.throwNoPlugin && !hasPlugin)
   {
      throw new Error(`PluginManager failed to find any target plugins.`);
   }

   if (performErrorCheck && options.throwNoMethod && !hasMethod)
   {
      throw new Error(`PluginManager failed to invoke '${methodName}'.`);
   }

   // Add meta data for plugin invoke count.
   ev.data.$$plugin_invoke_count = pluginInvokeCount;
   ev.data.$$plugin_invoke_names = pluginInvokeNames;

   return ev.data;
};

/**
 * @typedef {object} PluginConfig
 *
 * @property {string}      name Defines the name of the plugin; if no `target` entry is present the name
 *                              doubles as the target (please see target).
 *
 * @property {string|URL}  [target] Defines the target Node module to load or defines a local file (full
 *                                  path or relative to current working directory to load. Target may also be a file
 *                                  URL / string or in the browser a web URL.
 *
 * @property {string}      [instance] Defines an existing object instance to use as the plugin.
 *
 * @property {object}      [options] Defines an object of options for the plugin.
 */


/**
 * @typedef {object} PluginData
 *
 * @property {object}   manager Data about the plugin manager
 *
 * @property {string}   manager.eventPrepend The plugin manager event prepend string.
 *
 * @property {object}   module Optional object hash to associate with plugin.
 *
 * @property {object}   plugin Data about the plugin.
 *
 * @property {string}   plugin.name The name of the plugin.
 *
 * @property {string}   plugin.scopedName The name of the plugin with the plugin managers event prepend string.
 *
 * @property {string}   plugin.target Defines the target NPM module to loaded or defines a local file (full
 *                                    path or relative to current working directory to load.
 *
 * @property {string}   plugin.targetEscaped Provides the target, but properly escaped for RegExp usage.
 *
 * @property {string}   plugin.type The type of plugin: `instance`
 *                                  In Node: `import-module`, `import-path`, `import-url`, `require-module`, or
 *                                  `require-path`, `require-url`.
 *                                  In Browser: `import-path`, `import-url`.
 *
 * @property {object}   plugin.options Defines an object of options for the plugin.
 */

/**
 * @typedef {object} PluginManagerOptions
 *
 * @property {boolean}   [pluginsEnabled] If false all plugins are disabled.
 *
 * @property {boolean}   [noEventAdd] If true this prevents plugins from being added by `plugins:add` and
 *                                    `plugins:add:all` events forcing direct method invocation for addition.
 *
 * @property {boolean}   [noEventDestroy] If true this prevents the plugin manager from being destroyed by
 *                                        `plugins:destroy:manager` forcing direct method invocation for destruction.
 *
 * @property {boolean}   [noEventOptions] If true this prevents setting options for the plugin manager by
 *                                        `plugins:destroy:manager` forcing direct method invocation for destruction.
 *
 * @property {boolean}   [noEventRemoval] If true this prevents plugins from being removed by `plugins:remove` and
 *                                        `plugins:remove:all` events forcing direct method invocation for removal.
 *
 * @property {boolean}   [throwNoMethod] If true then when a method fails to be invoked by any plugin an exception
 *                                       will be thrown.
 *
 * @property {boolean}   [throwNoPlugin] If true then when no plugin is matched to be invoked an exception will be
 *                                       thrown.
 */

// TODO THIS NEEDS REFINEMENT
/**
 * Interface for PluginSupport implementation classes.
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
 * @name PluginSupportImpl#setEventbus
 */
