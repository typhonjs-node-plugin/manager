const interfaces =
`
/**
 * Describes the interface that all PluginSupport classes must implement.
 */
export interface PluginSupportImpl {
    /**
     * Destroys all managed plugins after unloading them.
     *
     * @param {object}     opts - An options object.
     *
     * @param {Eventbus}   opts.eventbus - The eventbus to disassociate.
     *
     * @param {string}     opts.eventPrepend - The current event prepend.
     */
    destroy({ eventbus, eventPrepend }: {
        eventbus: any;
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
    setEventbus({ oldEventbus, newEventbus, oldPrepend, newPrepend }: {
        oldEventbus: any;
        newEventbus: any;
        oldPrepend: string;
        newPrepend: string;
    }): void;
    
    /**
     * Set optional parameters.
     *
     * @param {PluginManagerOptions} options Defines optional parameters to set.
     */
    setOptions(options: PluginManagerOptions): void;
}
`;

export default interfaces;
