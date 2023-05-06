/**
 * Performs validation of a PluginConfig.
 *
 * @param {import('..').PluginConfig}   pluginConfig A PluginConfig to validate.
 *
 * @returns {boolean} True if the given PluginConfig is valid.
 */
export function isValidConfig(pluginConfig)
{
   if (typeof pluginConfig !== 'object') { return false; }

   if (typeof pluginConfig.name !== 'string') { return false; }

   if (typeof pluginConfig.target !== 'undefined' && typeof pluginConfig.target !== 'string' &&
    !(pluginConfig.target instanceof URL))
   {
      return false;
   }

   if (typeof pluginConfig.options !== 'undefined' && typeof pluginConfig.options !== 'object') { return false; }

   return true;
}
