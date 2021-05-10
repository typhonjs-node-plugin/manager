import Eventbus            from '@typhonjs-plugin/eventbus';
import { EventbusProxy }   from '@typhonjs-plugin/eventbus';
import ModuleLoader        from '@typhonjs-utils/loader-module';

import PluginEntry         from './PluginEntry.js';

import invokeAsyncEvent    from './support/invoke/invokeAsyncEvent.js';

import escapeTarget        from './utils/escapeTarget.js';
import isValidConfig       from './utils/isValidConfig.js';
import resolveModule       from './utils/resolveModule.js';

import { deepFreeze, isIterable, isObject }  from '@typhonjs-utils/object';

/**
 * Provides a lightweight plugin manager for Node / NPM & the browser with eventbus integration for plugins in a safe
 * and protected manner across NPM modules, local files, and preloaded object instances. This pattern facilitates
 * message passing between modules versus direct dependencies / method invocation.
 *
 * A default eventbus will be created, but you may also pass in an eventbus from `@typhonjs-plugin/eventbus` and the
 * plugin manager will register by default under these event categories:
 *
 * `plugins:async:add` - {@link PluginManager#add}
 *
 * `plugins:async:add:all` - {@link PluginManager#addAll}
 *
 * `plugins:async:destroy:manager` - {@link PluginManager#destroy}
 *
 * `plugins:async:remove` - {@link PluginManager#remove}
 *
 * `plugins:async:remove:all` - {@link PluginManager#removeAll}
 *
 * `plugins:get:enabled` - {@link PluginManager#getEnabled}
 *
 * `plugins:get:options` - {@link PluginManager#getOptions}
 *
 * `plugins:get:plugin:by:event` - {@link PluginManager#getPluginByEvent}
 *
 * `plugins:get:plugin:data` - {@link PluginManager#getPluginData}
 *
 * `plugins:get:plugin:events` - {@link PluginManager#getPluginEvents}
 *
 * `plugins:get:plugin:names` - {@link PluginManager#getPluginNames}
 *
 * `plugins:has:plugin` - {@link PluginManager#hasPlugins}
 *
 * `plugins:is:valid:config` - {@link PluginManager#isValidConfig}
 *
 * `plugins:set:enabled` - {@link PluginManager#setEnabled}
 *
 * `plugins:set:options` - {@link PluginManager#setOptions}
 *
 * Automatically when a plugin is loaded and unloaded respective functions `onPluginLoad` and `onPluginUnload` will
 * be attempted to be invoked on the plugin. This is an opportunity for the plugin to receive any associated eventbus
 * and wire itself into it. It should be noted that a protected proxy around the eventbus is passed to the plugins
 * such that when the plugin is removed automatically all events registered on the eventbus are cleaned up without
 * a plugin author needing to do this manually in the `onPluginUnload` callback. This solves any dangling event binding
 * issues.
 *
 * By supporting ES Modules / CommonJS in Node and ES Modules in the browser the plugin manager is by nature
 * asynchronous for the core methods of adding / removing plugins and destroying the manager. The lifecycle methods
 * `onPluginLoad` and `onPluginUnload` will be awaited on such that if a plugin returns a Promise or is an async method
 * then it will complete before execution continues.
 *
 * It is recommended to interact with the plugin manager eventbus through an eventbus proxy. The
 * `createEventbusProxy` method will return a proxy to the default or currently set eventbus.
 *
 * It should be noted that this module reexports `@typhonjs-plugin/eventbus` which are available as named exports on
 * this module:
 * import {
 *   Eventbus,
 *   EventbusProxy,
 *   EventbusSecure,
 *   eventbus,
 *   pluginEventbus,
 *   testEventbus
 * } from '@typhonjs-plugin/manager';
 *
 * This reexport is for convenience as it provides one single distribution for Node & browser usage.
 *
 * If external eventbus functionality is enabled by passing in an eventbus in the constructor of PluginManager it is
 * important especially if using an existing process / global level eventbus instance from either this module or
 * `@typhonjs-plugin/eventbus` to call {@link PluginManager#destroy} to clean up all plugin eventbus resources and the
 * plugin manager event bindings; this is primarily a testing concern when running repeated tests over a reused
 * eventbus.
 *
 * For more information on Eventbus functionality please see:
 * @see https://www.npmjs.com/package/@typhonjs-plugin/eventbus
 *
 * The PluginManager instance can be extended through runtime composition by passing in _classes_ that implement
 * {@link PluginSupportImpl}. One such implementation is available {@link PluginInvokeSupport} which enables directly
 * invoking methods of all or specific plugins. Please see the documentation for PluginInvokeSupport for more details.
 *
 * Several abbreviated examples follow. Please see the wiki for more details:
 * TODO: add wiki link
 *
 * @example
 * import PluginManager from '@typhonjs-plugin/manager';
 *
 * const pluginManager = new PluginManager();
 *
 * await pluginManager.add({ name: 'an-npm-plugin-enabled-module' });
 * await pluginManager.add({ name: 'my-local-module', target: './myModule.js' });
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
 */
export default class PluginManager
{
   /**
    * Stores the associated eventbus.
    *
    * @type {Eventbus}
    * @private
    */
   #eventbus = null;

   /**
    * Stores any EventbusProxy instances created, so that they may be automatically destroyed.
    *
    * @type {EventbusProxy[]}
    * @private
    */
   #eventbusProxies = [];

   /**
    * Stores any EventbusSecure instances created, so that they may be automatically destroyed.
    *
    * @type {EventbusSecureObj[]}
    * @private
    */
   #eventbusSecure = [];

