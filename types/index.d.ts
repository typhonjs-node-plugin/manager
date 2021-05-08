/**
 * @typedef {object} type.DataOutPluginEnabled
 *
 * @property {string}   plugin - The plugin name.
 *
 * @property {boolean}  enabled - The enabled state of the plugin.
 *
 * @property {boolean}  loaded - True if the plugin is actually loaded.
 */
/**
 * @typedef {object} type.DataOutPluginEvents
 *
 * @property {string}   plugin - The plugin name.
 *
 * @property {string[]} events - The event names registered.
 */
/**
 * @typedef {object} type.DataOutPluginRemoved
 *
 * @property {string}   plugin - The plugin name.
 *
 * @property {boolean}  success - The success state for removal.
 *
 * @property {Error[]}  errors - A list of errors that may have been thrown during removal.
 */
/**
 * @typedef {object} type.PluginConfig
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
 * @typedef {object} type.PluginData
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
/**
 * @typedef {object} type.PluginEventData - Provides the unified event data including any pass through data to the
 *                                          copied data supplied. Invoked functions may add to or modify this data.
 */
/**
 * @typedef {object} type.PluginManagerOptions
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
/**
 * @typedef {object} type.PluginSupportImpl
 *
 * @property {Function} destroy
 * @property {Function} setEventbus
 * @property {Function} setOptions
 */
/**
 * @typedef {object} type.EventbusSecureObj - The control object returned by `EventbusSecure.initialize`.
 *
 * @property {Function} destroy - A function which destroys the underlying Eventbus reference.
 *
 * @property {EventbusSecure} eventbusSecure - The EventbusSecure instance.
 *
 * @property {Function} setEventbus - A function to set the underlying Eventbus reference.
 */
declare const type: {};
declare namespace type {
    type DataOutPluginEnabled = {
        /**
         * - The plugin name.
         */
        plugin: string;
        /**
         * - The enabled state of the plugin.
         */
        enabled: boolean;
        /**
         * - True if the plugin is actually loaded.
         */
        loaded: boolean;
    };
    type DataOutPluginEvents = {
        /**
         * - The plugin name.
         */
        plugin: string;
        /**
         * - The event names registered.
         */
        events: string[];
    };
    type DataOutPluginRemoved = {
        /**
         * - The plugin name.
         */
        plugin: string;
        /**
         * - The success state for removal.
         */
        success: boolean;
        /**
         * - A list of errors that may have been thrown during removal.
         */
        errors: Error[];
    };
    type PluginConfig = {
        /**
         * - Defines the name of the plugin; if no `target` entry is present the name
         *   doubles as the target (please see target).
         */
        name: string;
        /**
         * - Defines the target Node module to load or defines a local file (full
         *    path or relative to current working directory to load. Target may also be a file
         *    URL / string or in the browser a web URL.
         */
        target?: string | URL;
        /**
         * - Defines an existing object instance to use as the plugin.
         */
        instance?: string;
        /**
         * - Defines an object of options for the plugin.
         */
        options?: object;
    };
    type PluginData = {
        /**
         * - Data about the plugin manager.
         */
        manager: {
            eventPrepend: string;
        };
        /**
         * - Optional object hash to associate with plugin.
         */
        module: object;
        /**
         * - Data about the plugin.
         */
        plugin: {
            name: string;
            scopedName: string;
            target: string;
            targetEscaped: string;
            type: string;
            options: object;
        };
    };
    /**
     * - Provides the unified event data including any pass through data to the
     *                                          copied data supplied. Invoked functions may add to or modify this data.
     */
    type PluginEventData = object;
    type PluginManagerOptions = {
        /**
         * - If true this prevents plugins from being added by `plugins:add` and
         *    `plugins:add:all` events forcing direct method invocation for addition.
         */
        noEventAdd?: boolean;
        /**
         * - If true this prevents the plugin manager from being destroyed by
         *   `plugins:destroy:manager` forcing direct method invocation for destruction.
         */
        noEventDestroy?: boolean;
        /**
         * - If true this prevents plugins from being removed by `plugins:remove` and
         *    `plugins:remove:all` events forcing direct method invocation for removal.
         */
        noEventRemoval?: boolean;
        /**
         * - If true this prevents the plugins from being enabled / disabled
         *    from the eventbus via `plugins:set:enabled`.
         */
        noEventSetEnabled?: boolean;
        /**
         * - If true this prevents setting options for the plugin manager by
         *    `plugins:set:options` forcing direct method invocation for setting
         *    options.
         */
        noEventSetOptions?: boolean;
        /**
         * - If true then when a method fails to be invoked by any plugin an exception
         *    will be thrown.
         */
        throwNoMethod?: boolean;
        /**
         * - If true then when no plugin is matched to be invoked an exception will be
         *    thrown.
         */
        throwNoPlugin?: boolean;
    };
    type PluginSupportImpl = {
        destroy: Function;
        setEventbus: Function;
        setOptions: Function;
    };
    /**
     * - The control object returned by `EventbusSecure.initialize`.
     */
    type EventbusSecureObj = {
        /**
         * - A function which destroys the underlying Eventbus reference.
         */
        destroy: Function;
        /**
         * - The EventbusSecure instance.
         */
        eventbusSecure: any;
        /**
         * - A function to set the underlying Eventbus reference.
         */
        setEventbus: Function;
    };
}

