/**
 * Resolves a dynamically imported module for PluginManager. This function is passed to `@typhonjs-utils/loader-module`.
 *
 * @param {object}   module - The imported module.
 *
 * @returns {*} The export most likely to match a valid plugin.
 */
export function resolveModule(module)
{
   // If the module has a named export for `onPluginLoad` then take the module.
   if (typeof module.onPluginLoad === 'function')
   {
      return module;
   }
   // Then potentially resolve any default export / static class.
   else if (module.default)
   {
      return module.default;
   }
   // Finally resolve as just the module.
   else
   {
      return module;
   }
}
