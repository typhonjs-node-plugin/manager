import { isIterable }         from '#runtime/util/object';

import { invokeAsyncEvent }   from './invokeAsyncEvent.js';
import { invokeSyncEvent }    from './invokeSyncEvent.js';

/**
 * PluginInvokeSupport adds direct method invocation support to PluginManager via the eventbus and alternately through
 * a wrapped instance of PluginManager depending on the use case.
 *
 * There are two types of invocation methods the first spreads an array of arguments to the invoked method. The second
 * constructs a {@link PluginInvokeEvent} to pass to the method with a single parameter.
 *
 * TODO: more info and wiki link
 *
 * When added to a PluginManager through constructor initialization the following events are registered on the plugin
 * manager eventbus:
 *
 * `plugins:async:invoke` - {@link PluginInvokeSupport#invokeAsync}
 *
 * `plugins:async:invoke:event` - {@link PluginInvokeSupport#invokeAsyncEvent}
 *
 * `plugins:get:method:names` - {@link PluginInvokeSupport#getMethodNames}
 *
 * `plugins:has:method` - {@link PluginInvokeSupport#hasMethod}
 *
 * `plugins:invoke` - {@link PluginInvokeSupport#invoke}
 *
 * `plugins:sync:invoke` - {@link PluginInvokeSupport#invokeSync}
 *
 * `plugins:sync:invoke:event` - {@link PluginInvokeSupport#invokeSyncEvent}
 *
 * @example
 * ```js
 * // One can also indirectly invoke any method of the plugin.
 * // Any plugin with a method named `aCoolMethod` is invoked.
 * eventbus.triggerSync('plugins:invoke:sync:event', { method: 'aCoolMethod' });
 *
 * // A specific invocation just for the 'an-npm-plugin-enabled-module'
 * eventbus.triggerSync('plugins:invoke:sync:event', {
 *    method: 'aCoolMethod',
 *    plugins: 'an-npm-plugin-enabled-module'
 * });
 *
 * // There are two other properties `copyProps` and `passthruProps` which can be set with object data to _copy_ or
 * // _pass through_ to the invoked method.
 * ```
 *
 * @implements {import('../../interfaces').PluginSupportImpl}
 */
export class PluginInvokeSupport
{
   /**
    * @type {import('../..').PluginManager}
    */
   #pluginManager = null;

   /**
    * Create PluginInvokeSupport
    *
    * @param {import('../..').PluginManager} pluginManager - The plugin manager to associate.
    */
   constructor(pluginManager)
   {
      this.#pluginManager = pluginManager;
   }

   /**
    * Returns whether the associated plugin manager has been destroyed.
    *
    * @returns {boolean} Returns whether the plugin manager has been destroyed.
    */
   get isDestroyed()
   {
      return this.#pluginManager === null || this.#pluginManager.isDestroyed;
   }

   /**
    * Returns the associated plugin manager options.
    *
    * @returns {import('../../').PluginManagerOptions} The associated plugin manager options.
    */
   get options()
   {
      /* c8 ignore next 1 */
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return this.#pluginManager.getOptions();
   }

   /**
    * Gets the associated plugin manager.
    *
    * @returns {import('../../').PluginManager} The associated plugin manager
    */
   get pluginManager()
   {
      /* c8 ignore next 1 */
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return this.#pluginManager;
   }

   /**
    * Destroys all managed plugins after unloading them.
    *
    * @param {object}     opts - An options object.
    *
    * @param {import('#runtime/plugin/manager/eventbus').Eventbus}   opts.eventbus - The eventbus to disassociate.
    *
    * @param {string}     opts.eventPrepend - The current event prepend.
    */
   async destroy({ eventbus, eventPrepend })
   {
      if (eventbus !== null && eventbus !== void 0)
      {
         eventbus.off(`${eventPrepend}:async:invoke`, this.invokeAsync, this);
         eventbus.off(`${eventPrepend}:async:invoke:event`, this.invokeAsyncEvent, this);
         eventbus.off(`${eventPrepend}:get:method:names`, this.getMethodNames, this);
         eventbus.off(`${eventPrepend}:has:method`, this.hasMethod, this);
         eventbus.off(`${eventPrepend}:invoke`, this.invoke, this);
         eventbus.off(`${eventPrepend}:sync:invoke`, this.invokeSync, this);
         eventbus.off(`${eventPrepend}:sync:invoke:event`, this.invokeSyncEvent, this);
      }

      this.#pluginManager = null;
   }

