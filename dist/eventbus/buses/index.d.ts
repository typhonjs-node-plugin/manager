/**
 * Provides several standard Eventbus instances that are accessible through named exports: `mainEventbus`,
 * `pluginEventbus`, and `testEventbus`. For the most part these instances are useful for testing applications to
 * have easy access across the runtime to consistent instances.
 *
 * @example
 * ```js
 * import { mainEventbus, pluginEventbus, testEventbus } from '@typhonjs-plugin/manager/eventbus/buses';
 * ```
 *
 * @module
 */

import * as _runtime_plugin_manager_eventbus from '@typhonjs-plugin/manager/eventbus';

/**
 * Provides a main eventbus instance.
 *
 * @type {import('#runtime/plugin/manager/eventbus').Eventbus}
 */
declare const eventbus: _runtime_plugin_manager_eventbus.Eventbus;
/**
 * Provides an eventbus instance potentially for use with a plugin system.
 *
 * @type {import('#runtime/plugin/manager/eventbus').Eventbus}
 */
declare const pluginEventbus: _runtime_plugin_manager_eventbus.Eventbus;
/**
 * Provides an eventbus instance potentially for use for testing.
 *
 * @type {import('#runtime/plugin/manager/eventbus').Eventbus}
 */
declare const testEventbus: _runtime_plugin_manager_eventbus.Eventbus;

export { eventbus, pluginEventbus, testEventbus };