/**
 * `plugins:async:invoke` - {@link PluginInvokeSupport#invokeAsync}
 *
 * `plugins:async:invoke:event` - {@link PluginInvokeSupport#invokeAsyncEvent}
 *
 * `plugins:get:method:names` - {@link PluginInvokeSupport#getMethodNames}
 *
 * `plugins:has:method` - {@link PluginInvokeSupport#hasMethod}
 *
 * `plugins:invoke` - {@link PluginInvokeSupport#invoke}
 *
 * `plugins:sync:invoke` - {@link PluginInvokeSupport#invokeSync}
 *
 * `plugins:sync:invoke:event` - {@link PluginInvokeSupport#invokeSyncEvent}
 *
 * @implements {type.PluginSupportImpl}
 */
declare class PluginInvokeSupport implements type.PluginSupportImpl {
    /**
     * Create PluginInvokeSupport
     *
     * @param {PluginManager} pluginManager - The plugin manager to associate.
     */
    constructor(pluginManager: any);
    /**
     * Returns whether the associated plugin manager has been destroyed.
     *
     * @returns {boolean} Returns whether the plugin manager has been destroyed.
     */
    get isDestroyed(): boolean;
    /**
     * Returns the associated plugin manager options.
     *
     * @returns {type.PluginManagerOptions} The associated plugin manager options.
     */
    get options(): type.PluginManagerOptions;
    /**
     * Gets the associated plugin manager.
     *
     * @returns {PluginManager} The associated plugin manager
     */
    get pluginManager(): any;
    /**
     * Destroys all managed plugins after unloading them.
     *
     * @param {object}     opts - An options object.
     *
     * @param {Eventbus}   opts.eventbus - The eventbus to disassociate.
     *
     * @param {string}     opts.eventPrepend - The current event prepend.
     */
    destroy({ eventbus, eventPrepend }?: {
        eventbus: any;
        eventPrepend: string;
    }): Promise<void>;
    /**
     * Returns method names for a specific plugin, list of plugins, or all plugins. The enabled state can be specified
     * along with sorting methods by plugin name.
     *
     * @param {object}                  [opts] - Options object. If undefined all plugin data is returned.
     *
     * @param {boolean}                 [opts.enabled] - If enabled is a boolean it will return plugin methods names
     *                                                   given the respective enabled state.
     *
     * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names.
     *
     * @returns {string[]} A list of method names
     */
    getMethodNames({ enabled, plugins }?: {
        enabled?: boolean;
        plugins?: string | Iterable<string>;
    }): string[];
    /**
     * Checks if the provided method name exists across all plugins or specific plugins if defined.
     *
     * @param {object}                  opts - Options object.
     *
     * @param {string}                  opts.method - Method name to test.
     *
     * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names to check for method. If
     *                                                   undefined all plugins must contain the method.
     *
     * @returns {boolean} - True method is found.
     */
    hasMethod({ method, plugins }?: {
        method: string;
        plugins?: string | Iterable<string>;
    }): boolean;
    /**
     * This dispatch method simply invokes any plugin targets for the given method name.
     *
     * @param {object}   opts - Options object.
     *
     * @param {string}   opts.method - Method name to invoke.
     *
     * @param {*[]}      [opts.args] - Method arguments. This array will be spread as multiple arguments.
     *
     * @param {string|Iterable<string>} [opts.plugins] - Specific plugin name or iterable list of plugin names to invoke.
     */
    invoke({ method, args, plugins }?: {
        method: string;
        args?: any[];
        plugins?: string | Iterable<string>;
    }): void;
    /**
     * This dispatch method is asynchronous and adds any returned results to an array which is resolved via Promise.all
     * Any target invoked may return a Promise or any result.
     *
     * @param {object}   opts - Options object.
     *
     * @param {string}   opts.method - Method name to invoke.
     *
     * @param {*[]}      [opts.args] - Method arguments. This array will be spread as multiple arguments.
     *
     * @param {string|Iterable<string>} [opts.plugins] - Specific plugin name or iterable list of plugin names to invoke.
     *
     * @returns {Promise<*|*[]>} A single result or array of results.
     */
    invokeAsync({ method, args, plugins }?: {
        method: string;
        args?: any[];
        plugins?: string | Iterable<string>;
    }): Promise<any | any[]>;
    /**
     * This dispatch method synchronously passes to and returns from any invoked targets a PluginEvent.
     *
     * @param {object}   opts - Options object.
     *
     * @param {string}   opts.method - Method name to invoke.
     *
     * @param {object}   [opts.copyProps] - Properties that are copied.
     *
     * @param {object}   [opts.passthruProps] - Properties that are passed through.
     *
     * @param {string|Iterable<string>} [opts.plugins] - Specific plugin name or iterable list of plugin names to invoke.
     *
     * @returns {Promise<type.PluginEventData>} The PluginEvent data.
     */
    invokeAsyncEvent({ method, copyProps, passthruProps, plugins }?: {
        method: string;
        copyProps?: object;
        passthruProps?: object;
        plugins?: string | Iterable<string>;
    }): Promise<type.PluginEventData>;
    /**
     * This dispatch method synchronously passes back a single value or an array with all results returned by any
     * invoked targets.
     *
     * @param {object}   opts - Options object.
     *
     * @param {string}   opts.method - Method name to invoke.
     *
     * @param {*[]}      [opts.args] - Method arguments. This array will be spread as multiple arguments.
     *
     * @param {string|Iterable<string>} [opts.plugins] - Specific plugin name or iterable list of plugin names to invoke.
     *
     * @returns {*|*[]} A single result or array of results.
     */
    invokeSync({ method, args, plugins }?: {
        method: string;
        args?: any[];
        plugins?: string | Iterable<string>;
    }): any | any[];
    /**
     * This dispatch method synchronously passes to and returns from any invoked targets a PluginEvent.
     *
     * @param {object}            opts - Options object.
     *
     * @param {string}            opts.method - Method name to invoke.
     *
     * @param {object}            [opts.copyProps] - Properties that are copied.
     *
     * @param {object}            [opts.passthruProps] - Properties that are passed through.
     *
     * @param {string|Iterable<string>} [opts.plugins] - Specific plugin name or iterable list of plugin names to invoke.
     *
     * @returns {type.PluginEventData} The PluginEvent data.
     */
    invokeSyncEvent({ method, copyProps, passthruProps, plugins }?: {
        method: string;
        copyProps?: object;
        passthruProps?: object;
        plugins?: string | Iterable<string>;
    }): type.PluginEventData;
    /**
     * Sets the eventbus associated with this plugin manager. If any previous eventbus was associated all plugin manager
     * events will be removed then added to the new eventbus. If there are any existing plugins being managed their
     * events will be removed from the old eventbus and then `onPluginLoad` will be called with the new eventbus.
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
    setEventbus({ oldEventbus, newEventbus, oldPrepend, newPrepend }?: {
        oldEventbus: any;
        newEventbus: any;
        oldPrepend: string;
        newPrepend: string;
    }): void;
    /**
     * Set optional parameters.
     *
     * @param {type.PluginManagerOptions} options Defines optional parameters to set.
     */
    setOptions(options?: type.PluginManagerOptions): void;
}

