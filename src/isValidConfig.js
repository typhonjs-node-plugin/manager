/**
 * @typedef {object} PluginConfig
 *
 * @property {string}      name - Defines the name of the plugin; if no `target` entry is present the name
 *                                doubles as the target (please see target).
 *
 * @property {string|URL}  [target] - Defines the target Node module to load or defines a local file (full
 *                                    path or relative to current working directory to load. Target may also be a file
 *                                    URL / string or in the browser a web URL.
 *
 * @property {string}      [instance] - Defines an existing object instance to use as the plugin.
 *
 * @property {object}      [options] - Defines an object of options for the plugin.
 */

/**
 * Performs validation of a PluginConfig.
 *
 * @param {PluginConfig}   pluginConfig - A PluginConfig to validate.
 *
 * @returns {boolean} True if the given PluginConfig is valid.
 */
export default function isValidConfig(pluginConfig)
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