   /**
    * Returns method names for a specific plugin, list of plugins, or all plugins. The enabled state can be specified
    * along with sorting methods by plugin name.
    *
    * @param {object}                  [opts] - Options object. If undefined all plugin data is returned.
    *
    * @param {boolean}                 [opts.enabled] - If enabled is a boolean it will return plugin methods names
    *                                                   given the respective enabled state.
    *
    * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names.
    *
    * @returns {string[]} A list of method names
    */
   getMethodNames({ enabled = void 0, plugins = [] } = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

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
         const entry = this.pluginManager.getPluginEntry(name);

         if (entry !== void 0 && entry.instance && (anyEnabledState || entry.enabled === enabled))
         {
            for (const name of s_GET_ALL_PROPERTY_NAMES(entry.instance))
            {
               // Skip any names that are not a function or are the constructor.
               if (typeof entry.instance[name] === 'function' && name !== 'constructor') { results[name] = true; }
            }
         }

         count++;
      }

      // Iterable plugins had no entries so return all plugin data.
      if (count === 0)
      {
         for (const entry of this.pluginManager.getPluginMapValues())
         {
            if (entry.instance && (anyEnabledState || entry.enabled === enabled))
            {
               for (const name of s_GET_ALL_PROPERTY_NAMES(entry.instance))
               {
                  // Skip any names that are not a function or are the constructor.
                  if (typeof entry.instance[name] === 'function' && name !== 'constructor') { results[name] = true; }
               }
            }
         }
      }