/**
 * Creates an escaped path which is suitable for use in RegExp construction.
 *
 * Note: This function will throw if a malformed URL string is the target. In AbstractPluginManager this function
 * is used after the module has been loaded / is a good target.
 *
 * @param {string|URL}  target - Target full / relative path or URL to escape.
 *
 * @returns {string} The escaped target.
 */
declare function escapeTarget(target: string | URL): string;

/**
 * Performs validation of a PluginConfig.
 *
 * @param {type.PluginConfig}   pluginConfig A PluginConfig to validate.
 *
 * @returns {boolean} True if the given PluginConfig is valid.
 */
declare function isValidConfig(pluginConfig: type.PluginConfig): boolean;

/**
 * Defines a class holding the data associated with a plugin including its instance.
 */
declare class PluginEntry {
    /**
     * Instantiates a PluginEntry.
     *
     * @param {string}      name - The plugin name.
     *
     * @param {type.PluginData}  data - Describes the plugin, manager, and optional module data.
     *
     * @param {object}      instance - The loaded plugin instance.
     *
     * @param {EventbusProxy}  eventbusProxy - The EventbusProxy associated with the plugin wrapping the plugin manager
     *                                         eventbus.
     */
    constructor(name: string, data: type.PluginData, instance: object, eventbusProxy?: any);
    /**
     * Get plugin data.
     *
     * @returns {type.PluginData} The associated PluginData.
     */
    get data(): type.PluginData;
    /**
     * Set enabled.
     *
     * @param {boolean} enabled - New enabled state.
     */
    set enabled(arg: boolean);
    /**
     * Get enabled.
     *
     * @returns {boolean} Current enabled state.
     */
    get enabled(): boolean;
    /**
     * Set associated EventbusProxy.
     *
     * @param {EventbusProxy} eventbusProxy - EventbusProxy instance to associate.
     */
    set eventbusProxy(arg: any);
    /**
     * Get associated EventbusProxy.
     *
     * @returns {EventbusProxy} Associated EventbusProxy.
     */
    get eventbusProxy(): any;
    /**
     * Get plugin instance.
     *
     * @returns {object} The plugin instance.
     */
    get instance(): any;
    /**
     * Get plugin name.
     *
     * @returns {string} Plugin name.
     */
    get name(): string;
}

