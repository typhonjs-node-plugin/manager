import { Eventbus } from '#manager/eventbus';

/**
 * Provides a main eventbus instance.
 *
 * @type {import('#manager/eventbus').Eventbus}
 */
export const eventbus = new Eventbus('mainEventbus');

/**
 * Provides an eventbus instance potentially for use with a plugin system.
 *
 * @type {import('#manager/eventbus').Eventbus}
 */
export const pluginEventbus = new Eventbus('pluginEventbus');

/**
 * Provides an eventbus instance potentially for use for testing.
 *
 * @type {import('#manager/eventbus').Eventbus}
 */
export const testEventbus = new Eventbus('testEventbus');
