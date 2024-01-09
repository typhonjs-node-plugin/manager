import { Eventbus } from '@typhonjs-plugin/manager/eventbus';

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


/**
 * Provides a main eventbus instance.
 *
 * @type {import('#runtime/plugin/manager/eventbus').Eventbus}
 */
const eventbus = new Eventbus('mainEventbus');

/**
 * Provides an eventbus instance potentially for use with a plugin system.
 *
 * @type {import('#runtime/plugin/manager/eventbus').Eventbus}
 */
const pluginEventbus = new Eventbus('pluginEventbus');

/**
 * Provides an eventbus instance potentially for use for testing.
 *
 * @type {import('#runtime/plugin/manager/eventbus').Eventbus}
 */
const testEventbus = new Eventbus('testEventbus');

export { eventbus, pluginEventbus, testEventbus };
//# sourceMappingURL=index.js.map
