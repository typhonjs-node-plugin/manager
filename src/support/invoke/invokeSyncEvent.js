import { isIterable }      from '@typhonjs-utils/object';

import PluginInvokeEvent   from './PluginInvokeEvent.js';

/**
 * Private implementation to invoke synchronous events. This allows internal calls in PluginManager for
 * `onPluginLoad` and `onPluginUnload` callbacks to bypass optional error checking.
 *
 * This dispatch method synchronously passes to and returns from any invoked targets a PluginEvent.
 *
 * @param {object}                     opts - Options object.
 *
 * @param {string}                     opts.method - Method name to invoke.
 *
 * @param {PluginManager}              opts.manager - A plugin manager instance.
 *
 * @param {object}                     [opts.copyProps] - Properties that are copied.
 *
 * @param {object}                     [opts.passthruProps] - Properties that are passed through.
 *
 * @param {string|Iterable<string>}    [opts.plugins] - Specific plugin name or iterable list of plugin names to invoke.
 *
 * @param {object}                     [opts.options] - Defines options for throwing exceptions. Turned off by default.
 *
 * @param {boolean}                    [opts.errorCheck=true] - If false optional error checking is disabled.
 *
 * @returns {PluginEventData} The PluginEvent data.
 */
export default function invokeSyncEvent({ method, manager, copyProps = {}, passthruProps = {}, plugins = void 0,
 options = void 0, errorCheck = true })
{
   if (typeof method !== 'string') { throw new TypeError(`'method' is not a string.`); }
   if (typeof passthruProps !== 'object') { throw new TypeError(`'passthruProps' is not an object.`); }
   if (typeof copyProps !== 'object') { throw new TypeError(`'copyProps' is not an object.`); }

   if (options === void 0) { options = manager.getOptions(); }
   if (plugins === void 0) { plugins = manager.getPluginMapKeys(); }

   if (typeof plugins !== 'string' && !isIterable(plugins))
   {
      throw new TypeError(`'plugins' is not a string or iterable.`);
   }

   // Track how many plugins were invoked.
   let pluginInvokeCount = 0;
   const pluginInvokeNames = [];

   // Track if a plugin method is invoked
   let hasMethod = false;
   let hasPlugin = false;

   // Create plugin event.
   const ev = new PluginInvokeEvent(copyProps, passthruProps);

   if (typeof plugins === 'string')
   {
      const entry = manager.getPluginEntry(plugins);

      if (entry !== void 0 && entry.enabled && entry.instance)
      {
         hasPlugin = true;

         if (typeof entry.instance[method] === 'function')
         {
            ev.eventbus = entry.eventbusProxy;
            ev.pluginName = entry.name;
            ev.pluginOptions = entry.data.plugin.options;

            entry.instance[method](ev);

            hasMethod = true;
            pluginInvokeCount++;
            pluginInvokeNames.push(entry.name);
         }
      }
   }
   else
   {
      for (const name of plugins)
      {
         const entry = manager.getPluginEntry(name);

         if (entry !== void 0 && entry.enabled && entry.instance)
         {
            hasPlugin = true;

            if (typeof entry.instance[method] === 'function')
            {
               ev.eventbus = entry.eventbusProxy;
               ev.pluginName = entry.name;
               ev.pluginOptions = entry.data.plugin.options;

               entry.instance[method](ev);

               hasMethod = true;
               pluginInvokeCount++;
               pluginInvokeNames.push(entry.name);
            }
         }
      }
   }

   if (errorCheck && options.throwNoPlugin && !hasPlugin)
   {
      throw new Error(`PluginManager failed to find any target plugins.`);
   }

   if (errorCheck && options.throwNoMethod && !hasMethod)
   {
      throw new Error(`PluginManager failed to invoke '${method}'.`);
   }

   // Add meta data for plugin invoke count.
   ev.data.$$plugin_invoke_count = pluginInvokeCount;
   ev.data.$$plugin_invoke_names = pluginInvokeNames;

   return ev.data;
}