/**
 * Provides a lightweight plugin manager for Node / NPM & the browser with eventbus integration for plugins in a safe
 * and protected manner across NPM modules, local files, and preloaded object instances. This pattern facilitates
 * message passing between modules versus direct dependencies / method invocation.
 *
 * A default eventbus will be created, but you may also pass in an eventbus from `@typhonjs-plugin/eventbus` and the
 * plugin manager will register by default under these event categories:
 *
 * `plugins:async:add` - {@link PluginManager#add}
 *
 * `plugins:async:add:all` - {@link PluginManager#addAll}
 *
 * `plugins:async:destroy:manager` - {@link PluginManager#destroy}
 *
 * `plugins:async:remove` - {@link PluginManager#remove}
 *
 * `plugins:async:remove:all` - {@link PluginManager#removeAll}
 *
 * `plugins:get:enabled` - {@link PluginManager#getEnabled}
 *
 * `plugins:get:options` - {@link PluginManager#getOptions}
 *
 * `plugins:get:plugin:by:event` - {@link PluginManager#getPluginByEvent}
 *
 * `plugins:get:plugin:data` - {@link PluginManager#getPluginData}
 *
 * `plugins:get:plugin:events` - {@link PluginManager#getPluginEvents}
 *
 * `plugins:get:plugin:names` - {@link PluginManager#getPluginNames}
 *
 * `plugins:has:plugin` - {@link PluginManager#hasPlugins}
 *
 * `plugins:is:valid:config` - {@link PluginManager#isValidConfig}
 *
 * `plugins:set:enabled` - {@link PluginManager#setEnabled}
 *
 * `plugins:set:options` - {@link PluginManager#setOptions}
 *
 * Automatically when a plugin is loaded and unloaded respective functions `onPluginLoad` and `onPluginUnload` will
 * be attempted to be invoked on the plugin. This is an opportunity for the plugin to receive any associated eventbus
 * and wire itself into it. It should be noted that a protected proxy around the eventbus is passed to the plugins
 * such that when the plugin is removed automatically all events registered on the eventbus are cleaned up without
 * a plugin author needing to do this manually in the `onPluginUnload` callback. This solves any dangling event binding
 * issues.
 *
 * By supporting ES Modules / CommonJS in Node and ES Modules in the browser the plugin manager is by nature
 * asynchronous for the core methods of adding / removing plugins and destroying the manager. The lifecycle methods
 * `onPluginLoad` and `onPluginUnload` will be awaited on such that if a plugin returns a Promise or is an async method
 * then it will complete before execution continues.
 *
 * It is recommended to interact with the plugin manager eventbus through an eventbus proxy. The
 * `createEventbusProxy` method will return a proxy to the default or currently set eventbus.
 *
 * If eventbus functionality is enabled it is important especially if using a process / global level eventbus such as
 * `@typhonjs-plugin/eventbus/instances` to call {@link PluginManager#destroy} to clean up all plugin eventbus
 * resources and the plugin manager event bindings; this is primarily a testing concern.
 *
 * @see https://www.npmjs.com/package/@typhonjs-plugin/eventbus
 *
 * @example
 * import PluginManager from '@typhonjs-plugin/manager';
 *
 * const pluginManager = new PluginManager();
 *
 * await pluginManager.add({ name: 'an-npm-plugin-enabled-module' });
 * await pluginManager.add({ name: 'my-local-module', target: './myModule.js' });
 *
 * const eventbus = pluginManager.createEventbusProxy();
 *
 * // Let's say an-npm-plugin-enabled-module responds to 'cool:event' which returns 'true'.
 * // Let's say my-local-module responds to 'hot:event' which returns 'false'.
 * // Both of the plugin / modules will have 'onPluginLoaded' invoked with a proxy to the eventbus and any plugin
 * // options defined.
 *
 * // One can then use the eventbus functionality to invoke associated module / plugin methods even retrieving results.
 * assert(eventbus.triggerSync('cool:event') === true);
 * assert(eventbus.triggerSync('hot:event') === false);
 *
 * // One can also indirectly invoke any method of the plugin.
 * // Any plugin with a method named `aCoolMethod` is invoked.
 * eventbus.triggerSync('plugins:invoke:sync:event', { method: 'aCoolMethod' });
 *
 * // A specific invocation just for the 'an-npm-plugin-enabled-module'
 * eventbus.triggerSync('plugins:invoke:sync:event', {
 *    method: 'aCoolMethod',
 *    plugins: 'an-npm-plugin-enabled-module'
 * });
 *
 * // The 3rd parameter will make a copy of the hash and the 4th defines a pass through object hash sending a single
 * // event / object hash to the invoked method.
 *
 * // -----------------------
 *
 * // Given that `@typhonjs-plugin/eventbus/instances` defines a global / process level eventbus you can import it in
 * // an entirely different file or even NPM module and invoke methods of loaded plugins like this:
 *
 * import eventbus from '@typhonjs-plugin/eventbus/instances';
 *
 * // Any plugin with a method named `aCoolMethod` is invoked.
 * eventbus.triggerSync('plugins:invoke', 'aCoolMethod');
 *
 * assert(eventbus.triggerSync('cool:event') === true);
 *
 * // Removes the plugin and unregisters events.
 * await eventbus.triggerAsync('plugins:remove', 'an-npm-plugin-enabled-module');
 *s
 * assert(eventbus.triggerSync('cool:event') === true); // Will now fail!
 *
 * // In this case though when using the global eventbus be mindful to always call `pluginManager.destroy()` in the
 * // main thread of execution scope to remove all plugins and the plugin manager event bindings!
 */