   /**
    * Defines various options for the plugin manager. By default plugins are enabled, no event invoke, and no
    * event set options are enabled; the latter two preventing invoke dispatch methods functioning on the eventbus
    * along with not being able to set the plugin manager options by the eventbus. These must be explicitly turned
    * off.
    *
    * @type {PluginManagerOptions}
    * @private
    */
   #options =
   {
      noEventAdd: false,
      noEventDestroy: true,
      noEventRemoval: false,
      noEventSetEnabled: true,
      noEventSetOptions: true,
      throwNoMethod: false,
      throwNoPlugin: false
   };

   /**
    * Stores the plugins by name with an associated PluginEntry.
    *
    * @type {Map<string, PluginEntry>}
    * @private
    */
   #pluginMap = new Map();

   /**
    * Provides an array of PluginSupportImpl interfaces to extend the plugin manager through the eventbus API.
    *
    * @type {PluginSupportImpl[]}
    * @private
    */
   #pluginSupport = [];

   /**
    * Instantiates PluginManager
    *
    * @param {object}   [options] - Provides various configuration options:
    *
    * @param {Eventbus} [options.eventbus] - An instance of '@typhonjs-plugin/eventbus' used as the plugin
    *                                        eventbus. If not provided a default eventbus is created.
    *
    * @param {string}   [options.eventPrepend='plugin'] - A customized name to prepend PluginManager events on the
    *                                                     eventbus.
    *
    * @param {PluginManagerOptions}  [options.manager] - The plugin manager options.
    *
    * @param {PluginSupportImpl|Iterable<PluginSupportImpl>} [options.PluginSupport] - Optional classes to
    *                                        pass in which extends the plugin manager. A default implementation is
    *                                        available: {@link PluginInvokeSupport}
    */
   constructor(options = {})
   {
      if (!isObject(options)) { throw new TypeError(`'options' is not an object.`); }

      if (options.eventbus !== void 0 && !isObject(options.eventbus))
      {
         throw new TypeError(`'options.eventbus' is not an Eventbus.`);
      }

      if (options.eventPrepend !== void 0 && typeof options.eventPrepend !== 'string')
      {
         throw new TypeError(`'options.eventPrepend' is not a string.`);
      }

      if (options.manager !== void 0 && !isObject(options.manager))
      {
         throw new TypeError(`'options.manager' is not an object.`);
      }

      if (options.PluginSupport !== void 0 && typeof options.PluginSupport !== 'function' &&
       !isIterable(options.PluginSupport))
      {
         throw new TypeError(
          `'options.PluginSupport' must be a constructor function or iterable of such matching PluginSupportImpl.`);
      }

      // Instantiate any PluginSupport classes
      if (isIterable(options.PluginSupport))
      {
         for (const PluginSupport of options.PluginSupport)
         {
            this.#pluginSupport.push(new PluginSupport(this));
         }
      }
      else if (options.PluginSupport !== void 0)
      {
         this.#pluginSupport.push(new options.PluginSupport(this));
      }

      this.setOptions(options.manager || {});

      this.setEventbus({
         eventbus: options.eventbus !== void 0 ? options.eventbus : new Eventbus(),
         eventPrepend: options.eventPrepend
      });
   }