      return Object.keys(results).sort();
   }

   /**
    * Checks if the provided method name exists across all plugins or specific plugins if defined.
    *
    * @param {object}                  opts - Options object.
    *
    * @param {string}                  opts.method - Method name to test.
    *
    * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names to check for method. If
    *                                                   undefined all plugins must contain the method.
    *
    * @returns {boolean} - True method is found.
    */
   hasMethod({ method, plugins = [] })
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof method !== 'string')
      {
         throw new TypeError(`'method' is not a string.`);
      }

      if (typeof plugins !== 'string' && !isIterable(plugins))
      {
         throw new TypeError(`'plugins' is not a string or iterable.`);
      }

      // Return a single boolean enabled result for a single plugin if found.
      if (typeof plugins === 'string')
      {
         const entry = this.pluginManager.getPluginEntry(plugins);
         return entry !== void 0 && typeof entry.instance[method] === 'function';
      }

      let count = 0;

      for (const name of plugins)
      {
         const entry = this.pluginManager.getPluginEntry(name);

         if (entry !== void 0 && typeof entry.instance[method] !== 'function') { return false; }

         count++;
      }

      // Iterable plugins had no entries so check all plugin data.
      if (count === 0)
      {
         for (const entry of this.pluginManager.getPluginMapValues())
         {
            if (typeof entry.instance[method] !== 'function') { return false; }
         }
      }

      return true;
   }

   /**
    * This dispatch method simply invokes any plugin targets for the given method name.
    *
    * @param {object}   opts - Options object.
    *
    * @param {string}   opts.method - Method name to invoke.
    *
    * @param {*[]}      [opts.args] - Method arguments. This array will be spread as multiple arguments.
    *
    * @param {string|Iterable<string>} [opts.plugins] - Specific plugin name or iterable list of plugin names to invoke.
    */
   invoke({ method, args = void 0, plugins = void 0 })
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof method !== 'string') { throw new TypeError(`'method' is not a string.`); }

      if (args !== void 0 && !Array.isArray(args)) { throw new TypeError(`'args' is not an array.`); }

      if (plugins === void 0) { plugins = this.pluginManager.getPluginMapKeys(); }

      if (typeof plugins !== 'string' && !isIterable(plugins))
      {
         throw new TypeError(`'plugins' is not a string or iterable.`);
      }

      // Track if a plugin method is invoked.
      let hasMethod = false;
      let hasPlugin = false;

      const isArgsArray = Array.isArray(args);

      if (typeof plugins === 'string')
      {
         const entry = this.pluginManager.getPluginEntry(plugins);

         if (entry !== void 0 && entry.enabled && entry.instance)
         {
            hasPlugin = true;

            if (typeof entry.instance[method] === 'function')
            {
               isArgsArray ? entry.instance[method](...args) : entry.instance[method]();

               hasMethod = true;
            }
         }
      }
      else
      {
         for (const name of plugins)
         {
            const entry = this.pluginManager.getPluginEntry(name);

            if (entry !== void 0 && entry.enabled && entry.instance)
            {
               hasPlugin = true;

               if (typeof entry.instance[method] === 'function')
               {
                  isArgsArray ? entry.instance[method](...args) : entry.instance[method]();

                  hasMethod = true;
               }
            }
         }
      }

      if (this.options.throwNoPlugin && !hasPlugin)
      {
         throw new Error(`PluginManager failed to find any target plugins.`);
      }

      if (this.options.throwNoMethod && !hasMethod)
      {
         throw new Error(`PluginManager failed to invoke '${method}'.`);
      }
   }

   /**
    * This dispatch method is asynchronous and adds any returned results to an array which is resolved via Promise.all
    * Any target invoked may return a Promise or any result.
    *
    * @param {object}   opts - Options object.
    *
    * @param {string}   opts.method - Method name to invoke.
    *
    * @param {*[]}      [opts.args] - Method arguments. This array will be spread as multiple arguments.
    *
    * @param {string|Iterable<string>} [opts.plugins] - Specific plugin name or iterable list of plugin names to invoke.
    *
    * @returns {Promise<*|*[]>} A single result or array of results.
    */
   async invokeAsync({ method, args = void 0, plugins = void 0 })
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof method !== 'string') { throw new TypeError(`'method' is not a string.`); }

      if (args !== void 0 && !Array.isArray(args)) { throw new TypeError(`'args' is not an array.`); }

      if (plugins === void 0) { plugins = this.pluginManager.getPluginMapKeys(); }

      if (typeof plugins !== 'string' && !isIterable(plugins))
      {
         throw new TypeError(`'plugins' is not a string or iterable.`);
      }

      // Track if a plugin method is invoked.
      let hasMethod = false;
      let hasPlugin = false;

      // Capture results.
      let result = void 0;
      const results = [];

      const isArgsArray = Array.isArray(args);

      if (typeof plugins === 'string')
      {
         const plugin = this.pluginManager.getPluginEntry(plugins);

         if (plugin !== void 0 && plugin.enabled && plugin.instance)
         {
            hasPlugin = true;

            if (typeof plugin.instance[method] === 'function')
            {
               result = isArgsArray ? plugin.instance[method](...args) : plugin.instance[method]();

               // If we received a valid result push it to the results.
               if (result !== void 0) { results.push(result); }

               hasMethod = true;
            }
         }
      }
      else
      {
         for (const name of plugins)
         {
            const plugin = this.pluginManager.getPluginEntry(name);

            if (plugin !== void 0 && plugin.enabled && plugin.instance)
            {
               hasPlugin = true;

               if (typeof plugin.instance[method] === 'function')
               {
                  result = isArgsArray ? plugin.instance[method](...args) : plugin.instance[method]();

                  // If we received a valid result push it to the results.
                  if (result !== void 0) { results.push(result); }

                  hasMethod = true;
               }
            }
         }
      }

      if (this.options.throwNoPlugin && !hasPlugin)
      {
         throw new Error(`PluginManager failed to find any target plugins.`);
      }

      if (this.options.throwNoMethod && !hasMethod)
      {
          throw new Error(`PluginManager failed to invoke '${method}'.`);
      }

      // If there are multiple results then use Promise.all otherwise Promise.resolve.
      return results.length > 1 ? Promise.all(results).then((values) =>
      {
         const filtered = values.filter((entry) => entry !== void 0);
         switch (filtered.length)
         {
            case 0: return void 0;
            case 1: return filtered[0];
            default: return filtered;
         }
      }) : result;
   }

   /**
    * This dispatch method synchronously passes to and returns from any invoked targets a PluginEvent.
    *
    * @param {object}   opts - Options object.
    *
    * @param {string}   opts.method - Method name to invoke.
    *
    * @param {object}   [opts.copyProps] - Properties that are copied.
    *
    * @param {object}   [opts.passthruProps] - Properties that are passed through.
    *
    * @param {string | Iterable<string>} [opts.plugins] - Specific plugin name or iterable list of plugin names to invoke.
    *
    * @returns {Promise<import('../../').PluginEventData>} The PluginEvent data.
    */
   async invokeAsyncEvent({ method, copyProps = {}, passthruProps = {}, plugins = void 0 })
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      // Invokes the private internal async events method.
      return invokeAsyncEvent({ method, manager: this.pluginManager, copyProps, passthruProps, plugins });
   }

   /**
    * This dispatch method synchronously passes back a single value or an array with all results returned by any
    * invoked targets.
    *
    * @param {object}   opts - Options object.
    *
    * @param {string}   opts.method - Method name to invoke.
    *
    * @param {*[]}      [opts.args] - Method arguments. This array will be spread as multiple arguments.
    *
    * @param {string|Iterable<string>} [opts.plugins] - Specific plugin name or iterable list of plugin names to invoke.
    *
    * @returns {*|*[]} A single result or array of results.
    */
   invokeSync({ method, args = void 0, plugins = void 0 })
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof method !== 'string') { throw new TypeError(`'method' is not a string.`); }

      if (args !== void 0 && !Array.isArray(args)) { throw new TypeError(`'args' is not an array.`); }

      if (plugins === void 0) { plugins = this.pluginManager.getPluginMapKeys(); }

      if (typeof plugins !== 'string' && !isIterable(plugins))
      {
         throw new TypeError(`'plugins' is not a string or iterable.`);
      }

      // Track if a plugin method is invoked.
      let hasMethod = false;
      let hasPlugin = false;

      // Capture results.
      let result = void 0;
      const results = [];

      const isArgsArray = Array.isArray(args);

      if (typeof plugins === 'string')
      {
         const plugin = this.pluginManager.getPluginEntry(plugins);

         if (plugin !== void 0 && plugin.enabled && plugin.instance)
         {
            hasPlugin = true;

            if (typeof plugin.instance[method] === 'function')
            {
               result = isArgsArray ? plugin.instance[method](...args) : plugin.instance[method]();

               // If we received a valid result push it to the results.
               if (result !== void 0) { results.push(result); }

               hasMethod = true;
            }
         }
      }
      else
      {
         for (const name of plugins)
         {
            const plugin = this.pluginManager.getPluginEntry(name);

            if (plugin !== void 0 && plugin.enabled && plugin.instance)
            {
               hasPlugin = true;

               if (typeof plugin.instance[method] === 'function')
               {
                  result = isArgsArray ? plugin.instance[method](...args) : plugin.instance[method]();

                  // If we received a valid result push it to the results.
                  if (result !== void 0) { results.push(result); }

                  hasMethod = true;
               }
            }
         }
      }

      if (this.options.throwNoPlugin && !hasPlugin)
      {
         throw new Error(`PluginManager failed to find any target plugins.`);
      }

      if (this.options.throwNoMethod && !hasMethod)
      {
         throw new Error(`PluginManager failed to invoke '${method}'.`);
      }

      // Return the results array if there are more than one or just a single result.
      return results.length > 1 ? results : result;
   }

   /**
    * This dispatch method synchronously passes to and returns from any invoked targets a PluginEvent.
    *
    * @param {object}            opts - Options object.
    *
    * @param {string}            opts.method - Method name to invoke.
    *
    * @param {object}            [opts.copyProps] - Properties that are copied.
    *
    * @param {object}            [opts.passthruProps] - Properties that are passed through.
    *
    * @param {string|Iterable<string>} [opts.plugins] - Specific plugin name or iterable list of plugin names to invoke.
    *
    * @returns {import('../../').PluginEventData} The PluginEvent data.
    */
   invokeSyncEvent({ method, copyProps = {}, passthruProps = {}, plugins = void 0 })
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      // Invokes the private internal sync events method.
      return invokeSyncEvent({ method, manager: this.pluginManager, copyProps, passthruProps, plugins });
   }

   /**
    * Sets the eventbus associated with this plugin manager. If any previous eventbus was associated all plugin manager
    * events will be removed then added to the new eventbus. If there are any existing plugins being managed their
    * events will be removed from the old eventbus and then `onPluginLoad` will be called with the new eventbus.
    *
    * @param {object}     opts - An options object.
    *
    * @param {import('#runtime/plugin/manager/eventbus').Eventbus}   opts.oldEventbus - The old eventbus to disassociate.
    *
    * @param {import('#runtime/plugin/manager/eventbus').Eventbus}   opts.newEventbus - The new eventbus to associate.
    *
    * @param {string}     opts.oldPrepend - The old event prepend.
    *
    * @param {string}     opts.newPrepend - The new event prepend.
    */
   setEventbus({ oldEventbus, newEventbus, oldPrepend, newPrepend })
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (oldEventbus !== null && oldEventbus !== void 0)
      {
         oldEventbus.off(`${oldPrepend}:async:invoke`, this.invokeAsync, this);
         oldEventbus.off(`${oldPrepend}:async:invoke:event`, this.invokeAsyncEvent, this);
         oldEventbus.off(`${oldPrepend}:get:method:names`, this.getMethodNames, this);
         oldEventbus.off(`${oldPrepend}:has:method`, this.hasMethod, this);
         oldEventbus.off(`${oldPrepend}:invoke`, this.invoke, this);
         oldEventbus.off(`${oldPrepend}:sync:invoke`, this.invokeSync, this);
         oldEventbus.off(`${oldPrepend}:sync:invoke:event`, this.invokeSyncEvent, this);
      }

      if (newEventbus !== null && newEventbus !== void 0)
      {
         newEventbus.on(`${newPrepend}:async:invoke`, this.invokeAsync, this, { guard: true });
         newEventbus.on(`${newPrepend}:async:invoke:event`, this.invokeAsyncEvent, this, { guard: true });
         newEventbus.on(`${newPrepend}:get:method:names`, this.getMethodNames, this, { guard: true });
         newEventbus.on(`${newPrepend}:has:method`, this.hasMethod, this, { guard: true });
         newEventbus.on(`${newPrepend}:invoke`, this.invoke, this, { guard: true });
         newEventbus.on(`${newPrepend}:sync:invoke`, this.invokeSync, this, { guard: true });
         newEventbus.on(`${newPrepend}:sync:invoke:event`, this.invokeSyncEvent, this, { guard: true });
      }
   }

   /**
    * Set optional parameters.
    *
    * @param {import('../../').PluginManagerOptions} options Defines optional parameters to set.
    */
   setOptions(options)  // eslint-disable-line no-unused-vars
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }
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
   } while (obj !== void 0 && obj !== null && !(obj === Object.prototype));

   return props;
};
