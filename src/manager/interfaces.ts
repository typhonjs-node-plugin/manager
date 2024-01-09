import type { Eventbus }      from '#runtime/plugin/manager/eventbus';

import type { PluginManager } from './PluginManager.js';

declare interface PluginSupportConstructor
{
   new (pluginManager: PluginManager): PluginSupportImpl;
}

/**
 * Describes the interface that all PluginSupport classes must implement.
 */
declare interface PluginSupportImpl
{
   /**
    * Destroys all managed plugins after unloading them.
    *
    * @param {object}     opts - An options object.
    *
    * @param {Eventbus}   opts.eventbus - The eventbus to disassociate.
    *
    * @param {string}     opts.eventPrepend - The current event prepend.
    */
   destroy({eventbus, eventPrepend}: {
      eventbus: Eventbus;
      eventPrepend: string;
   }): Promise<void>;

   /**
    * Sets the eventbus associated with this plugin manager. If any previous eventbus was associated all plugin manager
    * events will be removed then added to the new eventbus. If there are any existing plugins being managed their
    * events will be removed from the old eventbus and then 'onPluginLoad' will be called with the new eventbus.
    *
    * @param {object}     opts - An options object.
    *
    * @param {Eventbus}   opts.oldEventbus - The old eventbus to disassociate.
    *
    * @param {Eventbus}   opts.newEventbus - The new eventbus to associate.
    *
    * @param {string}     opts.oldPrepend - The old event prepend.
    *
    * @param {string}     opts.newPrepend - The new event prepend.
    */
   setEventbus({oldEventbus, newEventbus, oldPrepend, newPrepend}: {
      oldEventbus: Eventbus;
      newEventbus: Eventbus;
      oldPrepend: string;
      newPrepend: string;
   }): void;

   /**
    * Set optional parameters.
    *
    * @param {import('.').PluginManagerOptions} options Defines optional parameters to set.
    */
   // @ts-ignore
   setOptions(options: import('.').PluginManagerOptions): void; // @ts-ignore
}

export type { PluginSupportConstructor, PluginSupportImpl };