   /**
    * Adds a plugin by the given configuration parameters. A plugin `name` is always required. If no other options
    * are provided then the `name` doubles as the NPM module / local file to load. The loading first checks for an
    * existing `instance` to use as the plugin. Then the `target` is chosen as the NPM module / local file to load.
    * By passing in `options` this will be stored and accessible to the plugin during all callbacks.
    *
    * @param {PluginConfig}   pluginConfig - Defines the plugin to load.
    *
    * @param {object}         [moduleData] - Optional object hash to associate with plugin.
    *
    * @returns {Promise<PluginData>} The PluginData that represents the plugin added.
    */
   async add(pluginConfig, moduleData)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginConfig !== 'object') { throw new TypeError(`'pluginConfig' is not an object.`); }

      if (typeof pluginConfig.name !== 'string')
      {
         throw new TypeError(
          `'pluginConfig.name' is not a string for entry:\n${JSON.stringify(pluginConfig, null, 3)}`);
      }

      if (pluginConfig.target !== void 0 && typeof pluginConfig.target !== 'string' &&
       !(pluginConfig.target instanceof URL))
      {
         throw new TypeError(
          `'pluginConfig.target' is not a string or URL for entry:\n${JSON.stringify(pluginConfig, null, 3)}`);
      }

      if (pluginConfig.options !== void 0 && typeof pluginConfig.options !== 'object')
      {
         throw new TypeError(
          `'pluginConfig.options' is not an object for entry:\n${JSON.stringify(pluginConfig, null, 3)}`);
      }

      if (moduleData !== void 0 && typeof moduleData !== 'object')
      {
         throw new TypeError(`'moduleData' is not an object for entry:\n${JSON.stringify(pluginConfig, null, 3)}`);
      }

      // If a plugin with the same name already exists post a warning and exit early.
      if (this.#pluginMap.has(pluginConfig.name))
      {
         throw new Error(`A plugin already exists with name: ${pluginConfig.name} for entry:\n${
          JSON.stringify(pluginConfig, null, 3)}`);
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

         try
         {
            const result = await ModuleLoader.load({ modulepath: target, resolveModule })

            // Please note that a plugin or other logger must be setup on the associated eventbus.
            if (this.#eventbus !== null)
            {
               this.#eventbus.trigger('log:debug',
                `@typhonjs-plugin/manager - ${result.isESM ? 'import' : 'require'}: ${result.loadpath}`);
            }

            instance = result.instance;
            type = result.type;
         }
         catch (err)
         {
            throw new Error(`@typhonjs-plugin/manager - Could not load target: ${target}\n\nPluginConfig:\n`
             + `${JSON.stringify(pluginConfig, null, 3)}\n\n${err}`);
         }
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
            eventPrepend: this._eventPrepend,
            scopedName: `${this._eventPrepend}:${pluginConfig.name}`
         },

         module: moduleData || {},

         plugin:
         {
            name: pluginConfig.name,
            target,
            targetEscaped: escapeTarget(target),
            type,
            options: pluginConfig.options || {}
         }
      }));

      deepFreeze(pluginData, ['manager']);

      const eventbusProxy = this.#eventbus !== null && this.#eventbus !== void 0 ?
       new EventbusProxy(this.#eventbus) /* c8 ignore next */ : void 0;

      const entry = new PluginEntry(pluginConfig.name, pluginData, instance, eventbusProxy);

      this.#pluginMap.set(pluginConfig.name, entry);

      // Invokes the private internal async events method which allows skipping of error checking.
      const invokeData = await invokeAsyncEvent({
         method: 'onPluginLoad',
         manager: this,
         plugins: pluginConfig.name,
         errorCheck: false
      });

      if (typeof invokeData.importmeta === 'object')
      {
         entry.importmeta = invokeData.importmeta;

         // Until we get a Snowpack HMR spec environment for testing ignore this block.
         /* c8 ignore next 7 */
         if (typeof invokeData.importmeta.hot === 'object' && typeof invokeData.importmeta.hot.accept === 'function')
         {
            invokeData.importmeta.hot.accept(({ module }) =>
            {
               this.reload({ plugin: pluginConfig.name, instance: resolveModule(module) });
            });
         }
      }

      // Invoke `typhonjs:plugin:manager:plugin:added` allowing external code to react to plugin addition.
      if (this.#eventbus)
      {
         await this.#eventbus.triggerAsync(`typhonjs:plugin:manager:plugin:added`, pluginData);
      }

      return pluginData;
   }

   /**
    * Initializes multiple plugins in a single call.
    *
    * @param {Iterable<PluginConfig>}   pluginConfigs - An iterable list of plugin config object hash entries.
    *
    * @param {object}                   [moduleData] - Optional object hash to associate with all plugins.
    *
    * @returns {Promise<PluginData[]>} An array of PluginData objects of all added plugins.
    */
   async addAll(pluginConfigs, moduleData)
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
    * @param {PluginConfig}   pluginConfig - Defines the plugin to load.
    *
    * @param {object}         [moduleData] - Optional object hash to associate with all plugins.
    *
    * @returns {Promise<PluginData>} The PluginData that represents the plugin added.
    * @private
    */
   async _addEventbus(pluginConfig, moduleData)
   {
      /* c8 ignore next */
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return !this.#options.noEventAdd ? this.add(pluginConfig, moduleData) : void 0;
   }

   /**
    * Provides the eventbus callback which may prevent addition if optional `noEventAdd` is enabled. This disables
    * the ability for plugins to be added via events preventing any external code adding plugins in this manner.
    *
    * @param {Iterable<PluginConfig>}  pluginConfigs - An iterable list of plugin config object hash entries.
    *
    * @param {object}                  [moduleData] - Optional object hash to associate with all plugins.
    *
    * @returns {Promise<PluginData[]>} An array of PluginData objects of all added plugins.
    * @private
    */
   async _addAllEventbus(pluginConfigs, moduleData)
   {
      /* c8 ignore next */
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return !this.#options.noEventAdd ? this.addAll(pluginConfigs, moduleData) : [];
   }

   /**
    * If an eventbus is assigned to this plugin manager then a new EventbusProxy wrapping this eventbus is returned.
    * It is added to `this.#eventbusProxies` so †hat the instances are destroyed when the plugin manager is destroyed.
    *
    * @returns {EventbusProxy} A proxy for the currently set Eventbus.
    */
   createEventbusProxy()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      /* c8 ignore next */
      if (this.#eventbus === null) { throw new ReferenceError('No eventbus assigned to plugin manager.'); }

      const eventbusProxy = new EventbusProxy(this.#eventbus);

      // Store proxy to make sure it is destroyed when the plugin manager is destroyed.
      this.#eventbusProxies.push(eventbusProxy);

      return eventbusProxy;
   }

   /**
    * If an eventbus is assigned to this plugin manager then a new EventbusSecure wrapping this eventbus is returned.
    * It is added to `this.#eventbusSecure` so †hat the instances are destroyed when the plugin manager is destroyed.
    *
    * @param {string}   [name] - Optional name for the EventbusSecure instance.
    *
    * @returns {EventbusSecure} A secure wrapper for the currently set Eventbus.
    */
   createEventbusSecure(name = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      /* c8 ignore next */
      if (this.#eventbus === null) { throw new ReferenceError('No eventbus assigned to plugin manager.'); }

      const eventbusSecureObj = this.#eventbus.createSecure(name);

      // Store EventbusSecure object to make sure it is destroyed when the plugin manager is destroyed.
      this.#eventbusSecure.push(eventbusSecureObj);

      return eventbusSecureObj.eventbusSecure;
   }

   /**
    * Destroys all managed plugins after unloading them.
    *
    * @returns {Promise<DataOutPluginRemoved[]>} A list of plugin names and removal success state.
    */
   async destroy()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      // Destroy any EventbusSecure instances created.
      for (const eventbusSecureObj of this.#eventbusSecure)
      {
         eventbusSecureObj.destroy();
      }

      this.#eventbusSecure = [];

      // Destroy any EventbusProxy instances created.
      for (const eventbusProxy of this.#eventbusProxies)
      {
         eventbusProxy.destroy();
      }

      this.#eventbusProxies = [];

      // Remove all plugins; this will invoke onPluginUnload.
      const results = await this.removeAll();

      if (this.#eventbus !== null && this.#eventbus !== void 0)
      {
         this.#eventbus.off(`${this._eventPrepend}:async:add`, this._addEventbus, this);
         this.#eventbus.off(`${this._eventPrepend}:async:add:all`, this._addAllEventbus, this);
         this.#eventbus.off(`${this._eventPrepend}:async:destroy:manager`, this._destroyEventbus, this);
         this.#eventbus.off(`${this._eventPrepend}:async:remove`, this._removeEventbus, this);
         this.#eventbus.off(`${this._eventPrepend}:async:remove:all`, this._removeAllEventbus, this);
         this.#eventbus.off(`${this._eventPrepend}:get:enabled`, this.getEnabled, this);
         this.#eventbus.off(`${this._eventPrepend}:get:plugin:by:event`, this.getPluginByEvent, this);
         this.#eventbus.off(`${this._eventPrepend}:get:plugin:data`, this.getPluginData, this);
         this.#eventbus.off(`${this._eventPrepend}:get:plugin:events`, this.getPluginEvents, this);
         this.#eventbus.off(`${this._eventPrepend}:get:plugin:names`, this.getPluginNames, this);
         this.#eventbus.off(`${this._eventPrepend}:get:options`, this.getOptions, this);
         this.#eventbus.off(`${this._eventPrepend}:has:plugin`, this.hasPlugins, this);
         this.#eventbus.off(`${this._eventPrepend}:is:valid:config`, this.isValidConfig, this);
         this.#eventbus.off(`${this._eventPrepend}:set:enabled`, this._setEnabledEventbus, this);
         this.#eventbus.off(`${this._eventPrepend}:set:options`, this._setOptionsEventbus, this);
      }

      for (const pluginSupport of this.#pluginSupport)
      {
         await pluginSupport.destroy({ eventbus: this.#eventbus, eventPrepend: this._eventPrepend });
      }

      this.#pluginSupport = [];
      this.#pluginMap = null;
      this.#eventbus = null;

      return results;
   }

   /**
    * Provides the eventbus callback which may prevent plugin manager destruction if optional `noEventDestroy` is
    * enabled. This disables the ability for the plugin manager to be destroyed via events preventing any external
    * code removing plugins in this manner.
    *
    * @private
    * @returns {Promise<DataOutPluginRemoved[]>} A list of plugin names and removal success state.
    */
   async _destroyEventbus()
   {
      /* c8 ignore next */
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return !this.#options.noEventDestroy ? this.destroy() : [];
   }

   /**
    * Returns whether this plugin manager has been destroyed.
    *
    * @returns {boolean} Returns whether this plugin manager has been destroyed.
    */
   get isDestroyed()
   {
      return this.#pluginMap === null || this.#pluginMap === void 0;
   }

   /**
    * Returns the enabled state of a plugin, a list of plugins, or all plugins.
    *
    * @param {object}                  [opts] - Options object. If undefined all plugin enabled state is returned.
    *
    * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names to get state.
    *
    * @returns {boolean|DataOutPluginEnabled[]} Enabled state for single plugin or array of results for multiple
    *                                                plugins.
    */
   getEnabled({ plugins = [] } = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof plugins !== 'string' && !isIterable(plugins))
      {
         throw new TypeError(`'plugins' is not a string or iterable.`);
      }

      // Return a single boolean enabled result for a single plugin if found.
      if (typeof plugins === 'string')
      {
         const entry = this.#pluginMap.get(plugins);
         return entry !== void 0 && entry.enabled;
      }

      const results = [];

      let count = 0;

      for (const plugin of plugins)
      {
         const entry = this.#pluginMap.get(plugin);
         const loaded = entry !== void 0;
         results.push({ plugin, enabled: loaded && entry.enabled, loaded });
         count++;
      }

      // Iterable plugins had no entries so return all plugin data.
      if (count === 0)
      {
         for (const [plugin, entry] of this.#pluginMap.entries())
         {
            const loaded = entry !== void 0;
            results.push({ plugin, enabled: loaded && entry.enabled, loaded });
         }
      }

      return results;
   }

   /**
    * Returns any associated eventbus.
    *
    * @returns {Eventbus} The associated eventbus.
    */
   getEventbus()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return this.#eventbus;
   }

   /**
    * Returns a copy of the plugin manager options.
    *
    * @returns {PluginManagerOptions} A copy of the plugin manager options.
    */
   getOptions()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return JSON.parse(JSON.stringify(this.#options));
   }

   /**
    * Returns the event binding names registered on any associated plugin EventbusProxy.
    *
    * @param {object}          opts - Options object.
    *
    * @param {string|RegExp}   opts.event - Event name or RegExp to match event names.
    *
    * @returns {string[]|DataOutPluginEvents[]} Event binding names registered from the plugin.
    */
   getPluginByEvent({ event })
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof event !== 'string' && !(event instanceof RegExp))
      {
         throw new TypeError(`'event' is not a string or RegExp.`);
      }

      const pluginEvents = this.getPluginEvents();

      const results = [];

      if (typeof event === 'string')
      {
         for (const entry of pluginEvents)
         {
            if (entry.events.includes(event)) { results.push(entry.plugin); }
         }
      }
      else
      {
         for (const entry of pluginEvents)
         {
            for (const eventEntry of entry.events)
            {
               if (event.test(eventEntry))
               {
                  results.push(entry.plugin);
                  break;
               }
            }
         }
      }

      return results;
   }

   /**
    * Gets the plugin data for a plugin, list of plugins, or all plugins.
    *
    * @param {object}                  [opts] - Options object. If undefined all plugin data is returned.
    *
    * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names to get plugin data.
    *
    * @returns {PluginData|PluginData[]|undefined} The plugin data for a plugin or list of plugins.
    */
   getPluginData({ plugins = [] } = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof plugins !== 'string' && !isIterable(plugins))
      {
         throw new TypeError(`'plugins' is not a string or iterable.`);
      }

      // Return a PluginData result for a single plugin if found.
      if (typeof plugins === 'string')
      {
         const entry = this.#pluginMap.get(plugins);
         return entry !== void 0 ? JSON.parse(JSON.stringify(entry.data)) : void 0;
      }

      const results = [];

      let count = 0;

      for (const name of plugins)
      {
         const entry = this.#pluginMap.get(name);

         if (entry !== void 0)
         {
            results.push(JSON.parse(JSON.stringify(entry.data)));
         }
         count++;
      }

      // Iterable plugins had no entries so return all plugin data.
      if (count === 0)
      {
         for (const entry of this.#pluginMap.values())
         {
            if (entry !== void 0)
            {
               results.push(JSON.parse(JSON.stringify(entry.data)));
            }
         }
      }

      return results;
   }

   /**
    * Gets a PluginEntry instance for the given plugin name. This method is primarily for {@link PluginSupportImpl}
    * classes.
    *
    * @param {string} plugin - The plugin name to get.
    *
    * @returns {void|PluginEntry} The PluginEntry for the given plugin name.
    */
   getPluginEntry(plugin)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return this.#pluginMap.get(plugin)
   }

   /**
    * Returns the event binding names registered on any associated plugin EventbusProxy.
    *
    * @param {object}                  [opts] - Options object. If undefined all plugin data is returned.
    *
    * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names to get plugin data.
    *
    * @returns {string[]|DataOutPluginEvents[]} Event binding names registered from the plugin.
    */
   getPluginEvents({ plugins = [] } = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof plugins !== 'string' && !isIterable(plugins))
      {
         throw new TypeError(`'plugins' is not a string or iterable.`);
      }

      // Return a PluginData result for a single plugin if found.
      if (typeof plugins === 'string')
      {
         const entry = this.#pluginMap.get(plugins);
         return entry !== void 0 && entry.eventbusProxy ?
          Array.from(entry.eventbusProxy.proxyKeys()).sort() /* c8 ignore next */ : [];
      }

      const results = [];

      let count = 0;

      for (const plugin of plugins)
      {
         const entry = this.#pluginMap.get(plugin);

         if (entry !== void 0)
         {
            results.push({
               plugin,
               events: entry.eventbusProxy ?
                Array.from(entry.eventbusProxy.proxyKeys()).sort() /* c8 ignore next */ : []
            });
         }
         count++;
      }

      // Iterable plugins had no entries so return all plugin data.
      if (count === 0)
      {
         for (const entry of this.#pluginMap.values())
         {
            if (entry !== void 0)
            {
               results.push({
                  plugin: entry.name,
                  events: entry.eventbusProxy ?
                   Array.from(entry.eventbusProxy.proxyKeys()).sort() /* c8 ignore next */ : []
               });
            }
         }
      }

      return results;
   }

   /**
    * Returns an iterable of plugin map keys (plugin names). This method is primarily for {@link PluginSupportImpl}
    * classes.
    *
    * @returns {Iterable<string>} An iterable of plugin map keys.
    */
   getPluginMapKeys()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return this.#pluginMap.keys();
   }

   /**
    * Returns an iterable of plugin map keys (plugin names). This method is primarily for {@link PluginSupportImpl}
    * classes.
    *
    * @returns {Iterable<PluginEntry>} An iterable of plugin map keys.
    */
   getPluginMapValues()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return this.#pluginMap.values();
   }

   /**
    * Returns all plugin names or if enabled is set then return plugins matching the enabled state.
    *
    * @param {object}  [opts] - Options object. If undefined all plugin names are returned regardless of enabled state.
    *
    * @param {boolean} [opts.enabled] - If enabled is a boolean it will return plugins given their enabled state.
    *
    * @returns {string[]} A list of plugin names optionally by enabled state.
    */
   getPluginNames({ enabled = void 0 } = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (enabled !== void 0 && typeof enabled !== 'boolean')
      {
         throw new TypeError(`'enabled' is not a boolean.`);
      }

      const anyEnabledState = enabled === void 0;

      const results = [];

      for (const entry of this.#pluginMap.values())
      {
         if (anyEnabledState || entry.enabled === enabled) { results.push(entry.name); }
      }

      return results.sort();
   }

   /**
    * Returns true if there is a plugin loaded with the given plugin name(s). If no options are provided then
     * the result will be if any plugins are loaded.
    *
    * @param {object}                  [opts] - Options object. If undefined returns whether there are any plugins.
    *
    * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names to check existence.
    *
    * @returns {boolean} True if given plugin(s) exist.
    */
   hasPlugins({ plugins = [] } = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof plugins !== 'string' && !isIterable(plugins))
      {
         throw new TypeError(`'plugins' is not a string or iterable.`);
      }

      // Return whether a single plugin exists.
      if (typeof plugins === 'string')
      {
         return this.#pluginMap.has(plugins);
      }

      let count = 0;

      // Return whether all plugins specified exist.
      for (const name of plugins)
      {
         if (!this.#pluginMap.has(name)) { return false; }

         count++;
      }

      // Iterable plugins had no entries so simply check size of the map.
      if (count === 0)
      {
         return this.#pluginMap.size !== 0;
      }

      return true;
   }

   /**
    * Performs validation of a PluginConfig.
    *
    * @param {PluginConfig}   pluginConfig - A PluginConfig to validate.
    *
    * @returns {boolean} True if the given PluginConfig is valid.
    */
   isValidConfig(pluginConfig)
   {
      return isValidConfig(pluginConfig);
   }

   /**
    * Unloads / reloads the plugin invoking `onPluginUnload` / then `onPluginReload`
    *
    * @param {object}   opts - Options object.
    *
    * @param {string}   opts.plugin - Plugin name to reload.
    *
    * @param {object}   [opts.instance] - Optional instance to replace.
    *
    * @param {boolean}  [opts.silent] - Does not trigger any reload notification on the eventbus.
    *
    * @returns {Promise<boolean>} Result of reload attempt.
    */
   async reload({ plugin, instance = void 0, silent = false })
   {
      if (typeof plugin !== 'string') { throw new TypeError(`'plugin' is not a string.`); }
      if (instance !== void 0 && typeof instance !== 'object') { throw new TypeError(`'instance' is not an object.`); }
      if (typeof silent !== 'boolean') { throw new TypeError(`'silent' is not a boolean.`); }

      const entry = this.#pluginMap.get(plugin);

      if (entry === void 0) { return false; }

      // Store any state to load into new plugin instance.
      let state = void 0;

      let error = void 0;

      try
      {
         // Invokes the private internal async events method which allows skipping of error checking.
         const unloadData = await invokeAsyncEvent({
            method: 'onPluginUnload',
            manager: this,
            plugins: plugin,
            errorCheck: false
         });

         state = unloadData.state;
      }
      catch (err)
      {
         error = err;
      }

      try
      {
         entry.importmeta = void 0;

         // Automatically remove any potential reference to a stored event proxy instance.
         entry.instance._eventbus = void 0;
      }
      catch (err) { /* noop */ }

      if (entry.eventbusProxy instanceof EventbusProxy) { entry.eventbusProxy.off(); }

      if (typeof instance === 'object')
      {
         entry.instance = instance;
      }

      // Invokes the private internal async events method which allows skipping of error checking.
      const invokeData = await invokeAsyncEvent({
         method: 'onPluginLoad',
         manager: this,
         plugins: plugin,
         passthruProps: { state },
         errorCheck: false
      });

      // Invoke `typhonjs:plugin:manager:plugin:reloaded` allowing external code to react to plugin reload.
      try
      {
         if (this.#eventbus && !silent)
         {
            await this.#eventbus.triggerAsync(`typhonjs:plugin:manager:plugin:reloaded`,
             JSON.parse(JSON.stringify(entry.data)));
         }
      }
      catch (err)
      {
         // Only track this error if no previous error exists from onPluginUnload invocation.
         if (error === void 0) { error = err; }
      }

      if (typeof invokeData.importmeta === 'object')
      {
         entry.importmeta = invokeData.importmeta;

         // Until we get a Snowpack HMR spec environment for testing ignore this block.
         /* c8 ignore next 7 */
         if (typeof invokeData.importmeta.hot === 'object' && typeof invokeData.importmeta.hot.accept === 'function')
         {
            invokeData.importmeta.hot.accept(({ module }) =>
            {
               this.reload({ plugin, instance: resolveModule(module) });
            });
         }
      }

      // Throw any error raised first from any onPluginUnload invocation then the
      // `typhonjs:plugin:manager:plugin:reloaded` event.
      if (error) { throw error; }

      return true;
  }

   /**
    * Removes a plugin by name or all names in an iterable list unloading them and clearing any event bindings
    * automatically.
    *
    * @param {object}                  opts - Options object.
    *
    * @param {string|Iterable<string>} opts.plugins - Plugin name or iterable list of names to remove.
    *
    * @returns {Promise<DataOutPluginRemoved[]>} A list of plugin names and removal success state.
    */
   async remove({ plugins })
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof plugins !== 'string' && !isIterable(plugins))
      {
         throw new TypeError(`'plugins' is not a string or iterable.`);
      }

      const removeEntry = async (entry) =>
      {
         const errors = [];

         const pluginName = entry.name;

         try
         {
            // Invokes the private internal async events method which allows skipping of error checking.
            await invokeAsyncEvent({ method: 'onPluginUnload', manager: this, plugins: pluginName, errorCheck: false });
         }
         catch (err)
         {
            errors.push(err);
         }

         try
         {
            // Automatically remove any potential reference to a stored event proxy instance.
            entry.instance._eventbus = void 0;
         }
         catch (err) { /* noop */ }

         if (entry.eventbusProxy instanceof EventbusProxy) { entry.eventbusProxy.destroy(); }

         entry.importmeta = void 0;

         this.#pluginMap.delete(pluginName);

         // Invoke `typhonjs:plugin:manager:plugin:removed` allowing external code to react to plugin removed.
         try
         {
            if (this.#eventbus)
            {
               await this.#eventbus.triggerAsync(`typhonjs:plugin:manager:plugin:removed`,
                JSON.parse(JSON.stringify(entry.data)));
            }
         }
         catch (err)
         {
            errors.push(err);
         }

         return { plugin: pluginName, success: errors.length === 0, errors };
      };

      const results = [];

      // Return a single boolean enabled result for a single plugin if found.
      if (typeof plugins === 'string')
      {
         const entry = this.#pluginMap.get(plugins);

         if (entry !== void 0)
         {
            results.push(await removeEntry(entry));
         }
      }
      else
      {
         for (const name of plugins)
         {
            const entry = this.#pluginMap.get(name);

            if (entry !== void 0)
            {
               results.push(await removeEntry(entry));
            }
         }
      }

      return results;
   }

   /**
    * Removes all plugins after unloading them and clearing any event bindings automatically.
    *
    * @returns {Promise.<DataOutPluginRemoved[]>} A list of plugin names and removal success state.
    */
   async removeAll()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return this.remove({ plugins: Array.from(this.#pluginMap.keys()) });
   }

   /**
    * Provides the eventbus callback which may prevent removal if optional `noEventRemoval` is enabled. This disables
    * the ability for plugins to be removed via events preventing any external code removing plugins in this manner.
    *
    * @param {object}                  opts - Options object
    *
    * @param {string|Iterable<string>} opts.plugins - Plugin name or iterable list of names to remove.
    *
    * @returns {Promise<DataOutPluginRemoved>} A list of plugin names and removal success state.
    * @private
    */
   async _removeEventbus(opts)
   {
      /* c8 ignore next */
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return !this.#options.noEventRemoval ? this.remove(opts) : [];
   }

   /**
    * Provides the eventbus callback which may prevent removal if optional `noEventRemoval` is enabled. This disables
    * the ability for plugins to be removed via events preventing any external code removing plugins in this manner.
    *
    * @returns {Promise.<DataOutPluginRemoved[]>} A list of plugin names and removal success state.
    * @private
    */
   async _removeAllEventbus()
   {
      /* c8 ignore next */
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return !this.#options.noEventRemoval ? this.removeAll() : [];
   }

   /**
    * Sets the enabled state of a plugin, a list of plugins, or all plugins.
    *
    * @param {object}            opts - Options object.
    *
    * @param {boolean}           opts.enabled - The enabled state.
    *
    * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names to set state.
    */
   setEnabled({ enabled, plugins = [] })
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof plugins !== 'string' && !isIterable(plugins))
      {
         throw new TypeError(`'plugins' is not a string or iterable.`);
      }

      if (typeof enabled !== 'boolean') { throw new TypeError(`'enabled' is not a boolean.`); }

      const setEntryEnabled = (entry) =>
      {
         if (entry !== void 0)
         {
            entry.enabled = enabled;

            // Invoke `typhonjs:plugin:manager:plugin:enabled` allowing external code to react to plugin enabled state.
            if (this.#eventbus)
            {
               this.#eventbus.trigger(`typhonjs:plugin:manager:plugin:enabled`, Object.assign({
                  enabled
               }, JSON.parse(JSON.stringify(entry.data))));
            }
         }
      };

      // Set enabled state for a single plugin if found.
      if (typeof plugins === 'string')
      {
         setEntryEnabled(this.#pluginMap.get(plugins));
      }

      let count = 0;

      // First attempt to iterate through plugins.
      for (const name of plugins)
      {
         setEntryEnabled(this.#pluginMap.get(name));
         count++;
      }

      // If plugins is empty then set all plugins enabled state.
      if (count === 0)
      {
         for (const entry of this.#pluginMap.values())
         {
            setEntryEnabled(entry);
         }
      }
   }

   /**
    * Provides the eventbus callback which may prevent setEnabled if optional `noEventSetEnabled` is true. This
    * disables the ability for setting plugin enabled state via events preventing any external code from setting state.
    *
    * @param {object}   opts - Options object.
    *
    * @private
    */
   _setEnabledEventbus(opts)
   {
      /* c8 ignore next */
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!this.#options.noEventSetEnabled) { this.setEnabled(opts); }
   }

   /**
    * Sets the eventbus associated with this plugin manager. If any previous eventbus was associated all plugin manager
    * events will be removed then added to the new eventbus. If there are any existing plugins being managed their
    * events will be removed from the old eventbus and then `onPluginLoad` will be called with the new eventbus.
    *
    * @param {object}     opts - An options object.
    *
    * @param {Eventbus}   opts.eventbus - The new eventbus to associate.
    *
    * @param {string}     [opts.eventPrepend='plugins'] - An optional string to prepend to all of the event
    *                                                     binding targets.
    */
   async setEventbus({ eventbus, eventPrepend = 'plugins' })
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!isObject(eventbus)) { throw new TypeError(`'eventbus' is not an Eventbus.`); }
      if (typeof eventPrepend !== 'string') { throw new TypeError(`'eventPrepend' is not a string.`); }

      // Early escape if the eventbus is the same as the current eventbus.
      if (eventbus === this.#eventbus) { return; }

      const oldPrepend = this._eventPrepend;

      /**
       * Stores the prepend string for eventbus registration.
       *
       * @type {string}
       * @private
       */
      this._eventPrepend = eventPrepend;

      // Unload and reload any existing plugins from the old eventbus to the target eventbus.
      if (this.#pluginMap.size > 0)
      {
         // Invokes the private internal async events method which allows skipping of error checking.
         await invokeAsyncEvent({ method: 'onPluginUnload', manager: this, errorCheck: false });

         for (const entry of this.#pluginMap.values())
         {
            // Automatically remove any potential reference to a stored event proxy instance.
            try
            {
               entry.instance._eventbus = void 0;
            }
            /* c8 ignore next */
            catch (err) { /* nop */ }

            entry.data.manager.eventPrepend = eventPrepend;
            entry.data.manager.scopedName = `${eventPrepend}:${entry.name}`;

            if (entry.eventbusProxy instanceof EventbusProxy) { entry.eventbusProxy.destroy(); }

            entry.eventbusProxy = new EventbusProxy(eventbus);
         }

         // Invokes the private internal async events method which allows skipping of error checking.
         await invokeAsyncEvent({ method: 'onPluginLoad', manager: this, errorCheck: false });
      }

      if (this.#eventbus !== null)
      {
         this.#eventbus.off(`${oldPrepend}:async:add`, this._addEventbus, this);
         this.#eventbus.off(`${oldPrepend}:async:add:all`, this._addAllEventbus, this);
         this.#eventbus.off(`${oldPrepend}:async:destroy:manager`, this._destroyEventbus, this);
         this.#eventbus.off(`${oldPrepend}:async:remove`, this._removeEventbus, this);
         this.#eventbus.off(`${oldPrepend}:async:remove:all`, this._removeAllEventbus, this);
         this.#eventbus.off(`${oldPrepend}:get:enabled`, this.getEnabled, this);
         this.#eventbus.off(`${oldPrepend}:get:options`, this.getOptions, this);
         this.#eventbus.off(`${oldPrepend}:get:plugin:by:event`, this.getPluginByEvent, this);
         this.#eventbus.off(`${oldPrepend}:get:plugin:data`, this.getPluginData, this);
         this.#eventbus.off(`${oldPrepend}:get:plugin:events`, this.getPluginEvents, this);
         this.#eventbus.off(`${oldPrepend}:get:plugin:names`, this.getPluginNames, this);
         this.#eventbus.off(`${oldPrepend}:has:plugin`, this.hasPlugins, this);
         this.#eventbus.off(`${oldPrepend}:is:valid:config`, this.isValidConfig, this);
         this.#eventbus.off(`${oldPrepend}:set:enabled`, this._setEnabledEventbus, this);
         this.#eventbus.off(`${oldPrepend}:set:options`, this._setOptionsEventbus, this);
      }

      eventbus.on(`${eventPrepend}:async:add`, this._addEventbus, this, true);
      eventbus.on(`${eventPrepend}:async:add:all`, this._addAllEventbus, this, true);
      eventbus.on(`${eventPrepend}:async:destroy:manager`, this._destroyEventbus, this, true);
      eventbus.on(`${eventPrepend}:async:remove`, this._removeEventbus, this, true);
      eventbus.on(`${eventPrepend}:async:remove:all`, this._removeAllEventbus, this, true);
      eventbus.on(`${eventPrepend}:get:enabled`, this.getEnabled, this, true);
      eventbus.on(`${eventPrepend}:get:options`, this.getOptions, this, true);
      eventbus.on(`${eventPrepend}:get:plugin:by:event`, this.getPluginByEvent, this, true);
      eventbus.on(`${eventPrepend}:get:plugin:data`, this.getPluginData, this, true);
      eventbus.on(`${eventPrepend}:get:plugin:events`, this.getPluginEvents, this, true);
      eventbus.on(`${eventPrepend}:get:plugin:names`, this.getPluginNames, this, true);
      eventbus.on(`${eventPrepend}:has:plugin`, this.hasPlugins, this, true);
      eventbus.on(`${eventPrepend}:is:valid:config`, this.isValidConfig, this, true);
      eventbus.on(`${eventPrepend}:set:enabled`, this._setEnabledEventbus, this, true);
      eventbus.on(`${eventPrepend}:set:options`, this._setOptionsEventbus, this, true);

      for (const pluginSupport of this.#pluginSupport)
      {
         pluginSupport.setEventbus({
            oldEventbus: this.#eventbus,
            newEventbus: eventbus,
            oldPrepend,
            newPrepend: eventPrepend
         });
      }

      // Set the new eventbus for any EventbusSecure instances created.
      for (const eventbusSecureObj of this.#eventbusSecure)
      {
         eventbusSecureObj.setEventbus(eventbus);
      }

      this.#eventbus = eventbus;
   }

   /**
    * Set optional parameters.
    *
    * @param {PluginManagerOptions} options - Defines optional parameters to set.
    */
   setOptions(options)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!isObject(options)) { throw new TypeError(`'options' is not an object.`); }

      if (typeof options.noEventAdd === 'boolean') { this.#options.noEventAdd = options.noEventAdd; }

      if (typeof options.noEventDestroy === 'boolean') { this.#options.noEventDestroy = options.noEventDestroy; }

      if (typeof options.noEventRemoval === 'boolean') { this.#options.noEventRemoval = options.noEventRemoval; }

      if (typeof options.noEventSetEnabled === 'boolean')
      {
         this.#options.noEventSetEnabled = options.noEventSetEnabled;
      }

      if (typeof options.noEventSetOptions === 'boolean')
      {
         this.#options.noEventSetOptions = options.noEventSetOptions;
      }

      if (typeof options.throwNoMethod === 'boolean') { this.#options.throwNoMethod = options.throwNoMethod; }

      if (typeof options.throwNoPlugin === 'boolean') { this.#options.throwNoPlugin = options.throwNoPlugin; }

      for (const pluginSupport of this.#pluginSupport)
      {
         pluginSupport.setOptions(options);
      }
   }

   /**
    * Provides the eventbus callback which may prevent plugin manager options being set if optional `noEventSetOptions`
    * is enabled. This disables the ability for the plugin manager options to be set via events preventing any external
    * code modifying options.
    *
    * @param {PluginManagerOptions} options - Defines optional parameters to set.
    *
    * @private
    */
   _setOptionsEventbus(options)
   {
      /* c8 ignore next */
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!this.#options.noEventSetOptions) { this.setOptions(options); }
   }
}
