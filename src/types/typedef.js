/**
 * @typedef {object} DataOutPluginEnabled
 *
 * @property {string}   plugin - The plugin name.
 *
 * @property {boolean}  enabled - The enabled state of the plugin.
 *
 * @property {boolean}  loaded - True if the plugin is actually loaded.
 */

/**
 * @typedef {object} DataOutPluginEvents
 *
 * @property {string}   plugin - The plugin name.
 *
 * @property {string[]} events - The event names registered.
 */

/**
 * @typedef {object} DataOutPluginRemoved
 *
 * @property {string}   plugin - The plugin name.
 *
 * @property {boolean}  success - The success state for removal.
 *
 * @property {Error[]}  errors - A list of errors that may have been thrown during removal.
 */

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
 * @typedef {object} PluginData
 *
 * @property {object}   manager - Data about the plugin manager.
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
 *                                    path or relative to current working directory to load.
 *
 * @property {string}   plugin.targetEscaped - Provides the target, but properly escaped for RegExp usage.
 *
 * @property {string}   plugin.type - The type of plugin: `instance`
 *                                    In Node: `import-module`, `import-path`, `import-url`, `require-module`, or
 *                                    `require-module`, `require-path`, `require-url`.
 *                                    In Browser: `import-path`, `import-url`.
 *
 * @property {object}   plugin.options - Defines an object of options for the plugin.
 */

// eslint-disable-next-line jsdoc/require-property
/**
 * @typedef {object} PluginEventData - Provides the unified event data including any pass through data to the
 *                                          copied data supplied. Invoked functions may add to or modify this data.
 */

/**
 * @typedef {object} PluginManagerOptions
 *
 * @property {boolean}   [noEventAdd] - If true this prevents plugins from being added by `plugins:add` and
 *                                      `plugins:add:all` events forcing direct method invocation for addition.
 *
 * @property {boolean}   [noEventDestroy] - If true this prevents the plugin manager from being destroyed by
 *                                         `plugins:destroy:manager` forcing direct method invocation for destruction.
 *
 * @property {boolean}   [noEventRemoval] - If true this prevents plugins from being removed by `plugins:remove` and
 *                                          `plugins:remove:all` events forcing direct method invocation for removal.
 *
 * @property {boolean}   [noEventSetEnabled] - If true this prevents the plugins from being enabled / disabled
 *                                             from the eventbus via `plugins:set:enabled`.
 *
 * @property {boolean}   [noEventSetOptions] - If true this prevents setting options for the plugin manager by
 *                                             `plugins:set:options` forcing direct method invocation for setting
 *                                             options.
 *
 * @property {boolean}   [throwNoMethod] - If true then when a method fails to be invoked by any plugin an exception
 *                                         will be thrown.
 *
 * @property {boolean}   [throwNoPlugin] - If true then when no plugin is matched to be invoked an exception will be
 *                                         thrown.
 */

// TODO THIS NEEDS REFINEMENT
// /**
//  * Interface for PluginSupport implementation classes.
//  *
//  * @interface PluginSupportImpl
//  */
//
// /**
//  * A method to invoke when the plugin manager is destroyed.
//  *
//  * @function
//  * @async
//  * @name PluginSupportImpl#destroy
//  */
//
// /**
//  * A method to invoke when the plugin manager eventbus is set.
//  *
//  * @function
//  * @name PluginSupportImpl#setEventbus
//  */
//
// /**
//  * A method to invoke when the plugin manager options are set.
//  *
//  * @function
//  * @name PluginSupportImpl#setOptions
//  */