declare class PluginManager {
    /**
     * Instantiates PluginManager
     *
     * @param {object}   [options] - Provides various configuration options:
     *
     * @param {Eventbus} [options.eventbus] - An instance of '@typhonjs-plugin/eventbus' used as the plugin
     *                                        eventbus. If not provided a default eventbus is created.
     *
     * @param {string}   [options.eventPrepend='plugin'] - A customized name to prepend PluginManager events on the
     *                                                     eventbus.
     *
     * @param {type.PluginManagerOptions}  [options.manager] - The plugin manager options.
     *
     * @param {type.PluginSupportImpl|Iterable<type.PluginSupportImpl>} [options.PluginSupport] - Optional classes to
     *                                        pass in which extends the plugin manager. A default implementation is
     *                                        available: {@link PluginSupport}
     */
    constructor(options?: {
        eventbus?: any;
        eventPrepend?: string;
        manager?: type.PluginManagerOptions;
        PluginSupport?: type.PluginSupportImpl | Iterable<type.PluginSupportImpl>;
    });
    /**
     * Adds a plugin by the given configuration parameters. A plugin `name` is always required. If no other options
     * are provided then the `name` doubles as the NPM module / local file to load. The loading first checks for an
     * existing `instance` to use as the plugin. Then the `target` is chosen as the NPM module / local file to load.
     * By passing in `options` this will be stored and accessible to the plugin during all callbacks.
     *
     * @param {type.PluginConfig} pluginConfig - Defines the plugin to load.
     *
     * @param {object}            [moduleData] - Optional object hash to associate with plugin.
     *
     * @returns {Promise<type.PluginData>} The PluginData that represents the plugin added.
     */
    add(pluginConfig: type.PluginConfig, moduleData?: object): Promise<type.PluginData>;
    /**
     * Initializes multiple plugins in a single call.
     *
     * @param {Iterable<type.PluginConfig>}   pluginConfigs - An iterable list of plugin config object hash entries.
     *
     * @param {object}                        [moduleData] - Optional object hash to associate with all plugins.
     *
     * @returns {Promise<type.PluginData[]>} An array of PluginData objects of all added plugins.
     */
    addAll(pluginConfigs?: Iterable<type.PluginConfig>, moduleData?: object): Promise<type.PluginData[]>;
    /**
     * Provides the eventbus callback which may prevent addition if optional `noEventAdd` is enabled. This disables
     * the ability for plugins to be added via events preventing any external code adding plugins in this manner.
     *
     * @param {type.PluginConfig} pluginConfig - Defines the plugin to load.
     *
     * @param {object}            [moduleData] - Optional object hash to associate with all plugins.
     *
     * @returns {Promise<type.PluginData>} The PluginData that represents the plugin added.
     * @private
     */
    private _addEventbus;
    /**
     * Provides the eventbus callback which may prevent addition if optional `noEventAdd` is enabled. This disables
     * the ability for plugins to be added via events preventing any external code adding plugins in this manner.
     *
     * @param {Iterable<type.PluginConfig>}   pluginConfigs - An iterable list of plugin config object hash entries.
     *
     * @param {object}                        [moduleData] - Optional object hash to associate with all plugins.
     *
     * @returns {Promise<type.PluginData[]>} An array of PluginData objects of all added plugins.
     * @private
     */
    private _addAllEventbus;
    /**
     * If an eventbus is assigned to this plugin manager then a new EventbusProxy wrapping this eventbus is returned.
     * It is added to `this.#eventbusProxies` so †hat the instances are destroyed when the plugin manager is destroyed.
     *
     * @returns {EventbusProxy} A proxy for the currently set Eventbus.
     */
    createEventbusProxy(): any;
    /**
     * If an eventbus is assigned to this plugin manager then a new EventbusSecure wrapping this eventbus is returned.
     * It is added to `this.#eventbusSecure` so †hat the instances are destroyed when the plugin manager is destroyed.
     *
     * @returns {EventbusSecure} A secure wrapper for the currently set Eventbus.
     */
    createEventbusSecure(name?: any): any;
    /**
     * Destroys all managed plugins after unloading them.
     *
     * @returns {Promise<type.DataOutPluginRemoved[]>} A list of plugin names and removal success state.
     */
    destroy(): Promise<type.DataOutPluginRemoved[]>;
    /**
     * Provides the eventbus callback which may prevent plugin manager destruction if optional `noEventDestroy` is
     * enabled. This disables the ability for the plugin manager to be destroyed via events preventing any external
     * code removing plugins in this manner.
     *
     * @private
     * @returns {Promise<type.DataOutPluginRemoved[]>} A list of plugin names and removal success state.
     */
    private _destroyEventbus;
    /**
     * Returns whether this plugin manager has been destroyed.
     *
     * @returns {boolean} Returns whether this plugin manager has been destroyed.
     */
    get isDestroyed(): boolean;
    /**
     * Returns the enabled state of a plugin, a list of plugins, or all plugins.
     *
     * @param {object}                  [opts] - Options object. If undefined all plugin enabled state is returned.
     *
     * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names to get state.
     *
     * @returns {boolean|type.DataOutPluginEnabled[]} Enabled state for single plugin or array of results for multiple
     *                                                plugins.
     */
    getEnabled({ plugins }?: {
        plugins?: string | Iterable<string>;
    }): boolean | type.DataOutPluginEnabled[];
    /**
     * Returns any associated eventbus.
     *
     * @returns {Eventbus} The associated eventbus.
     */
    getEventbus(): any;
    /**
     * Returns a copy of the plugin manager options.
     *
     * @returns {type.PluginManagerOptions} A copy of the plugin manager options.
     */
    getOptions(): type.PluginManagerOptions;
    /**
     * Returns the event binding names registered on any associated plugin EventbusProxy.
     *
     * @param {object}          opts - Options object.
     *
     * @param {string|RegExp}   [opts.event] - Event name or RegExp to match event names.
     *
     * @returns {string[]|type.DataOutPluginEvents[]} Event binding names registered from the plugin.
     */
    getPluginByEvent({ event }?: {
        event?: string | RegExp;
    }): string[] | type.DataOutPluginEvents[];
    /**
     * Gets the plugin data for a plugin, list of plugins, or all plugins.
     *
     * @param {object}                  [opts] - Options object. If undefined all plugin data is returned.
     *
     * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names to get plugin data.
     *
     * @returns {type.PluginData|type.PluginData[]|undefined} The plugin data for a plugin or list of plugins.
     */
    getPluginData({ plugins }?: {
        plugins?: string | Iterable<string>;
    }): type.PluginData | type.PluginData[] | undefined;
    /**
     * Gets a PluginEntry instance for the given plugin name.
     *
     * @param {string} plugin - The plugin name to get.
     *
     * @returns {void|PluginEntry} The PluginEntry for the given plugin name.
     */
    getPluginEntry(plugin: string): void | PluginEntry;
    /**
     * Returns the event binding names registered on any associated plugin EventbusProxy.
     *
     * @param {object}                  [opts] - Options object. If undefined all plugin data is returned.
     *
     * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names to get plugin data.
     *
     * @returns {string[]|type.DataOutPluginEvents[]} Event binding names registered from the plugin.
     */
    getPluginEvents({ plugins }?: {
        plugins?: string | Iterable<string>;
    }): string[] | type.DataOutPluginEvents[];
    /**
     * Returns an iterable of plugin map keys (plugin names).
     *
     * @returns {Iterable<string>} An iterable of plugin map keys.
     */
    getPluginMapKeys(): Iterable<string>;
    /**
     * Returns an iterable of plugin map keys (plugin names).
     *
     * @returns {Iterable<PluginEntry>} An iterable of plugin map keys.
     */
    getPluginMapValues(): Iterable<PluginEntry>;
    /**
     * Returns all plugin names or if enabled is set then return plugins matching the enabled state.
     *
     * @param {object}  [opts] - Options object.
     *
     * @param {boolean} [opts.enabled] - If enabled is a boolean it will return plugins given their enabled state.
     *
     * @returns {string[]} A list of plugin names optionally by enabled state.
     */
    getPluginNames({ enabled }?: {
        enabled?: boolean;
    }): string[];
    /**
     * Returns true if there is a plugin loaded with the given plugin name(s). If no options are provided then
      * the result will be if any plugins are loaded.
     *
     * @param {object}                  [opts] - Options object. If undefined returns whether there are any plugins.
     *
     * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names to check existence.
     *
     * @returns {boolean} True if a plugin exists.
     */
    hasPlugins({ plugins }?: {
        plugins?: string | Iterable<string>;
    }): boolean;
    /**
     * Performs validation of a type.PluginConfig.
     *
     * @param {type.PluginConfig}   pluginConfig - A PluginConfig to validate.
     *
     * @returns {boolean} True if the given PluginConfig is valid.
     */
    isValidConfig(pluginConfig: type.PluginConfig): boolean;
    /**
     * Removes a plugin by name or all names in an iterable list unloading them and clearing any event bindings
     * automatically.
     *
     * @param {object}                  opts - Options object
     *
     * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names to remove.
     *
     * @returns {Promise<type.DataOutPluginRemoved[]>} A list of plugin names and removal success state.
     */
    remove({ plugins }?: {
        plugins?: string | Iterable<string>;
    }): Promise<type.DataOutPluginRemoved[]>;
    /**
     * Removes all plugins after unloading them and clearing any event bindings automatically.
     *
     * @returns {Promise.<type.DataOutPluginRemoved[]>} A list of plugin names and removal success state.
     */
    removeAll(): Promise<type.DataOutPluginRemoved[]>;
    /**
     * Provides the eventbus callback which may prevent removal if optional `noEventRemoval` is enabled. This disables
     * the ability for plugins to be removed via events preventing any external code removing plugins in this manner.
     *
     * @param {object}                  opts - Options object
     *
     * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names to remove.
     *
     * @returns {Promise<type.DataOutPluginRemoved>} A list of plugin names and removal success state.
     * @private
     */
    private _removeEventbus;
    /**
     * Provides the eventbus callback which may prevent removal if optional `noEventRemoval` is enabled. This disables
     * the ability for plugins to be removed via events preventing any external code removing plugins in this manner.
     *
     * @returns {Promise.<type.DataOutPluginRemoved[]>} A list of plugin names and removal success state.
     * @private
     */
    private _removeAllEventbus;
    /**
     * Sets the enabled state of a plugin, a list of plugins, or all plugins.
     *
     * @param {object}            opts - Options object.
     *
     * @param {boolean}           opts.enabled - The enabled state.
     *
     * @param {string|Iterable<string>} [opts.plugins] - Plugin name or iterable list of names to set state.
     */
    setEnabled({ enabled, plugins }?: {
        enabled: boolean;
        plugins?: string | Iterable<string>;
    }): void;
    /**
     * Provides the eventbus callback which may prevent setEnabled if optional `noEventSetEnabled` is true. This
     * disables the ability for setting plugin enabled state via events preventing any external code from setting state.
     *
     * @param {object}   opts - Options object.
     *
     * @private
     */
    private _setEnabledEventbus;
    /**
     * Sets the eventbus associated with this plugin manager. If any previous eventbus was associated all plugin manager
     * events will be removed then added to the new eventbus. If there are any existing plugins being managed their
     * events will be removed from the old eventbus and then `onPluginLoad` will be called with the new eventbus.
     *
     * @param {object}     opts - An options object.
     *
     * @param {Eventbus}   opts.eventbus - The new eventbus to associate.
     *
     * @param {string}     [opts.eventPrepend='plugins'] - An optional string to prepend to all of the event
     *                                                     binding targets.
     */
    setEventbus({ eventbus, eventPrepend }?: {
        eventbus: any;
        eventPrepend?: string;
    }): Promise<void>;
    /**
     * Stores the prepend string for eventbus registration.
     *
     * @type {string}
     * @private
     */
    private _eventPrepend;
    /**
     * Set optional parameters.
     *
     * @param {type.PluginManagerOptions} options - Defines optional parameters to set.
     */
    setOptions(options?: type.PluginManagerOptions): void;
    /**
     * Provides the eventbus callback which may prevent plugin manager options being set if optional `noEventSetOptions` is
     * enabled. This disables the ability for the plugin manager options to be set via events preventing any external
     * code modifying options.
     *
     * @param {type.PluginManagerOptions} options - Defines optional parameters to set.
     *
     * @private
     */
    private _setOptionsEventbus;
}

export default PluginManager;
export { PluginInvokeSupport, escapeTarget, isValidConfig };
