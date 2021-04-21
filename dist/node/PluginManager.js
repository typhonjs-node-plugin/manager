import fs from 'fs';
import module from 'module';
import path from 'path';
import url from 'url';

/**
 * Stores the data tracked over traversing the starting directory. And provides a few internal utility methods.
 */
class TraversalData
{
   constructor()
   {
      /**
       * Stores any base directory defined or the root path.
       *
       * @type {string}
       */
      this.baseDirectory = void 0;

      /**
       * Stores the number of times a package is processed; useful in callbacks.
       *
       * @type {number}
       */
      this.cntr = 0;

      /**
       * Current directory of traversal.
       *
       * @type {string}
       */
      this.currentDirectory = void 0;

      /**
       * Current loaded `package.json` object.
       *
       * @type {object}
       */
      this.packageObj = void 0;

      /**
       * Path of current loaded `package.json` object
       *
       * @type {string}
       */
      this.packagePath = void 0;

      /**
       * The root path to stop traversal; determined from starting directory path.
       *
       * @type {string}
       */
      this.rootPath = void 0;

      /**
       * Stores a callback function.
       *
       * @type {Function}
       * @private
       */
      this._callback = void 0;
   }

   /**
    * Returns true if basedir has been set comparing the starting directory against the base directory to
    * determine if the base directory is a parent path intentionally stopping traversal.
    *
    * @returns {boolean} Whether basedir is set and a parent of the starting directory.
    */
   isBaseParent()
   {
      // If basepath is not configured it is set to root path.
      if (this.baseDirectory === this.rootPath) { return false; }

      const relative = path.relative(this.baseDirectory, this.currentDirectory);
      return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
   }

   /**
    * Parses the options object passed into the various getPackage functions.
    *
    * @param {TraversalData}  data - A TraversalData instance.
    *
    * @param {object}      options - An object.
    *
    * @param {string|URL}  options.filepath - Initial file or directory path to search for `package.json`.
    *
    * @param {string|URL}  [options.basepath] - Base path to stop traversing. Set to the root path of `filepath` if not
    *                                           provided.
    *
    * @param {Function}    [options.callback] - A function that evaluates any loaded package.json object that passes
    *                                           back a truthy value that stops or continues the traversal.
    *
    * @returns {TraversalData} Returns the parsed TraversalData instance.
    */
   static parse(data, { filepath, basepath = void 0, callback } = {})
   {
      if (typeof filepath !== 'string' && !(filepath instanceof URL))
      {
         throw new TypeError(`'filepath' is not a 'string' or file 'URL'`);
      }

      if (basepath !== void 0 && typeof basepath !== 'string' && !(basepath instanceof URL))
      {
         throw new TypeError(`'basepath' is not a 'string' or file 'URL'`);
      }

      if (callback !== void 0 && typeof callback !== 'function')
      {
         throw new TypeError(`'callback' is not a 'function'`);
      }

      // Convert basepath if an URL to a file path
      if (basepath instanceof URL)
      {
         basepath = url.fileURLToPath(basepath);
      }

      // Convert any URL or string file URL to path.
      if (filepath instanceof URL || filepath.startsWith('file:/'))
      {
         filepath = url.fileURLToPath(filepath);
      }

      // Handle `filepath` as a directory or get directory of path with file name.
      data.currentDirectory = fs.existsSync(filepath) && fs.lstatSync(filepath).isDirectory() ?
       path.resolve(filepath) : path.resolve(path.dirname(filepath));

      // Convert basepath to root of resolved file path if not a string.
      if (typeof basepath !== 'string')
      {
         basepath = path.parse(data.currentDirectory).root;
      }

      // Convert string file URL to path.
      if (basepath.startsWith('file:/'))
      {
         basepath = url.fileURLToPath(basepath);
      }

      // Handle `basepath` as a directory or convert a path with file name to a directory.
      data.baseDirectory = fs.existsSync(basepath) && fs.lstatSync(basepath).isDirectory() ? path.resolve(basepath) :
       path.resolve(path.dirname(basepath));

      // If the resolved paths do not exist then return null.
      if (!fs.existsSync(data.baseDirectory) || !fs.existsSync(data.currentDirectory))
      {
         throw new Error(`Could not resolve 'filepath' or 'basepath'`);
      }

      // Ensure we track the root of the current directory path to stop iteration.
      data.rootPath = path.parse(data.currentDirectory).root;

      data._callback = callback;

      return data;
   }
}

/**
 * @typedef {object} PackageObjData
 *
 * @property {object|undefined}  packageObj - Loaded `package.json` object.
 * @property {string|undefined}  packagePath - Path of loaded `package.json` object.
 * @property {Error|undefined}   error - An error instance.
 */

/**
 * Attempts to traverse from `filepath` to `basepath` attempting to load `package.json` along with the package path.
 *
 * Note: If malformed data is presented the result will undefined along with a possible error included in the returned
 * object / `PackageObjData`. Also note that a file may be specified that does not exist and the directory will be
 * resolved. If that directory exists then resolution will continue.
 *
 * @param {object}      options - An object.
 *
 * @param {string|URL}  options.filepath - Initial file or directory path to search for `package.json`.
 *
 * @param {string|URL}  [options.basepath] - Base path to stop traversing. Set to the root path of `filepath` if not
 *                                           provided.
 *
 * @param {Function}    [options.callback] - A function that evaluates any loaded package.json object that passes back a
 *                                           truthy value that stops or continues the traversal.
 *
 * @returns {PackageObjData} Loaded package.json / path or potentially an error.
 */
function getPackagePath(options)
{
   const isTraversalData = options instanceof TraversalData;

   const data = isTraversalData ? options : new TraversalData();

   try
   {
      if (!isTraversalData)
      {
         TraversalData.parse(data, options);
      }

      const context = {};

      do
      {
         data.packagePath = path.resolve(data.currentDirectory, 'package.json');

         // If there is a `package.json` path attempt to load it.
         if (fs.existsSync(data.packagePath))
         {
            data.packageObj = JSON.parse(fs.readFileSync(data.packagePath, 'utf-8'));

            // If it is a valid object then process it.
            if (typeof data.packageObj === 'object')
            {
               // If there is a provided callback then invoke it with the traversal data and if a truthy value is
               // returned then return the data; otherwise immediately return the loaded `package.json` object & path.
               if (typeof data._callback === 'function')
               {
                  if (data._callback.call(context, data))
                  {
                     return { packageObj: data.packageObj, packagePath: data.packagePath };
                  }
               }
               else
               {
                  return { packageObj: data.packageObj, packagePath: data.packagePath };
               }

               data.cntr++;
            }
         }

         // If the current directory equals the base directory then stop traversal.
         if (data.currentDirectory === data.baseDirectory) { break; }

      // If the current directory equals the root path then stop traversal.
      } while ((data.currentDirectory = path.dirname(data.currentDirectory)) !== data.rootPath);
   }
   catch (error)
   {
      return { packagePath: data.packagePath, error };
   }

   return { error: new Error(`No 'package.json' located`) };
}

/**
 * Attempts to traverse from `filepath` to `basepath` attempting to access `type` field of `package.json`. The type
 * is returned if it is set in the found `package.json` otherwise `commonjs` is returned.
 *
 * Note: With only `filepath` set this function only reliably returns a positive result when there are no
 * intermediary `package.json` files in between a supposed root and path. If provided with malformed
 * data or there is any error / edge case triggered then 'commonjs' by default will be returned.
 *
 * Another edge case is that traversal stops at the first valid `package.json` file and this may not contain a `type`
 * property whereas a `package.json` file in the root of the module may define it.
 *
 * However if you provide a `filepath` and a `basepath` that is a parent path giving a firm stopping point then a
 * proper resolution callback, `s_RESOLVE_TYPE`, is automatically added. Intermediary `package.json` files that
 * do not have an explicit `type` attribute set do not prevent traversal which continues until the `basepath` is
 * reached which is how Node.js actually resolves the `type` attribute.
 *
 * @param {object}      options - An object.
 *
 * @param {string|URL}  options.filepath - Initial file or directory path to search for `package.json`.
 *
 * @param {string|URL}  [options.basepath] - Base path to stop traversing. Set to the root path of `filepath` if not
 *                                           provided.
 *
 * @param {Function}    [options.callback] - A function that evaluates any loaded package.json object that passes back a
 *                                           truthy value that stops or continues the traversal.
 *
 * @returns {string} Type of package - 'module' for ESM otherwise 'commonjs'.
 */
function getPackageType(options)
{
   try
   {
      const data = TraversalData.parse(new TraversalData(), options);

      // Base directory is set and there is no callback set so add a proper resolution callback for package type.
      if (data.isBaseParent() && data._callback === void 0)
      {
         data._callback = s_RESOLVE_TYPE;
      }

      const result = getPackagePath(data);

      return typeof result.packageObj === 'object' ?
       result.packageObj.type === 'module' ? 'module' : 'commonjs' :
        'commonjs';
   }
   catch (error)
   {
      return 'commonjs';
   }
}

/**
 * Handles proper resolution of finding the parent `package.json` that has a type attribute set. You must set
 * `basepath` to provide a known stopping point.
 *
 * @param {TraversalData}  data - Current traversal state.
 *
 * @returns {boolean} If the package object contains a `type` attribute then stop traversal.
 */
const s_RESOLVE_TYPE = (data) => typeof data.packageObj.type === 'string';

/**
 * Regular expression used to split event strings.
 *
 * @type {RegExp}
 */
const eventSplitter = /\s+/;

/**
 * Iterates over the standard `event, callback` (as well as the fancy multiple space-separated events `"change blur",
 * callback` and jQuery-style event maps `{event: callback}`).
 *
 * @param {Function} iteratee    - Event operation to invoke.
 * @param {Events} events        - Events object
 * @param {string|object} name   - A single event name, compound event names, or a hash of event names.
 * @param {Function} callback    - Event callback function
 * @param {object}   opts        - Optional parameters
 * @returns {Events} Events object
 */
function eventsAPI(iteratee, events, name, callback, opts)
{
   let i = 0, names;
   if (name && typeof name === 'object')
   {
      // Handle event maps.
      if (callback !== void 0 && 'context' in opts && opts.context === void 0) { opts.context = callback; }
      for (names = objectKeys(name); i < names.length; i++)
      {
         events = eventsAPI(iteratee, events, names[i], name[names[i]], opts);
      }
   }
   else if (name && eventSplitter.test(name))
   {
      // Handle space-separated event names by delegating them individually.
      for (names = name.split(eventSplitter); i < names.length; i++)
      {
         events = iteratee(events, names[i], callback, opts);
      }
   }
   else
   {
      // Finally, standard events.
      events = iteratee(events, name, callback, opts);
   }
   return events;
}

/**
 * Provides  protected Object.keys functionality.
 *
 * @param {object}   object - Object to retrieve keys.
 *
 * @returns {string[]} Keys of object if any.
 */
const objectKeys = (object) =>
{
   return object === null || typeof object !== 'object' ? [] : Object.keys(object);
};

/**
 * Reduces the event callbacks into a map of `{event: beforeWrapper}`. `offer` unbinds the `beforeWrapper` after
 * it has been called the number of times specified by options.count.
 *
 * @param {Events}   map      - Events object
 * @param {string}   name     - Event name
 * @param {Function} callback - Event callback
 * @param {object}   options    - Function to invoke after event has been triggered once; `off()`
 * @returns {Events} The Events object.
 */
function beforeMap(map, name, callback, options)
{
   const offer = options.offer;
   const count = options.count + 1;

   if (callback)
   {
      const once = map[name] = s_BEFORE(count, function()
      {
         return callback.apply(this, arguments);
      }, () => { offer(name, once); });

      once._callback = callback;
   }
   return map;
}

/**
 * Creates a function that invokes `func`, with the `this` binding and arguments
 * of the created function, while it's called less than `n` times. Subsequent
 * calls to the created function return the result of the last `func` invocation.
 *
 * @since 3.0.0
 * @param {number} n The number of calls at which `func` is no longer invoked.
 * @param {Function} func The function to restrict.
 * @param {Function} after The function invoke after n number of calls.
 * @returns {Function} Returns the new restricted function.
 * @example
 *
 * jQuery(element).on('click', before(5, addContactToList))
 * // => Allows adding up to 4 contacts to the list.
 */
const s_BEFORE = function(n, func, after)
{
   let result;

   return function(...args)
   {
      if (--n > 0) { result = func.apply(this, args); }

      if (n <= 1)
      {
         if (after) { after.apply(this, args); }
         after = void 0;
         func = void 0;
      }

      return result;
   };
};

/**
 * @typedef {object} EventData The callback data for an event.
 *
 * @property {Function} callback - Callback function
 * @property {object} context -
 * @property {object} ctx -
 * @property {object} listening -
 */

/**
 * @typedef {object.<string, EventData[]>} Events Event data stored by event name.
 */

/**
 * EventbusProxy provides a protected proxy of another Eventbus instance.
 *
 * The main use case of EventbusProxy is to allow indirect access to an eventbus. This is handy when it comes to
 * managing the event lifecycle for a plugin system. When a plugin is added it could receive a callback, perhaps named
 * `onPluginLoaded`, which contains an EventbusProxy instance rather than the direct eventbus. This EventbusProxy
 * instance is associated in the management system controlling plugin lifecycle. When a plugin is removed / unloaded the
 * management system can automatically unregister all events for the plugin without requiring the plugin author doing it
 * correctly if they had full control. IE This allows to plugin system to guarantee no dangling listeners.
 *
 * EventbusProxy provides the on / off, once, and trigger methods with the same signatures as found in
 * Eventbus. However, the proxy tracks all added event bindings which is used to proxy between the target
 * eventbus which is passed in from the constructor. All registration methods (on / off / once) proxy. In addition
 * there is a `destroy` method which will unregister all of proxied events and remove references to the managed
 * eventbus. Any further usage of a destroyed EventbusProxy instance results in a ReferenceError thrown.
 *
 * Finally the EventbusProxy only allows events registered through it to be turned off providing a buffer between
 * any consumers such that they can not turn off other registrations made on the eventbus or other proxy instances.
 */
class EventbusProxy
{
   /**
    * Creates the event proxy with an existing instance of Eventbus.
    *
    * @param {Eventbus}   eventbus - The target eventbus instance.
    */
   constructor(eventbus)
   {
      /**
       * Stores the target eventbus.
       *
       * @type {Eventbus}
       * @private
       */
      this._eventbus = eventbus;

      /**
       * Stores all proxied event bindings.
       *
       * @type {Events}
       * @private
       */
      this._events = void 0;
   }

   /**
    * Just like `on`, but causes the bound callback to fire several times up to the count specified before being
    * removed. When multiple events are passed in using the space separated syntax, the event
    * will fire count times for every event you passed in, not once for a combination of all events.
    *
    * @param {number}         count    - Number of times the function will fire before being removed.
    * @param {string|object}  name     - Event name(s)
    * @param {Function}       callback - Event callback function
    * @param {object}         context  - Event context
    * @returns {EventbusProxy} This Eventbus instance.
    */
   before(count, name, callback, context = void 0)
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }
      if (!Number.isInteger(count)) { throw new TypeError(`'count' is not an integer`); }

      // Map the event into a `{event: once}` object.
      const events = eventsAPI(beforeMap, {}, name, callback, {
         count,
         offer: this.off.bind(this)
      });

      if (typeof name === 'string' && (context === null || context === void 0)) { callback = void 0; }

      return this.on(events, callback, context);
   }

   /**
    * Unregisters all proxied events from the target eventbus and removes any local references. All subsequent calls
    * after `destroy` has been called result in a ReferenceError thrown.
    */
   destroy()
   {
      if (this._eventbus !== null)
      {
         this.off();
      }

      this._events = void 0;

      this._eventbus = null;
   }

   /**
    * Iterates over all of events from the proxied eventbus yielding an array with event name, callback function, and
    * event context.
    *
    * @param {RegExp} [regex] Optional regular expression to filter event names.
    *
    * @yields
    */
   *entries(regex = void 0)
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }

      for (const entry of this._eventbus.entries(regex))
      {
         yield entry;
      }
   }

   /**
    * Returns the current proxied eventbus event count.
    *
    * @returns {number} Returns the current proxied event count.
    */
   get eventCount()
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }

      return this._eventbus.eventCount;
   }

   /**
    * Returns an iterable for the event names / keys of proxied eventbus event listeners.
    *
    * @param {RegExp} [regex] Optional regular expression to filter event names.
    *
    * @yields
    */
   *keys(regex = void 0)
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }

      for (const entry of this._eventbus.keys(regex))
      {
         yield entry;
      }
   }

   /**
    * Returns whether this EventbusProxy has already been destroyed.
    *
    * @returns {boolean} Is destroyed state.
    */
   get isDestroyed()
   {
      return this._eventbus === null;
   }

   /**
    * Returns the target eventbus name.
    *
    * @returns {string|*} The target eventbus name.
    */
   get name()
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }

      return this._eventbus.name;
   }

   /**
    * Remove a previously-bound proxied event binding.
    *
    * Please see {@link Eventbus#off}.
    *
    * @param {string}   [name]     - Event name(s)
    *
    * @param {Function} [callback] - Event callback function
    *
    * @param {object}   [context]  - Event context
    *
    * @returns {EventbusProxy} This EventbusProxy.
    */
   off(name = void 0, callback = void 0, context = void 0)
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }

      this._events = eventsAPI(s_OFF_API$1, this._events || {}, name, callback, {
         context,
         eventbus: this._eventbus
      });

      return this;
   }

   /**
    * Bind a callback function to an object. The callback will be invoked whenever the event is fired. If you have a
    * large number of different events on a page, the convention is to use colons to namespace them: "poll:start", or
    * "change:selection".
    *
    * This is proxied through `listenTo` of an internal Events instance instead of directly modifying the target
    * eventbus.
    *
    * Please see {@link Eventbus#on}.
    *
    * @param {string|object}  name     - Event name(s)
    * @param {Function}       callback - Event callback function
    * @param {object}         context  - Event context
    * @returns {EventbusProxy} This EventbusProxy.
    */
   on(name, callback, context = void 0)
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }

      // Handle the case of event maps and callback being the context.
      const targetContext = name !== null && typeof name === 'object' && callback ? callback : context || this;

      this._events = eventsAPI(s_ON_API$1, this._events || {}, name, callback, { context: targetContext });

      this._eventbus.on(name, callback, targetContext);

      return this;
   }

   /**
    * Just like `on`, but causes the bound callback to fire only once before being removed. Handy for saying "the next
    * time that X happens, do this". When multiple events are passed in using the space separated syntax, the event
    * will fire once for every event you passed in, not once for a combination of all events
    *
    * @see http://backbonejs.org/#Events-once
    *
    * @param {string}   name     - Event name(s)
    * @param {Function} callback - Event callback function
    * @param {object}   context  - Event context
    * @returns {EventbusProxy} This Eventbus instance.
    */
   once(name, callback, context = void 0)
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }

      // Map the event into a `{event: once}` object.
      const events = eventsAPI(beforeMap, {}, name, callback, {
         count: 1,
         offer: this.off.bind(this)
      });

      if (typeof name === 'string' && (context === null || context === void 0)) { callback = void 0; }

      return this.on(events, callback, context);
   }

   /**
    * Iterates over all stored proxy events yielding an array with event name, callback function, and event context.
    *
    * @param {RegExp} [regex] Optional regular expression to filter event names.
    *
    * @yields
    */
   *proxyEntries(regex = void 0)
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }
      if (regex !== void 0 && !(regex instanceof RegExp)) { throw new TypeError(`'regex' is not a RegExp`); }

      if (!this._events) { return; }

      if (regex)
      {
         for (const name in this._events)
         {
            if (regex.test(name))
            {
               for (const event of this._events[name])
               {
                  yield [name, event.callback, event.context];
               }
            }
         }
      }
      else
      {
         for (const name in this._events)
         {
            for (const event of this._events[name])
            {
               yield [name, event.callback, event.context];
            }
         }
      }
   }

   /**
    * Returns the current proxied event count.
    *
    * @returns {number} Returns the current proxied event count.
    */
   get proxyEventCount()
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }

      if (!this._events) { return 0; }

      let count = 0;

      for (const name in this._events) { count += this._events[name].length; }

      return count;
   }

   /**
    * Returns an iterable for the event names / keys of the locally proxied event listeners.
    *
    * @param {RegExp} [regex] Optional regular expression to filter event names.
    *
    * @yields
    */
   *proxyKeys(regex = void 0)
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }
      if (regex !== void 0 && !(regex instanceof RegExp)) { throw new TypeError(`'regex' is not a RegExp`); }

      if (!this._events) { return; }

      if (regex)
      {
         for (const name in this._events)
         {
            if (regex.test(name))
            {
               yield name;
            }
         }
      }
      else
      {
         for (const name in this._events)
         {
            yield name;
         }
      }
   }

   /**
    * Trigger callbacks for the given event, or space-delimited list of events. Subsequent arguments to trigger will be
    * passed along to the event callbacks.
    *
    * Please see {@link Eventbus#trigger}.
    *
    * @returns {EventbusProxy} This EventbusProxy.
    */
   trigger()
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }

      this._eventbus.trigger(...arguments);

      return this;
   }

   /**
    * Provides `trigger` functionality, but collects any returned Promises from invoked targets and returns a
    * single Promise generated by `Promise.resolve` for a single value or `Promise.all` for multiple results. This is
    * a very useful mechanism to invoke asynchronous operations over an eventbus.
    *
    * Please see {@link Eventbus#triggerAsync}.
    *
    * @returns {Promise} A Promise to returning any results.
    */
   triggerAsync()
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }

      return this._eventbus.triggerAsync(...arguments);
   }

   /**
    * Defers invoking `trigger`. This is useful for triggering events in the next clock tick.
    *
    * Please see {@link Eventbus#triggerDefer}.
    *
    * @returns {EventbusProxy} This EventbusProxy.
    */
   triggerDefer()
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }

      this._eventbus.triggerDefer(...arguments);

      return this;
   }

   /**
    * Provides `trigger` functionality, but collects any returned result or results from invoked targets as a single
    * value or in an array and passes it back to the callee in a synchronous manner.
    *
    * Please see {@link Eventbus#triggerSync}.
    *
    * @returns {*|Array.<*>} An Array of returned results.
    */
   triggerSync()
   {
      if (this._eventbus === null) { throw new ReferenceError('This EventbusProxy instance has been destroyed.'); }

      return this._eventbus.triggerSync(...arguments);
   }
}

/**
 * The reducing API that removes a callback from the `events` object.
 *
 * @param {Events}   events   - Events object
 * @param {string}   name     - Event name
 * @param {Function} callback - Event callback
 * @param {object}   options  - Optional parameters
 * @returns {void|Events} Events object
 */
const s_OFF_API$1 = (events, name, callback, options) =>
{
   /* c8 ignore next 1 */
   if (!events) { return; }

   const context = options.context;
   const eventbus = options.eventbus;

   const names = name ? [name] : objectKeys(events);

   for (let i = 0; i < names.length; i++)
   {
      name = names[i];
      const handlers = events[name];

      // Bail out if there are no events stored.
      if (!handlers) { break; }

      // Find any remaining events.
      const remaining = [];
      for (let j = 0; j < handlers.length; j++)
      {
         const handler = handlers[j];

         if (callback && callback !== handler.callback && callback !== handler.callback._callback ||
          context && context !== handler.context)
         {
            remaining.push(handler);
         }
      }

      // Replace events if there are any remaining.  Otherwise, clean up.
      if (remaining.length)
      {
         events[name] = remaining;
      }
      else
      {
         eventbus.off(name, callback, context);
         delete events[name];
      }
   }

   return events;
};

/**
 * The reducing API that adds a callback to the `events` object.
 *
 * @param {Events}   events   - Events object
 * @param {string}   name     - Event name
 * @param {Function} callback - Event callback
 * @param {object}   options  - Optional parameters
 * @returns {Events} Events object.
 */
const s_ON_API$1 = (events, name, callback, options) =>
{
   if (callback)
   {
      const handlers = events[name] || (events[name] = []);
      const context = options.context;

      handlers.push({ callback, context });
   }

   return events;
};

/**
 * @typedef {object} EventData The callback data for an event.
 *
 * @property {Function} callback - Callback function
 * @property {object} context -
 * @property {object} ctx -
 * @property {object} listening -
 */

/**
 * @typedef {object.<string, EventData[]>} Events Event data stored by event name.
 */

/**
 * `@typhonjs-plugin/eventbus` / Provides the ability to bind and trigger custom named events.
 *
 * This module is an evolution of Backbone Events. (http://backbonejs.org/#Events). Eventbus extends the
 * functionality provided in Backbone Events with additional triggering methods to receive asynchronous and
 * synchronous results.
 *
 * ---------------
 */
class Eventbus
{
   /**
    * Provides a constructor which optionally takes the eventbus name.
    *
    * @param {string}   eventbusName - Optional eventbus name.
    */
   constructor(eventbusName = void 0)
   {
      /**
       * Stores the name of this eventbus.
       *
       * @type {string}
       * @private
       */
      this._eventbusName = eventbusName;

      /**
       * @type {Events}
       * @private
       */
      this._events = void 0;

      /**
       * @type {Listeners}
       * @private
       */
      this._listeners = void 0;
   }

   /**
    * Just like `on`, but causes the bound callback to fire several times up to the count specified before being
    * removed. When multiple events are passed in using the space separated syntax, the event
    * will fire count times for every event you passed in, not once for a combination of all events.
    *
    * @param {number}         count    - Number of times the function will fire before being removed.
    * @param {string|object}  name     - Event name(s)
    * @param {Function}       callback - Event callback function
    * @param {object}         context  - Event context
    * @returns {Eventbus} This Eventbus instance.
    */
   before(count, name, callback, context = void 0)
   {
      if (!Number.isInteger(count)) { throw new TypeError(`'count' is not an integer`); }

      // Map the event into a `{event: once}` object.
      const events = eventsAPI(beforeMap, {}, name, callback, {
         count,
         offer: this.off.bind(this)
      });

      if (typeof name === 'string' && (context === null || context === void 0)) { callback = void 0; }

      return this.on(events, callback, context);
   }

   /**
    * Creates an EventProxy wrapping this events instance. An EventProxy proxies events allowing all listeners added
    * to be easily removed from the wrapped Events instance.
    *
    * @returns {EventbusProxy} A new EventbusProxy for this eventbus.
    */
   createProxy()
   {
      return new EventbusProxy(this);
   }

   /**
    * Iterates over all stored events yielding an array with event name, callback function, and event context.
    *
    * @param {RegExp} [regex] Optional regular expression to filter event names.
    *
    * @yields
    */
   *entries(regex = void 0)
   {
      if (regex !== void 0 && !(regex instanceof RegExp)) { throw new TypeError(`'regex' is not a RegExp`); }

      if (!this._events) { return; }

      if (regex)
      {
         for (const name in this._events)
         {
            if (regex.test(name))
            {
               for (const event of this._events[name])
               {
                  yield [name, event.callback, event.ctx];
               }
            }
         }
      }
      else
      {
         for (const name in this._events)
         {
            for (const event of this._events[name])
            {
               yield [name, event.callback, event.ctx];
            }
         }
      }
   }

   /**
    * Returns the current event count.
    *
    * @returns {number} The current proxied event count.
    */
   get eventCount()
   {
      if (!this._events) { return 0; }

      let count = 0;

      for (const name in this._events) { count += this._events[name].length; }

      return count;
   }

   /**
    * Returns an iterable for the event names / keys of registered event listeners.
    *
    * @param {RegExp} [regex] Optional regular expression to filter event names.
    *
    * @yields
    */
   *keys(regex = void 0)
   {
      if (regex !== void 0 && !(regex instanceof RegExp)) { throw new TypeError(`'regex' is not a RegExp`); }

      if (!this._events) { return; }

      if (regex)
      {
         for (const name in this._events)
         {
            if (regex.test(name))
            {
               yield name;
            }
         }
      }
      else
      {
         for (const name in this._events)
         {
            yield name;
         }
      }
   }

   /**
    * Returns the current eventbus name.
    *
    * @returns {string|*} The current eventbus name.
    */
   get name()
   {
      return this._eventbusName;
   }

   /**
    * Tell an object to listen to a particular event on an other object. The advantage of using this form, instead of
    * other.on(event, callback, object), is that listenTo allows the object to keep track of the events, and they can
    * be removed all at once later on. The callback will always be called with object as context.
    *
    * @example
    * view.listenTo(model, 'change', view.render);
    *
    * @see http://backbonejs.org/#Events-listenTo
    *
    * @param {object}   obj         - Event context
    * @param {string}   name        - Event name(s)
    * @param {Function} callback    - Event callback function
    * @returns {Eventbus} This Eventbus instance.
    */
   listenTo(obj, name, callback)
   {
      if (!obj) { return this; }
      const id = obj._listenId || (obj._listenId = s_UNIQUE_ID('l'));
      const listeningTo = this._listeningTo || (this._listeningTo = {});
      let listening = _listening = listeningTo[id];

      // This object is not listening to any other events on `obj` yet.
      // Setup the necessary references to track the listening callbacks.
      if (!listening)
      {
         this._listenId || (this._listenId = s_UNIQUE_ID('l'));
         listening = _listening = listeningTo[id] = new Listening(this, obj);
      }

      // Bind callbacks on obj.
      const error = s_TRY_CATCH_ON(obj, name, callback, this);
      _listening = void 0;

      if (error) { throw error; }

      // If the target obj is not Backbone.Events, track events manually.
      if (listening.interop) { listening.on(name, callback); }

      return this;
   }

   /**
    * Just like `listenTo`, but causes the bound callback to fire only once before being removed.
    *
    * @param {number}         count    - Number of times the function will fire before being removed.
    * @param {object}         obj      - Event context
    * @param {string|object}  name     - Event name(s)
    * @param {Function}       callback - Event callback function
    * @returns {Eventbus} This Eventbus instance.
    */
   listenToBefore(count, obj, name, callback)
   {
      if (!Number.isInteger(count)) { throw new TypeError(`'count' is not an integer`); }

      // Map the event into a `{event: once}` object.
      const events = eventsAPI(beforeMap, {}, name, callback, {
         count,
         offer: this.stopListening.bind(this, obj)
      });

      return this.listenTo(obj, events);
   }

   /**
    * Just like `listenTo`, but causes the bound callback to fire only once before being removed.
    *
    * @see http://backbonejs.org/#Events-listenToOnce
    *
    * @param {object}         obj      - Event context
    * @param {string|object}  name     - Event name(s)
    * @param {Function}       callback - Event callback function
    * @returns {Eventbus} This Eventbus instance.
    */
   listenToOnce(obj, name, callback)
   {
      // Map the event into a `{event: once}` object.
      const events = eventsAPI(beforeMap, {}, name, callback, {
         count: 1,
         offer: this.stopListening.bind(this, obj)
      });

      return this.listenTo(obj, events);
   }

   /**
    * Remove a previously-bound callback function from an object. If no context is specified, all of the versions of
    * the callback with different contexts will be removed. If no callback is specified, all callbacks for the event
    * will be removed. If no event is specified, callbacks for all events will be removed.
    *
    * Note that calling model.off(), for example, will indeed remove all events on the model — including events that
    * Backbone uses for internal bookkeeping.
    *
    * @example
    * // Removes just the `onChange` callback.
    * object.off("change", onChange);
    *
    * // Removes all "change" callbacks.
    * object.off("change");
    *
    * // Removes the `onChange` callback for all events.
    * object.off(null, onChange);
    *
    * // Removes all callbacks for `context` for all events.
    * object.off(null, null, context);
    *
    * // Removes all callbacks on `object`.
    * object.off();
    *
    * @see http://backbonejs.org/#Events-off
    *
    * @param {string|object}  [name]     - Event name(s)
    * @param {Function}       [callback] - Event callback function
    * @param {object}         [context]  - Event context
    * @returns {Eventbus} This Eventbus instance.
    */
   off(name, callback = void 0, context = void 0)
   {
      if (!this._events) { return this; }

      this._events = eventsAPI(s_OFF_API, this._events, name, callback, { context, listeners: this._listeners });

      return this;
   }

   /**
    * Bind a callback function to an object. The callback will be invoked whenever the event is fired. If you have a
    * large number of different events on a page, the convention is to use colons to namespace them: "poll:start", or
    * "change:selection".
    *
    * To supply a context value for this when the callback is invoked, pass the optional last argument:
    * model.on('change', this.render, this) or model.on({change: this.render}, this).
    *
    * @example
    * The event string may also be a space-delimited list of several events...
    * book.on("change:title change:author", ...);
    *
    * @example
    * Callbacks bound to the special "all" event will be triggered when any event occurs, and are passed the name of
    * the event as the first argument. For example, to proxy all events from one object to another:
    * proxy.on("all", function(eventName) {
    *    object.trigger(eventName);
    * });
    *
    * @example
    * All Backbone event methods also support an event map syntax, as an alternative to positional arguments:
    * book.on({
    *    "change:author": authorPane.update,
    *    "change:title change:subtitle": titleView.update,
    *    "destroy": bookView.remove
    * });
    *
    * @see http://backbonejs.org/#Events-on
    *
    * @param {string|object}  name     - Event name(s)
    * @param {Function}       callback - Event callback function
    * @param {object}         [context]  - Event context
    * @returns {Eventbus} This Eventbus instance.
    */
   on(name, callback, context = void 0)
   {
      this._events = eventsAPI(s_ON_API, this._events || {}, name, callback,
      {
         context,
         ctx: this,
         listening: _listening
      });

      if (_listening)
      {
         const listeners = this._listeners || (this._listeners = {});
         listeners[_listening.id] = _listening;

         // Allow the listening to use a counter, instead of tracking callbacks for library interop.
         _listening.interop = false;
      }

      return this;
   }

   /**
    * Just like `on`, but causes the bound callback to fire only once before being removed. Handy for saying "the next
    * time that X happens, do this". When multiple events are passed in using the space separated syntax, the event
    * will fire once for every event you passed in, not once for a combination of all events
    *
    * @see http://backbonejs.org/#Events-once
    *
    * @param {string|object}  name     - Event name(s)
    * @param {Function}       callback - Event callback function
    * @param {object}         [context]  - Event context
    * @returns {Eventbus} This Eventbus instance.
    */
   once(name, callback, context = void 0)
   {
      // Map the event into a `{event: once}` object.
      const events = eventsAPI(beforeMap, {}, name, callback, {
         count: 1,
         offer: this.off.bind(this)
      });

      if (typeof name === 'string' && (context === null || context === void 0)) { callback = void 0; }

      return this.on(events, callback, context);
   }

   /**
    * Tell an object to stop listening to events. Either call stopListening with no arguments to have the object remove
    * all of its registered callbacks ... or be more precise by telling it to remove just the events it's listening to
    * on a specific object, or a specific event, or just a specific callback.
    *
    * @example
    * view.stopListening();
    *
    * view.stopListening(model);
    *
    * @see http://backbonejs.org/#Events-stopListening
    *
    * @param {object}   obj            - Event context
    * @param {string}   name           - Event name(s)
    * @param {Function} callback       - Event callback function
    * @returns {Eventbus} This Eventbus instance.
    */
   stopListening(obj, name = void 0, callback = void 0)
   {
      const listeningTo = this._listeningTo;
      if (!listeningTo) { return this; }

      const ids = obj ? [obj._listenId] : objectKeys(listeningTo);

      for (let i = 0; i < ids.length; i++)
      {
         const listening = listeningTo[ids[i]];

         // If listening doesn't exist, this object is not currently listening to obj. Break out early.
         if (!listening) { break; }

         listening.obj.off(name, callback, this);

         if (listening.interop) { listening.off(name, callback); }
      }

      return this;
   }

   /**
    * Trigger callbacks for the given event, or space-delimited list of events. Subsequent arguments to trigger will be
    * passed along to the event callbacks.
    *
    * @see http://backbonejs.org/#Events-trigger
    *
    * @param {string}   name  - Event name(s)
    * @returns {Eventbus} This Eventbus instance.
    */
   trigger(name)
   {
      if (!this._events) { return this; }

      const length = Math.max(0, arguments.length - 1);
      const args = new Array(length);

      for (let i = 0; i < length; i++) { args[i] = arguments[i + 1]; }

      s_RESULTS_TARGET_API(s_TRIGGER_API, s_TRIGGER_EVENTS, this._events, name, void 0, args);

      return this;
   }

   /**
    * Provides `trigger` functionality, but collects any returned Promises from invoked targets and returns a
    * single Promise generated by `Promise.resolve` for a single value or `Promise.all` for multiple results. This is
    * a very useful mechanism to invoke asynchronous operations over an eventbus.
    *
    * @param {string}   name  - Event name(s)
    * @returns {Promise<void|*|*[]>} A Promise with any results.
    */
   async triggerAsync(name)
   {
      if (!this._events) { return void 0; }

      const length = Math.max(0, arguments.length - 1);
      const args = new Array(length);
      for (let i = 0; i < length; i++) { args[i] = arguments[i + 1]; }

      const result = s_RESULTS_TARGET_API(s_TRIGGER_API, s_TRIGGER_ASYNC_EVENTS, this._events, name, void 0, args);

      // No event callbacks were triggered.
      if (result === void 0) { return void 0; }

      // A single Promise has been returned; just return it.
      if (!Array.isArray(result)) { return result; }

      // Multiple events & callbacks have been triggered so reduce the returned array of Promises and filter all
      // values from each Promise result removing any undefined values.
      return Promise.all(result).then((results) =>
      {
         let allResults = [];

         for (const pResult of results)
         {
            if (Array.isArray(pResult))
            {
               allResults = allResults.concat(pResult);
            }
            else if (pResult !== void 0)
            {
               allResults.push(pResult);
            }
         }

         return allResults.length > 1 ? allResults : allResults.length === 1 ? allResults[0] : void 0;
      });
   }

   /**
    * Defers invoking `trigger`. This is useful for triggering events in the next clock tick.
    *
    * @returns {Eventbus} This Eventbus instance.
    */
   triggerDefer()
   {
      setTimeout(() => { this.trigger(...arguments); }, 0);

      return this;
   }

   /**
    * Provides `trigger` functionality, but collects any returned result or results from invoked targets as a single
    * value or in an array and passes it back to the callee in a synchronous manner.
    *
    * @param {string}   name  - Event name(s)
    * @returns {void|*|*[]} The results of the event invocation.
    */
   triggerSync(name)
   {
      if (!this._events) { return void 0; }

      const start = 1;
      const length = Math.max(0, arguments.length - 1);
      const args = new Array(length);
      for (let i = 0; i < length; i++) { args[i] = arguments[i + start]; }

      return s_RESULTS_TARGET_API(s_TRIGGER_API, s_TRIGGER_SYNC_EVENTS, this._events, name, void 0, args);
   }
}

// Private / internal methods ---------------------------------------------------------------------------------------

/**
 * Global listening object
 *
 * @type {Listening}
 */
let _listening;

/**
 * A listening class that tracks and cleans up memory bindings when all callbacks have been offed.
 */
class Listening
{
   constructor(listener, obj)
   {
      this.id = listener._listenId;
      this.listener = listener;
      this.obj = obj;
      this.interop = true;
      this.count = 0;
      this._events = void 0;
   }

   // Cleans up memory bindings between the listener and the listenee.
   cleanup()
   {
      delete this.listener._listeningTo[this.obj._listenId];
      if (!this.interop) { delete this.obj._listeners[this.id]; }
   }

   /**
    * @see {@link Eventbus#on}
    *
    * @param {string|object}  name     - Event name(s)
    * @param {Function}       callback - Event callback function
    * @param {object}         [context] - Event context
    * @returns {Listening} This Listening instance.
    */
   on(name, callback, context = void 0)
   {
      this._events = eventsAPI(s_ON_API, this._events || {}, name, callback,
      {
         context,
         ctx: this,
         listening: this
      });

      return this;
   }

   // Offs a callback (or several).
   // Uses an optimized counter if the listenee uses Backbone.Events.
   // Otherwise, falls back to manual tracking to support events
   // library interop.
   off(name, callback)
   {
      let cleanup;

      if (this.interop)
      {
         this._events = eventsAPI(s_OFF_API, this._events, name, callback, {
            context: void 0,
            listeners: void 0
         });
         cleanup = !this._events;
      }
      else
      {
         this.count--;
         cleanup = this.count === 0;
      }

      if (cleanup) { this.cleanup(); }
   }
}

/**
 * The reducing API that removes a callback from the `events` object.
 *
 * @param {Events}   events   - Events object
 * @param {string}   name     - Event name
 * @param {Function} callback - Event callback
 * @param {object}   options  - Optional parameters
 * @returns {void|Events} Events object
 */
const s_OFF_API = (events, name, callback, options) =>
{
   /* c8 ignore next 1 */
   if (!events) { return; }

   const context = options.context, listeners = options.listeners;
   let i = 0, names;

   // Delete all event listeners and "drop" events.
   if (!name && !context && !callback)
   {
      for (names = objectKeys(listeners); i < names.length; i++)
      {
         listeners[names[i]].cleanup();
      }
      return;
   }

   names = name ? [name] : objectKeys(events);

   for (; i < names.length; i++)
   {
      name = names[i];
      const handlers = events[name];

      // Bail out if there are no events stored.
      if (!handlers) { break; }

      // Find any remaining events.
      const remaining = [];
      for (let j = 0; j < handlers.length; j++)
      {
         const handler = handlers[j];
         if (callback && callback !== handler.callback && callback !== handler.callback._callback ||
          context && context !== handler.context)
         {
            remaining.push(handler);
         }
         else
         {
            const listening = handler.listening;
            if (listening) { listening.off(name, callback); }
         }
      }

      // Replace events if there are any remaining.  Otherwise, clean up.
      if (remaining.length)
      {
         events[name] = remaining;
      }
      else
      {
         delete events[name];
      }
   }

   return events;
};

/**
 * The reducing API that adds a callback to the `events` object.
 *
 * @param {Events}   events   - Events object
 * @param {string}   name     - Event name
 * @param {Function} callback - Event callback
 * @param {object}   options  - Optional parameters
 * @returns {Events} Events object.
 */
const s_ON_API = (events, name, callback, options) =>
{
   if (callback)
   {
      const handlers = events[name] || (events[name] = []);
      const context = options.context, ctx = options.ctx, listening = options.listening;

      if (listening) { listening.count++; }

      handlers.push({ callback, context, ctx: context || ctx, listening });
   }
   return events;
};

/**
 * Iterates over the standard `event, callback` (as well as the fancy multiple space-separated events `"change blur",
 * callback` and jQuery-style event maps `{event: callback}`).
 *
 * @param {Function} iteratee       - Trigger API
 * @param {Function} iterateeTarget - Internal function which is dispatched to.
 * @param {Events}   events         - Array of stored event callback data.
 * @param {string}   name           - Event name(s)
 * @param {Function} callback       - callback
 * @param {object}   opts           - Optional parameters
 * @returns {*} The results of the callback if any.
 */
const s_RESULTS_TARGET_API = (iteratee, iterateeTarget, events, name, callback, opts) =>
{
   let results = void 0;
   let i = 0, names;

   // Handle the case of multiple events being triggered. The potential results of each event & callbacks must be
   // processed into a single array of results.
   if (name && eventSplitter.test(name))
   {
      // Handle space-separated event names by delegating them individually.
      for (names = name.split(eventSplitter); i < names.length; i++)
      {
         const result = iteratee(iterateeTarget, events, names[i], callback, opts);

         // Determine type of `results`; 0: undefined, 1: single value, 2: an array of values.
         const resultsType = Array.isArray(results) ? 2 : results !== void 0 ? 1 : 0;

         // Handle an array result depending on existing results value.
         if (Array.isArray(result))
         {
            switch (resultsType)
            {
               case 0:
                  // Simply set results.
                  results = result;
                  break;
               case 1:
                  // Create a new array from existing results then concat the new result array.
                  results = [results].concat(result);
                  break;
               case 2:
                  // `results` is already an array so concat the new result array.
                  results = results.concat(result);
                  break;
            }
         }
         else if (result !== void 0)
         {
            switch (resultsType)
            {
               case 0:
                  // Simply set results.
                  results = result;
                  break;
               case 1: {
                  // Create a new array from existing results then push the new result value.
                  const newArray = [results];
                  newArray.push(result);
                  results = newArray;
                  break;
               }
               case 2:
                  // `results` is already an array so push the new result array.
                  results.push(result);
                  break;
            }
         }
      }
   }
   else
   {
      // Just single event.
      results = iteratee(iterateeTarget, events, name, callback, opts);
   }

   return results;
};

/**
 * Handles triggering the appropriate event callbacks.
 *
 * @param {Function} iterateeTarget - Internal function which is dispatched to.
 * @param {Events}   objEvents      - Array of stored event callback data.
 * @param {string}   name           - Event name(s)
 * @param {Function} callback       - callback
 * @param {*[]}      args           - Arguments supplied to a trigger method.
 * @returns {*} The results from the triggered event.
 */
const s_TRIGGER_API = (iterateeTarget, objEvents, name, callback, args) =>
{
   let result;

   if (objEvents)
   {
      const events = objEvents[name];
      let allEvents = objEvents.all;
      if (events && allEvents) { allEvents = allEvents.slice(); }
      if (events) { result = iterateeTarget(events, args); }
      if (allEvents) { result = iterateeTarget(allEvents, [name].concat(args)); }
   }

   return result;
};

/**
 * A difficult-to-believe, but optimized internal dispatch function for triggering events. Tries to keep the usual
 * cases speedy (most internal Backbone events have 3 arguments).
 *
 * @param {EventData[]}  events - Array of stored event callback data.
 * @param {*[]} args - event argument array
 */
const s_TRIGGER_EVENTS = (events, args) =>
{
   let ev, i = -1;
   const a1 = args[0], a2 = args[1], a3 = args[2], l = events.length;

   switch (args.length)
   {
      case 0:
         while (++i < l) { (ev = events[i]).callback.call(ev.ctx); }
         return;
      case 1:
         while (++i < l) { (ev = events[i]).callback.call(ev.ctx, a1); }
         return;
      case 2:
         while (++i < l) { (ev = events[i]).callback.call(ev.ctx, a1, a2); }
         return;
      case 3:
         while (++i < l) { (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); }
         return;
      default:
         while (++i < l) { (ev = events[i]).callback.apply(ev.ctx, args); }
         return;
   }
};

/**
 * A difficult-to-believe, but optimized internal dispatch function for triggering events. Tries to keep the usual
 * cases speedy (most internal Backbone events have 3 arguments). This dispatch method uses ES6 Promises and adds
 * any returned results to an array which is added to a Promise.all construction which passes back a Promise which
 * waits until all Promises complete. Any target invoked may return a Promise or any result. This is very useful to
 * use for any asynchronous operations.
 *
 * @param {EventData[]} events   - Array of stored event callback data.
 * @param {*[]}         args     - Arguments supplied to `triggerAsync`.
 * @returns {Promise<void|*|*[]>} A Promise of the results from the triggered event.
 */
const s_TRIGGER_ASYNC_EVENTS = async (events, args) =>
{
   let ev, i = -1;
   const a1 = args[0], a2 = args[1], a3 = args[2], l = events.length;

   const results = [];

   try
   {
      switch (args.length)
      {
         case 0:
            while (++i < l)
            {
               const result = (ev = events[i]).callback.call(ev.ctx);

               // If we received a valid result add it to the promises array.
               if (result !== void 0) { results.push(result); }
            }
            break;

         case 1:
            while (++i < l)
            {
               const result = (ev = events[i]).callback.call(ev.ctx, a1);

               // If we received a valid result add it to the promises array.
               if (result !== void 0) { results.push(result); }
            }
            break;

         case 2:
            while (++i < l)
            {
               const result = (ev = events[i]).callback.call(ev.ctx, a1, a2);

               // If we received a valid result add it to the promises array.
               if (result !== void 0) { results.push(result); }
            }
            break;

         case 3:
            while (++i < l)
            {
               const result = (ev = events[i]).callback.call(ev.ctx, a1, a2, a3);

               // If we received a valid result add it to the promises array.
               if (result !== void 0) { results.push(result); }
            }
            break;

         default:
            while (++i < l)
            {
               const result = (ev = events[i]).callback.apply(ev.ctx, args);

               // If we received a valid result add it to the promises array.
               if (result !== void 0) { results.push(result); }
            }
            break;
      }
   }
   catch (error) // will catch synchronous event binding errors and reject again async errors.
   {
      return Promise.reject(error);
   }

   // If there are multiple results then use Promise.all otherwise Promise.resolve. Filter out any undefined results.
   return results.length > 1 ? Promise.all(results).then((values) =>
   {
      const filtered = values.filter((entry) => entry !== void 0);
      switch (filtered.length)
      {
         case 0: return void 0;
         case 1: return filtered[0];
         default: return filtered;
      }
   }) : results.length === 1 ? Promise.resolve(results[0]) : Promise.resolve();
};

/**
 * A difficult-to-believe, but optimized internal dispatch function for triggering events. Tries to keep the usual
 * cases speedy (most internal Backbone events have 3 arguments). This dispatch method synchronously passes back a
 * single value or an array with all results returned by any invoked targets.
 *
 * @param {EventData[]} events   - Array of stored event callback data.
 * @param {*[]}         args     - Arguments supplied to `triggerSync`.
 * @returns {void|*|*[]} The results from the triggered event.
 */
const s_TRIGGER_SYNC_EVENTS = (events, args) =>
{
   let ev, i = -1;
   const a1 = args[0], a2 = args[1], a3 = args[2], l = events.length;

   const results = [];

   switch (args.length)
   {
      case 0:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.call(ev.ctx);

            // If we received a valid result return immediately.
            if (result !== void 0) { results.push(result); }
         }
         break;
      case 1:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.call(ev.ctx, a1);

            // If we received a valid result return immediately.
            if (result !== void 0) { results.push(result); }
         }
         break;
      case 2:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.call(ev.ctx, a1, a2);

            // If we received a valid result return immediately.
            if (result !== void 0) { results.push(result); }
         }
         break;
      case 3:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.call(ev.ctx, a1, a2, a3);

            // If we received a valid result return immediately.
            if (result !== void 0) { results.push(result); }
         }
         break;
      default:
         while (++i < l)
         {
            const result = (ev = events[i]).callback.apply(ev.ctx, args);

            // If we received a valid result return immediately.
            if (result !== void 0) { results.push(result); }
         }
         break;
   }

   // Return the results array if there are more than one or just a single result.
   return results.length > 1 ? results : results.length === 1 ? results[0] : void 0;
};

/**
 * A try-catch guarded #on function, to prevent poisoning the global `_listening` variable.
 *
 * @param {Eventbus} obj -
 * @param {string}   name -
 * @param {Function} callback -
 * @param {object}   context -
 *
 * @returns {Error} Any error if thrown.
 */
const s_TRY_CATCH_ON = (obj, name, callback, context) =>
{
   try
   {
      obj.on(name, callback, context);
   }
   catch (err)
   {
      return err;
   }
};

/**
 * Generate a unique integer ID (unique within the entire client session).
 *
 * @type {number} - unique ID counter.
 */
let idCounter = 0;

/**
 * Creates a new unique ID with a given prefix
 *
 * @param {string}   prefix - An optional prefix to add to unique ID.
 * @returns {string} A new unique ID with a given prefix.
 */
const s_UNIQUE_ID = (prefix = '') =>
{
   const id = `${++idCounter}`;
   return prefix ? `${prefix}${id}` /* c8 ignore next */ : id;
};

/**
 * @typedef {object} EventData The callback data for an event.
 *
 * @property {Function} callback - Callback function
 * @property {object} context -
 * @property {object} ctx -
 * @property {object} listening -
 */

/**
 * @typedef {object.<string, EventData[]>} Events Event data stored by event name.
 */

/**
 * @typedef {object} ListeningData The listening to data for a particular object.
 *
 * @property {object} obj -
 * @property {string} objId -
 * @property {string} id -
 * @property {object} listeningTo -
 * @property {number} count -
 */

/**
 * @typedef {object.<string, ListeningData[]>} Listeners All listener data stored by id.
 */

/**
 * Provides common object manipulation utilities including depth traversal, obtaining accessors, safely setting values /
 * equality tests, and validation.
 *
 * Support for typhonjs-plugin-manager is enabled.
 */

/**
 * @typedef {object} ValidationEntry - Provides data for a validation check.
 *
 * @property {string}               [type] - Optionally tests with a typeof check.
 *
 * @property {Array<*>|Function|Set<*>}  [expected] - Optional array, function, or set of expected values to test
 * against.
 *
 * @property {string}               [message] - Optional message to include.
 *
 * @property {boolean}              [required=true] - When false if the accessor is missing validation is skipped.
 *
 * @property {boolean}              [error=true] - When true and error is thrown otherwise a boolean is returned.
 */

/**
 * Freezes all entries traversed that are objects including entries in arrays.
 *
 * @param {object|Array}   data - An object or array.
 *
 * @param {string[]}       skipFreezeKeys - An array of strings indicating keys of objects to not freeze.
 *
 * @returns {object|Array} The frozen object.
 */
function deepFreeze(data, skipFreezeKeys = [])
{
   /* istanbul ignore if */
   if (typeof data !== 'object') { throw new TypeError(`'data' is not an 'object'.`); }

   /* istanbul ignore if */
   if (!Array.isArray(skipFreezeKeys)) { throw new TypeError(`'skipFreezeKeys' is not an 'array'.`); }

   return _deepFreeze(data, skipFreezeKeys);
}

/**
 * Tests for whether an object is iterable.
 *
 * @param {object} object - An object.
 *
 * @returns {boolean} Whether object is iterable.
 */
function isIterable(object)
{
   if (object === null || object === void 0 || typeof object !== 'object') { return false; }

   return typeof object[Symbol.iterator] === 'function';
}

// Module private ---------------------------------------------------------------------------------------------------

/**
 * Private implementation of depth traversal.
 *
 * @param {object|Array}   data - An object or array.
 *
 * @param {string[]}       skipFreezeKeys - An array of strings indicating keys of objects to not freeze.
 *
 * @returns {*} The frozen object.
 * @ignore
 * @private
 */
function _deepFreeze(data, skipFreezeKeys)
{
   if (Array.isArray(data))
   {
      for (let cntr = 0; cntr < data.length; cntr++) { _deepFreeze(data[cntr], skipFreezeKeys); }
   }
   else if (typeof data === 'object')
   {
      for (const key in data)
      {
         // eslint-disable-next-line no-prototype-builtins
         if (data.hasOwnProperty(key) && skipFreezeKeys.indexOf(key) === -1) { _deepFreeze(data[key], skipFreezeKeys); }
      }
   }

   return Object.freeze(data);
}

/**
 * Defines a class holding the data associated with a plugin including its instance.
 */
class PluginEntry
{
   /**
    * Instantiates a PluginEntry.
    *
    * @param {string}      name - The plugin name.
    *
    * @param {PluginData}  data -  describing the plugin, manager, and optional module data.
    *
    * @param {object}      instance - The loaded plugin instance.
    *
    * @param {EventbusProxy}  eventbusProxy - An EventProxy associated with the plugin wrapping the plugin manager
    * eventbus.
    */
   constructor(name, data, instance, eventbusProxy = void 0)
   {
      /**
       * Data describing the plugin, manager, and optional module data.
       *
       * @type {PluginData}
       * @private
       */
      this._data = data;

      /**
       * The plugin enabled state.
       *
       * @type {boolean}
       * @private
       */
      this._enabled = true;

      /**
       * The plugin name.
       *
       * @type {string}
       * @private
       */
      this._name = name;

      /**
       * The loaded plugin instance.
       *
       * @type {object}
       * @private
       */
      this._instance = instance;

      /**
       * An EventbusProxy associated with the plugin wrapping the plugin manager eventbus.
       *
       * @type {EventbusProxy}
       * @private
       */
      this._eventbusProxy = eventbusProxy;
   }

   /**
    * Provides a convenience method to escape file paths.
    *
    * @param {string}   value - A string to escape.
    *
    * @returns {string} An escaped string.
    */
   static escape(value)
   {
      if (typeof value !== 'string') { throw new TypeError(`'value' is not a string.`); }

      // Remove any leading relative directory paths.
      let escaped = value.replace(/^(\.\.|\.)/, '');

      // Escape any forward / reverse slashes for RegExp creation.
      escaped = escaped.replace(/[\\]/g, '\\');
      escaped = escaped.replace(/[/]/g, '\\/');

      return escaped;
   }

   /**
    * Get plugin data.
    *
    * @returns {PluginData} The associated PluginData.
    */
   get data() { return this._data; }

   /**
    * Get enabled.
    *
    * @returns {boolean} Current enabled state.
    */
   get enabled() { return this._enabled; }

   /**
    * Set enabled.
    *
    * @param {boolean} enabled - New enabled state.
    */
   set enabled(enabled)
   {
      /**
       * The plugin enabled state.
       *
       * @type {boolean}
       * @private
       */
      this._enabled = enabled;
   }

   /**
    * Get associated EventbusProxy.
    *
    * @returns {EventbusProxy} Associated EventbusProxy.
    */
   get eventbusProxy() { return this._eventbusProxy; }

   /**
    * Get plugin instance.
    *
    * @returns {object} The plugin instance.
    */
   get instance() { return this._instance; }

   /**
    * Get plugin name.
    *
    * @returns {string} Plugin name.
    */
   get name() { return this._name; }
}

/**
 * @typedef {object} PluginData
 *
 * @property {object}   manager - Data about the plugin manager
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
 *                               path or relative to current working directory to load.
 *
 * @property {string}   plugin.targetEscaped - Provides the target, but properly escaped for RegExp usage.
 *
 * @property {string}   plugin.type - The type of plugin: `instance` +
 *                                    In Node: `import-module`, `import-path`, `require-module`, or `require-path`.
 *                                    In Browser: `import-path`, `import-url`.
 *
 * @property {object}   plugin.options - Defines an object of options for the plugin.
 */

/**
 * PluginEvent - Provides the data / event passed to all invoked methods in
 * {@link AbstractPluginManager#invokeSyncEvent}. The `event.data` field is returned to the caller. Before returning
 * though additional the following additional metadata is attached:
 *
 * (number)    `$$plugin_invoke_count` - The count of plugins invoked.
 *
 * (string[])  `$$plugin_invoke_names` - The names of plugins invoked.
 */
class PluginEvent
{
   /**
    * Initializes PluginEvent.
    *
    * @param {object} copyProps - Event data to copy.
    * @param {object} passthruProps - Event data to pass through.
    */
   constructor(copyProps = {}, passthruProps = {})
   {
      /**
       * Provides the unified event data assigning any pass through data to the copied data supplied.
       */
      this.data = Object.assign(JSON.parse(JSON.stringify(copyProps)), passthruProps);

      /**
       * Unique data available in each plugin invoked.
       *
       * @type {EventbusProxy} - The active EventbusProxy for that particular plugin.
       */
      this.eventbus = void 0;

      /**
       * Unique data available in each plugin invoked.
       *
       * @type {string} - The active plugin name.
       */
      this.pluginName = void 0;

      /**
       * Unique data available in each plugin invoked.
       *
       * @type {object} - The active plugin options.
       */
      this.pluginOptions = void 0;
   }
}

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
function isValidConfig(pluginConfig)
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

/**
 * Provides a lightweight plugin manager for Node / NPM & the browser with eventbus integration for plugins in a safe
 * and protected manner across NPM modules, local files, and preloaded object instances. This pattern facilitates
 * message passing between modules versus direct dependencies / method invocation.
 *
 * It isn't necessary to use an eventbus associated with the plugin manager though invocation then relies on invoking
 * methods directly with the plugin manager instance.
 *
 * A default eventbus will be created, but you may also pass in an eventbus from `@typhonjs-plugin/eventbus` and the
 * plugin manager will register by default under these event categories:
 *
 * `plugins:async:add` - {@link AbstractPluginManager#add}
 *
 * `plugins:async:add:all` - {@link AbstractPluginManager#addAll}
 *
 * `plugins:async:destroy:manager` - {@link AbstractPluginManager#destroy}
 *
 * `plugins:async:invoke` - {@link AbstractPluginManager#invokeAsync}
 *
 * `plugins:async:invoke:event` - {@link AbstractPluginManager#invokeAsyncEvent}
 *
 * `plugins:async:remove` - {@link AbstractPluginManager#remove}
 *
 * `plugins:async:remove:all` - {@link AbstractPluginManager#removeAll}
 *
 * `plugins:create:eventbus:proxy` - {@link AbstractPluginManager#createEventbusProxy}
 *
 * `plugins:get:enabled` - {@link AbstractPluginManager#getPluginsEnabled}
 *
 * `plugins:get:options` - {@link AbstractPluginManager#getOptions}
 *
 * `plugins:has:plugin` - {@link AbstractPluginManager#hasPlugin}
 *
 * `plugins:invoke` - {@link AbstractPluginManager#invoke}
 *
 * `plugins:is:valid:config` - {@link AbstractPluginManager#isValidConfig}
 *
 * `plugins:set:enabled` - {@link AbstractPluginManager#setPluginsEnabled}
 *
 * `plugins:set:options` - {@link AbstractPluginManager#setOptions}
 *
 * `plugins:sync:invoke` - {@link AbstractPluginManager#invokeSync}
 *
 * `plugins:sync:invoke:event` - {@link AbstractPluginManager#invokeSyncEvent}
 *
 * Automatically when a plugin is loaded and unloaded respective callbacks `onPluginLoad` and `onPluginUnload` will
 * be attempted to be invoked on the plugin. This is an opportunity for the plugin to receive any associated eventbus
 * and wire itself into it. It should be noted that a protected proxy around the eventbus is passed to the plugins
 * such that when the plugin is removed automatically all events registered on the eventbus are cleaned up without
 * a plugin author needing to do this manually in the `onPluginUnload` callback. This solves any dangling event binding
 * issues.
 *
 * By supporting ES Modules in Node and the browser and CJS on Node the plugin manager is by nature asynchronous for
 * the
 * core methods of adding / removing plugins and destroying the manager. The lifecycle methods `onPluginLoad` and
 * `onPluginUnload` will be awaited on such that if a plugin returns a Promise or is an async method
 * then it will complete before execution continues.
 *
 * It is recommended to interact with the plugin manager eventbus through an eventbus proxy. The
 * `createEventbusProxy` method will return a proxy to the default or currently set eventbus.
 *
 * If eventbus functionality is enabled it is important especially if using a process / global level eventbus such as
 * `@typhonjs-plugin/eventbus/instances` to call {@link AbstractPluginManager#destroy} to clean up all plugin eventbus
 * resources and the plugin manager event bindings; this is primarily a testing concern.
 *
 * @see https://www.npmjs.com/package/@typhonjs-plugin/eventbus
 *
 * @example
 * import PluginManager from '@typhonjs-plugin/manager';
 *
 * const pluginManager = new PluginManager();
 *
 * pluginManager.add({ name: 'an-npm-plugin-enabled-module' });
 * pluginManager.add({ name: 'my-local-module', target: './myModule.js' });
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
 * // One can also indirectly invoke any method of the plugin via:
 * eventbus.triggerSync('plugins:invoke:sync:event', 'aCoolMethod'); // Any plugin with a method named `aCoolMethod` is
 *    invoked. eventbus.triggerSync('plugins:invoke:sync:event', 'aCoolMethod', {}, {},
 *    'an-npm-plugin-enabled-module'); // specific invocation.
 *
 * // The 3rd parameter will make a copy of the hash and the 4th defines a pass through object hash sending a single
 * // event / object hash to the invoked method.
 *
 * // -----------------------
 *
 * // Given that `@typhonjs-plugin/eventbus/instances` defines a global / process level eventbus you can import it in
 *    an
 * entirely different file or even NPM module and invoke methods of loaded plugins like this:
 *
 * import eventbus from '@typhonjs-plugin/eventbus/instances';
 *
 * eventbus.triggerSync('plugins:invoke', 'aCoolMethod'); // Any plugin with a method named `aCoolMethod` is invoked.
 *
 * assert(eventbus.triggerSync('cool:event') === true);
 *
 * eventbus.trigger('plugins:remove', 'an-npm-plugin-enabled-module'); // Removes the plugin and unregisters events.
 *
 * assert(eventbus.triggerSync('cool:event') === true); // Will now fail!
 *
 * // In this case though when using the global eventbus be mindful to always call `pluginManager.destroy()` in the
 *    main
 * // thread of execution scope to remove all plugins and the plugin manager event bindings!
 */
class AbstractPluginManager
{
   /**
    * Instantiates AbstractPluginManager
    *
    * @param {object}   [options] - Provides various configuration options:
    *
    * @param {Eventbus} [options.eventbus] - An instance of '@typhonjs-plugin/eventbus' used as the plugin
    * eventbus. If not provided a default eventbus is created.
    *
    * @param {string}   [options.eventPrepend='plugin'] - A customized name to prepend PluginManager events on the
    *                                                     eventbus.
    *
    * @param {boolean}  [options.throwNoMethod=false] - If true then when a method fails to be invoked by any plugin
    *                                                   an exception will be thrown.
    *
    * @param {boolean}  [options.throwNoPlugin=false] - If true then when no plugin is matched to be invoked an
    *                                                   exception will be thrown.
    *
    * @param {PluginSupportImpl|PluginSupportImpl[]}  [options.PluginSupport] - Optional classes to pass in which
    *                                                 extends the plugin manager. A default implementation is available:
    *                                                 {@link PluginSupport}
    */
   constructor(options = {})
   {
      if (typeof options !== 'object') { throw new TypeError(`'options' is not an object.`); }

      if (options.PluginSupport !== void 0 && typeof options.PluginSupport !== 'function' &&
       !Array.isArray(options.PluginSupport))
      {
         throw new TypeError(
          `'options.PluginSupport' must be a constructor function or array of such matching PluginSupportImpl.`);
      }

      /**
       * Stores the plugins by name with an associated PluginEntry.
       *
       * @type {Map<string, PluginEntry>}
       * @private
       */
      this._pluginMap = new Map();

      /**
       * Stores any associated eventbus.
       *
       * @type {Eventbus}
       * @protected
       */
      this._eventbus = null;

      /**
       * Stores any EventbusProxy instances created, so that they may be automatically destroyed.
       *
       * @type {EventbusProxy[]}
       * @private
       */
      this._eventbusProxies = [];

      /**
       * Provides an array of PluginSupportImpl interfaces to extend the plugin manager through the eventbus API.
       *
       * @type {PluginSupportImpl[]}
       * @private
       */
      this._pluginSupport = [];

      if (Array.isArray(options.PluginSupport))
      {
         for (const PluginSupport of options.PluginSupport)
         {
            this._pluginSupport.push(new PluginSupport(this));
         }
      }
      else if (options.PluginSupport !== void 0)
      {
         this._pluginSupport.push(new options.PluginSupport(this));
      }

      /**
       * Defines options for throwing exceptions. Turned off by default.
       *
       * @type {PluginManagerOptions}
       * @private
       */
      this._options =
      {
         pluginsEnabled: true,
         noEventAdd: false,
         noEventDestroy: false,
         noEventOptions: true,
         noEventRemoval: false,
         throwNoMethod: false,
         throwNoPlugin: false
      };

      this.setEventbus({
         eventbus: options.eventbus !== void 0 ? options.eventbus : new Eventbus(),
         eventPrepend: options.eventPrepend
      });

      this.setOptions(options);
   }

   /**
    * Adds a plugin by the given configuration parameters. A plugin `name` is always required. If no other options
    * are provided then the `name` doubles as the NPM module / local file to load. The loading first checks for an
    * existing `instance` to use as the plugin. Then the `target` is chosen as the NPM module / local file to load.
    * By passing in `options` this will be stored and accessible to the plugin during all callbacks.
    *
    * @param {PluginConfig}   pluginConfig - Defines the plugin to load.
    *
    * @param {object}         [moduleData] - Optional object hash to associate with plugin.
    *
    * @returns {Promise<PluginData|undefined>} The PluginData that represents the plugin added.
    */
   async add(pluginConfig, moduleData)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginConfig !== 'object') { throw new TypeError(`'pluginConfig' is not an object.`); }

      if (typeof pluginConfig.name !== 'string')
      {
         throw new TypeError(`'pluginConfig.name' is not a string for entry: ${JSON.stringify(pluginConfig)}.`);
      }

      if (typeof pluginConfig.target !== 'undefined' && typeof pluginConfig.target !== 'string' &&
       !(pluginConfig.target instanceof URL))
      {
         throw new TypeError(
          `'pluginConfig.target' is not a string or URL for entry: ${JSON.stringify(pluginConfig)}.`);
      }

      if (typeof pluginConfig.options !== 'undefined' && typeof pluginConfig.options !== 'object')
      {
         throw new TypeError(`'pluginConfig.options' is not an object for entry: ${JSON.stringify(pluginConfig)}.`);
      }

      if (typeof moduleData !== 'undefined' && typeof moduleData !== 'object')
      {
         throw new TypeError(`'moduleData' is not an object for entry: ${JSON.stringify(pluginConfig)}.`);
      }

      // If a plugin with the same name already exists post a warning and exit early.
      if (this._pluginMap.has(pluginConfig.name))
      {
         throw new Error(`A plugin already exists with name: ${pluginConfig.name}.`);
      }

      let instance, target, type;

      // Use an existing instance of a plugin; a static class is assumed when instance is a function.
      if (typeof pluginConfig.instance === 'object' || typeof pluginConfig.instance === 'function')
      {
         instance = pluginConfig.instance;

         target = pluginConfig.name;

         type = 'instance';
      }
      else
      {
         // If a target is defined use it instead of the name.
         target = pluginConfig.target || pluginConfig.name;

         // Defer to child class to load module in Node or the browser.
         const result = await this._loadModule(target);

         instance = result.instance;
         type = result.type;
      }

      // Convert any URL target a string.
      if (target instanceof URL)
      {
         target = target.toString();
      }

      /**
       * Create an object hash with data describing the plugin, manager, and any extra module data.
       *
       * @type {PluginData}
       */
      const pluginData = JSON.parse(JSON.stringify(
      {
         manager:
         {
            eventPrepend: this._eventPrepend
         },

         module: moduleData || {},

         plugin:
         {
            name: pluginConfig.name,
            scopedName: `${this._eventPrepend}:${pluginConfig.name}`,
            target,
            targetEscaped: PluginEntry.escape(target),
            type,
            options: pluginConfig.options || {}
         }
      }));

      deepFreeze(pluginData, ['eventPrepend', 'scopedName']);

      const eventbusProxy = this._eventbus !== null && typeof this._eventbus !== 'undefined' ?
       new EventbusProxy(this._eventbus) : void 0;

      const entry = new PluginEntry(pluginConfig.name, pluginData, instance, eventbusProxy);

      this._pluginMap.set(pluginConfig.name, entry);

      // Invoke private module method which allows skipping optional error checking.
      await s_INVOKE_ASYNC_EVENTS('onPluginLoad', {}, {}, pluginConfig.name, this._pluginMap, this._options, false);

      // Invoke `typhonjs:plugin:manager:plugin:added` allowing external code to react to plugin addition.
      if (this._eventbus)
      {
         await this._eventbus.triggerAsync(`typhonjs:plugin:manager:plugin:added`, pluginData);
      }

      return pluginData;
   }

   /**
    * Initializes multiple plugins in a single call.
    *
    * @param {PluginConfig[]} pluginConfigs - An array of plugin config object hash entries.
    *
    * @param {object}         [moduleData] - Optional object hash to associate with all plugins.
    *
    * @returns {Promise<PluginData[]>} An array of PluginData objects of all loaded plugins.
    */
   async addAll(pluginConfigs = [], moduleData)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!Array.isArray(pluginConfigs)) { throw new TypeError(`'pluginConfigs' is not an array.`); }

      const pluginsData = [];

      for (const pluginConfig of pluginConfigs)
      {
         const result = await this.add(pluginConfig, moduleData);

         if (result) { pluginsData.push(result); }
      }

      return pluginsData;
   }

   /**
    * Provides the eventbus callback which may prevent addition if optional `noEventAdd` is enabled. This disables
    * the ability for plugins to be added via events preventing any external code adding plugins in this manner.
    *
    * @param {PluginConfig}   pluginConfig - Defines the plugin to load.
    *
    * @param {object}         [moduleData] - Optional object hash to associate with all plugins.
    *
    * @returns {Promise<PluginData|undefined>} - Operation success.
    * @private
    */
   async _addEventbus(pluginConfig, moduleData)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return !this._options.noEventAdd ? this.add(pluginConfig, moduleData) : void 0;
   }

   /**
    * Provides the eventbus callback which may prevent addition if optional `noEventAdd` is enabled. This disables
    * the ability for plugins to be added via events preventing any external code adding plugins in this manner.
    *
    * @param {PluginConfig[]} pluginConfigs - An array of plugin config object hash entries.
    *
    * @param {object}         [moduleData] - Optional object hash to associate with all plugins.
    *
    * @returns {Promise<PluginData[]>} An array of PluginData objects of all loaded plugins.
    * @private
    */
   async _addAllEventbus(pluginConfigs, moduleData)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!this._options.noEventAdd) { return this.addAll(pluginConfigs, moduleData); }
   }

   /**
    * If an eventbus is assigned to this plugin manager then a new EventbusProxy wrapping this eventbus is returned.
    * It is added to `this._eventbusProxies` so †hat the instances are destroyed when the plugin manager is destroyed.
    *
    * @returns {EventbusProxy} A proxy for the currently set Eventbus.
    */
   createEventbusProxy()
   {
      if (!(this._eventbus instanceof Eventbus))
      {
         throw new ReferenceError('No eventbus assigned to plugin manager.');
      }

      const eventbusProxy = new EventbusProxy(this._eventbus);

      // Store proxy to make sure it is destroyed when the plugin manager is destroyed.
      this._eventbusProxies.push(eventbusProxy);

      return eventbusProxy;
   }

   /**
    * Destroys all managed plugins after unloading them.
    */
   async destroy()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      // Remove all plugins; this will invoke onPluginUnload.
      await this.removeAll();

      // Destroy any EventbusProxy instances created.
      for (const eventbusProxy of this._eventbusProxies)
      {
         eventbusProxy.destroy();
      }

      this._eventbusProxies = [];

      if (this._eventbus !== null && typeof this._eventbus !== 'undefined')
      {
         this._eventbus.off(`${this._eventPrepend}:async:add`, this._addEventbus, this);
         this._eventbus.off(`${this._eventPrepend}:async:add:all`, this._addAllEventbus, this);
         this._eventbus.off(`${this._eventPrepend}:async:destroy:manager`, this._destroyEventbus, this);
         this._eventbus.off(`${this._eventPrepend}:async:invoke`, this.invokeAsync, this);
         this._eventbus.off(`${this._eventPrepend}:async:invoke:event`, this.invokeAsyncEvent, this);
         this._eventbus.off(`${this._eventPrepend}:async:remove`, this._removeEventbus, this);
         this._eventbus.off(`${this._eventPrepend}:async:remove:all`, this._removeAllEventbus, this);
         this._eventbus.off(`${this._eventPrepend}:create:eventbus:proxy`, this.createEventbusProxy, this);
         this._eventbus.off(`${this._eventPrepend}:get:enabled`, this.getPluginsEnabled, this);
         this._eventbus.off(`${this._eventPrepend}:get:options`, this.getOptions, this);
         this._eventbus.off(`${this._eventPrepend}:has:plugin`, this.hasPlugin, this);
         this._eventbus.off(`${this._eventPrepend}:invoke`, this.invoke, this);
         this._eventbus.off(`${this._eventPrepend}:is:valid:config`, this.isValidConfig, this);
         this._eventbus.off(`${this._eventPrepend}:set:enabled`, this.setPluginsEnabled, this);
         this._eventbus.off(`${this._eventPrepend}:set:options`, this._setOptionsEventbus, this);
         this._eventbus.off(`${this._eventPrepend}:sync:invoke`, this.invokeSync, this);
         this._eventbus.off(`${this._eventPrepend}:sync:invoke:event`, this.invokeSyncEvent, this);
      }

      for (const pluginSupport of this._pluginSupport)
      {
         await pluginSupport.destroy({ eventbus: this._eventbus, eventPrepend: this._eventPrepend });
      }

      this._pluginSupport = [];
      this._pluginMap = null;
      this._eventbus = null;
   }

   /**
    * Provides the eventbus callback which may prevent plugin manager destruction if optional `noEventDestroy` is
    * enabled. This disables the ability for the plugin manager to be destroyed via events preventing any external
    * code removing plugins in this manner.
    *
    * @private
    * @returns {Promise} The promise returned from `destroy` or immediate resolution.
    */
   async _destroyEventbus()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!this._options.noEventDestroy) { return this.destroy(); }
   }

   /**
    * Returns whether this plugin manager has been destroyed.
    *
    * @returns {boolean} Returns whether this plugin manager has been destroyed.
    */
   get isDestroyed()
   {
      return this._pluginMap === null || this._pluginMap === void 0;
   }

   /**
    * Returns any associated eventbus.
    *
    * @returns {Eventbus|null} The associated eventbus.
    */
   getEventbus()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return this._eventbus;
   }

   /**
    * Returns a copy of the plugin manager options.
    *
    * @returns {PluginManagerOptions} A copy of the plugin manager options.
    */
   getOptions()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return JSON.parse(JSON.stringify(this._options));
   }

   /**
    * Returns the enabled state of a plugin, a list of plugins, or all plugins.
    *
    * @param {undefined|object}  [options] - Options object. If undefined all plugin enabled state is returned.
    *
    * @param {string|Iterable<string>}   [options.pluginNames] - Plugin name or iterable list of names to get state.
    *
    * @returns {boolean|Array<{pluginName: string, enabled: boolean}>} - Enabled state for single plugin or array of
    *                                                                    results for multiple plugins.
    */
   getPluginsEnabled({ pluginNames = [] } = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginNames !== 'string' && !isIterable(pluginNames))
      {
         throw new TypeError(`'pluginNames' is not a string or iterable.`);
      }

      // Return a single boolean enabled result for a single plugin if found.
      if (typeof pluginNames === 'string')
      {
         const entry = this._pluginMap.get(pluginNames);
         return entry instanceof PluginEntry && entry.enabled;
      }

      const results = [];

      // If there are plugin names specified then limit returned results to just them.
      if (pluginNames.length)
      {
         for (const pluginName of pluginNames)
         {
            const entry = this._pluginMap.get(pluginName);
            const loaded = entry instanceof PluginEntry;
            results.push({ pluginName, enabled: loaded && entry.enabled, loaded });
         }
      }
      else // Return all plugins enabled state.
      {
         for (const [pluginName, entry] of this._pluginMap.entries())
         {
            const loaded = entry instanceof PluginEntry;
            results.push({ pluginName, enabled: loaded && entry.enabled, loaded });
         }
      }

      return results;
   }

   /**
    * Returns true if there is a plugin loaded with the given plugin name.
    *
    * @param {string}   pluginName - Plugin name to test.
    *
    * @returns {boolean} - True if a plugin exists.
    */
   hasPlugin(pluginName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginName !== 'string') { throw new TypeError(`'pluginName' is not a string.`); }

      return this._pluginMap.has(pluginName);
   }

   /**
    * This dispatch method simply invokes any plugin targets for the given methodName..
    *
    * @param {string}            methodName - Method name to invoke.
    *
    * @param {*|Array<*>}        [args] - Optional arguments. An array will be spread as multiple arguments.
    *
    * @param {string|string[]}   [nameOrList] - An optional plugin name or array / iterable of plugin names to invoke.
    */
   invoke(methodName, args = void 0, nameOrList = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof methodName !== 'string') { throw new TypeError(`'methodName' is not a string.`); }

      if (typeof nameOrList === 'undefined') { nameOrList = this._pluginMap.keys(); }

      if (typeof nameOrList !== 'string' && !Array.isArray(nameOrList) &&
       typeof nameOrList[Symbol.iterator] !== 'function')
      {
         throw new TypeError(`'nameOrList' is not a string, array, or iterator.`);
      }

      // Track if a plugin method is invoked.
      let hasMethod = false;
      let hasPlugin = false;

      // Early out if plugins are not enabled.
      if (!this._options.pluginsEnabled) { return; }

      if (typeof nameOrList === 'string')
      {
         const plugin = this._pluginMap.get(nameOrList);

         if (plugin instanceof PluginEntry && plugin.enabled && plugin.instance)
         {
            hasPlugin = true;

            if (typeof plugin.instance[methodName] === 'function')
            {
               Array.isArray(args) ? plugin.instance[methodName](...args) : plugin.instance[methodName](args);

               hasMethod = true;
            }
         }
      }
      else
      {
         for (const name of nameOrList)
         {
            const plugin = this._pluginMap.get(name);

            if (plugin instanceof PluginEntry && plugin.enabled && plugin.instance)
            {
               hasPlugin = true;

               if (typeof plugin.instance[methodName] === 'function')
               {
                  Array.isArray(args) ? plugin.instance[methodName](...args) : plugin.instance[methodName](args);

                  hasMethod = true;
               }
            }
         }
      }

      if (this._options.throwNoPlugin && !hasPlugin)
      {
         throw new Error(`PluginManager failed to find any target plugins.`);
      }

      if (this._options.throwNoMethod && !hasMethod)
      {
         throw new Error(`PluginManager failed to invoke '${methodName}'.`);
      }
   }

   /**
    * This dispatch method uses ES6 Promises and adds any returned results to an array which is added to a Promise.all
    * construction which passes back a Promise which waits until all Promises complete. Any target invoked may return a
    * Promise or any result. This is very useful to use for any asynchronous operations.
    *
    * @param {string}            methodName - Method name to invoke.
    *
    * @param {*|Array<*>}        [args] - Optional arguments. An array will be spread as multiple arguments.
    *
    * @param {string|string[]}   [nameOrList] - An optional plugin name or array / iterable of plugin names to invoke.
    *
    * @returns {Promise<*|Array<*>>} A Promise with any returned results.
    */
   invokeAsync(methodName, args = void 0, nameOrList = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof methodName !== 'string') { throw new TypeError(`'methodName' is not a string.`); }

      if (typeof nameOrList === 'undefined') { nameOrList = this._pluginMap.keys(); }

      if (typeof nameOrList !== 'string' && !Array.isArray(nameOrList) &&
       typeof nameOrList[Symbol.iterator] !== 'function')
      {
         throw new TypeError(`'nameOrList' is not a string, array, or iterator.`);
      }

      // Track if a plugin method is invoked.
      let hasMethod = false;
      let hasPlugin = false;

      // Capture results.
      let result = void 0;
      const results = [];

      // Early out if plugins are not enabled.
      if (!this._options.pluginsEnabled) { return result; }

      try
      {
         if (typeof nameOrList === 'string')
         {
            const plugin = this._pluginMap.get(nameOrList);

            if (plugin instanceof PluginEntry && plugin.enabled && plugin.instance)
            {
               hasPlugin = true;

               if (typeof plugin.instance[methodName] === 'function')
               {
                  result = Array.isArray(args) ? plugin.instance[methodName](...args) :
                   plugin.instance[methodName](args);

                  // If we received a valid result return immediately.
                  if (result !== null || typeof result !== 'undefined') { results.push(result); }

                  hasMethod = true;
               }
            }
         }
         else
         {
            for (const name of nameOrList)
            {
               const plugin = this._pluginMap.get(name);

               if (plugin instanceof PluginEntry && plugin.enabled && plugin.instance)
               {
                  hasPlugin = true;

                  if (typeof plugin.instance[methodName] === 'function')
                  {
                     result = Array.isArray(args) ? plugin.instance[methodName](...args) :
                      plugin.instance[methodName](args);

                     // If we received a valid result return immediately.
                     if (result !== null || typeof result !== 'undefined') { results.push(result); }

                     hasMethod = true;
                  }
               }
            }
         }

         if (this._options.throwNoPlugin && !hasPlugin)
         {
            return Promise.reject(new Error(`PluginManager failed to find any target plugins.`));
         }

         if (this._options.throwNoMethod && !hasMethod)
         {
            return Promise.reject(new Error(`PluginManager failed to invoke '${methodName}'.`));
         }
      }
      catch (error)
      {
         return Promise.reject(error);
      }

      // If there are multiple results then use Promise.all otherwise Promise.resolve.
      return results.length > 1 ? Promise.all(results) : Promise.resolve(result);
   }

   /**
    * This dispatch method synchronously passes to and returns from any invoked targets a PluginEvent.
    *
    * @param {string}            methodName - Method name to invoke.
    *
    * @param {object}            [copyProps={}] - plugin event object.
    *
    * @param {object}            [passthruProps={}] - if true, event has plugin option.
    *
    * @param {string|string[]}   [nameOrList] - An optional plugin name or array / iterable of plugin names to invoke.
    *
    * @returns {Promise<PluginEvent>} A PluginEvent representing the invocation results.
    */
   invokeAsyncEvent(methodName, copyProps = {}, passthruProps = {}, nameOrList = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof nameOrList === 'undefined') { nameOrList = this._pluginMap.keys(); }

      // Early out if plugins are not enabled.
      if (!this._options.pluginsEnabled) { return Promise.resolve(); }

      // Invokes the private internal async events method with optional error checking enabled.
      return s_INVOKE_ASYNC_EVENTS(methodName, copyProps, passthruProps, nameOrList, this._pluginMap, this._options);
   }

   /**
    * This dispatch method synchronously passes back a single value or an array with all results returned by any
    * invoked targets.
    *
    * @param {string}            methodName - Method name to invoke.
    *
    * @param {*|Array<*>}        [args] - Optional arguments. An array will be spread as multiple arguments.
    *
    * @param {string|string[]}   [nameOrList] - An optional plugin name or array / iterable of plugin names to invoke.
    *
    * @returns {*|Array<*>} An array of results.
    */
   invokeSync(methodName, args = void 0, nameOrList = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof methodName !== 'string') { throw new TypeError(`'methodName' is not a string.`); }

      if (typeof nameOrList === 'undefined') { nameOrList = this._pluginMap.keys(); }

      if (typeof nameOrList !== 'string' && !Array.isArray(nameOrList) &&
       typeof nameOrList[Symbol.iterator] !== 'function')
      {
         throw new TypeError(`'nameOrList' is not a string, array, or iterator.`);
      }

      // Track if a plugin method is invoked.
      let hasMethod = false;
      let hasPlugin = false;

      // Capture results.
      let result = void 0;
      const results = [];

      // Early out if plugins are not enabled.
      if (!this._options.pluginsEnabled) { return result; }

      if (typeof nameOrList === 'string')
      {
         const plugin = this._pluginMap.get(nameOrList);

         if (plugin instanceof PluginEntry && plugin.enabled && plugin.instance)
         {
            hasPlugin = true;

            if (typeof plugin.instance[methodName] === 'function')
            {
               result = Array.isArray(args) ? plugin.instance[methodName](...args) : plugin.instance[methodName](args);

               // If we received a valid result return immediately.
               if (result !== null || typeof result !== 'undefined') { results.push(result); }

               hasMethod = true;
            }
         }
      }
      else
      {
         for (const name of nameOrList)
         {
            const plugin = this._pluginMap.get(name);

            if (plugin instanceof PluginEntry && plugin.enabled && plugin.instance)
            {
               hasPlugin = true;

               if (typeof plugin.instance[methodName] === 'function')
               {
                  result = Array.isArray(args) ? plugin.instance[methodName](...args) :
                   plugin.instance[methodName](args);

                  // If we received a valid result return immediately.
                  if (result !== null || typeof result !== 'undefined') { results.push(result); }

                  hasMethod = true;
               }
            }
         }
      }

      if (this._options.throwNoPlugin && !hasPlugin)
      {
         throw new Error(`PluginManager failed to find any target plugins.`);
      }

      if (this._options.throwNoMethod && !hasMethod)
      {
         throw new Error(`PluginManager failed to invoke '${methodName}'.`);
      }

      // Return the results array if there are more than one or just a single result.
      return results.length > 1 ? results : result;
   }

   /**
    * This dispatch method synchronously passes to and returns from any invoked targets a PluginEvent.
    *
    * @param {string}            methodName - Method name to invoke.
    *
    * @param {object}            [copyProps={}] - plugin event object.
    *
    * @param {object}            [passthruProps={}] - if true, event has plugin option.
    *
    * @param {string|string[]}   [nameOrList] - An optional plugin name or array / iterable of plugin names to invoke.
    *
    * @returns {PluginEvent|undefined} A plugin event with invocation results.
    */
   invokeSyncEvent(methodName, copyProps = {}, passthruProps = {}, nameOrList = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof nameOrList === 'undefined') { nameOrList = this._pluginMap.keys(); }

      // Early out if plugins are not enabled.
      if (!this._options.pluginsEnabled) { return void 0; }

      // Invokes the private internal sync events method with optional error checking enabled.
      return s_INVOKE_SYNC_EVENTS(methodName, copyProps, passthruProps, nameOrList, this._pluginMap, this._options);
   }

   /**
    * Performs validation of a PluginConfig.
    *
    * @param {PluginConfig}   pluginConfig - A PluginConfig to validate.
    *
    * @returns {boolean} True if the given PluginConfig is valid.
    */
   isValidConfig(pluginConfig)
   {
      return isValidConfig(pluginConfig);
   }

   /**
    * Child implementations provide platform specific module loading by overriding this method.
    *
    * @param {string|URL}   moduleOrPath - A module name, file path, or URL.
    *
    * @returns {Promise<*>} Loaded module.
    * @private
    */
   async _loadModule(moduleOrPath)  // eslint-disable-line no-unused-vars
   {
   }

   /**
    * Removes a plugin by name after unloading it and clearing any event bindings automatically.
    *
    * @param {string}   pluginName - The plugin name to remove.
    *
    * @returns {Promise<boolean>} - Operation success.
    */
   async remove(pluginName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      const entry = this._pluginMap.get(pluginName);

      if (entry instanceof PluginEntry)
      {
         // Invoke private module method which allows skipping optional error checking.
         await s_INVOKE_ASYNC_EVENTS('onPluginUnload', {}, {}, pluginName, this._pluginMap, this._options, false);

         // Automatically remove any potential reference to a stored event proxy instance.
         try
         {
            entry.instance._eventbus = void 0;
         }
         catch (err) { /* nop */ }

         if (entry.eventbusProxy instanceof EventbusProxy) { entry.eventbusProxy.destroy(); }

         this._pluginMap.delete(pluginName);

         // Invoke `typhonjs:plugin:manager:plugin:removed` allowing external code to react to plugin removed.
         if (this._eventbus)
         {
            await this._eventbus.triggerAsync(`typhonjs:plugin:manager:plugin:removed`,
             JSON.parse(JSON.stringify(entry.data)));
         }

         return true;
      }

      return false;
   }

   /**
    * Removes all plugins after unloading them and clearing any event bindings automatically.
    *
    * @returns {Promise.<Array<{plugin: string, result: boolean}>>} A list of plugin names and removal success state.
    */
   async removeAll()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      const values = [];

      for (const pluginName of this._pluginMap.keys())
      {
         const result = await this.remove(pluginName);
         values.push({ plugin: pluginName, result });
      }

      this._pluginMap.clear();

      return values;
   }

   /**
    * Provides the eventbus callback which may prevent removal if optional `noEventRemoval` is enabled. This disables
    * the ability for plugins to be removed via events preventing any external code removing plugins in this manner.
    *
    * @param {string}   pluginName - The plugin name to remove.
    *
    * @returns {Promise<boolean>} - Operation success.
    * @private
    */
   async _removeEventbus(pluginName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      return !this._options.noEventRemoval ? this.remove(pluginName) : false;
   }

   /**
    * Provides the eventbus callback which may prevent removal if optional `noEventRemoval` is enabled. This disables
    * the ability for plugins to be removed via events preventing any external code removing plugins in this manner.
    *
    * @returns {Promise.<Array<{plugin: string, result: boolean}>>} A list of plugin names and removal success state.
    * @private
    */
   async _removeAllEventbus()
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!this._options.noEventRemoval) { return this.removeAll(); }
   }

   /**
    * Sets the eventbus associated with this plugin manager. If any previous eventbus was associated all plugin manager
    * events will be removed then added to the new eventbus. If there are any existing plugins being managed their
    * events will be removed from the old eventbus and then `onPluginLoad` will be called with the new eventbus.
    *
    * @param {object}     options - An options object.
    *
    * @param {Eventbus}   options.eventbus - The new eventbus to associate.
    *
    * @param {string}     [options.eventPrepend='plugins'] - An optional string to prepend to all of the event
    *                                                        binding targets.
    *
    * @returns {Promise<AbstractPluginManager>} This plugin manager.
    */
   async setEventbus({ eventbus, eventPrepend = 'plugins' } = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!(eventbus instanceof Eventbus)) { throw new TypeError(`'eventbus' is not an 'Eventbus'.`); }
      if (typeof eventPrepend !== 'string') { throw new TypeError(`'eventPrepend' is not a 'string'.`); }

      // Early escape if the eventbus is the same as the current eventbus.
      if (eventbus === this._eventbus) { return this; }

      const oldPrepend = this._eventPrepend;

      /**
       * Stores the prepend string for eventbus registration.
       *
       * @type {string}
       * @private
       */
      this._eventPrepend = eventPrepend;

      // Unload and reload any existing plugins from the old eventbus to the target eventbus.
      if (this._pluginMap.size > 0)
      {
         // Invoke private module method which allows skipping optional error checking.
         await s_INVOKE_ASYNC_EVENTS('onPluginUnload', {}, {}, this._pluginMap.keys(), this._pluginMap, this._options,
          false);

         for (const entry of this._pluginMap.values())
         {
            // Automatically remove any potential reference to a stored event proxy instance.
            try
            {
               entry.instance._eventbus = void 0;
            }
            catch (err) { /* nop */ }

            entry.data.manager.eventPrepend = eventPrepend;
            entry.data.plugin.scopedName = `${eventPrepend}:${entry.name}`;

            if (entry.eventbusProxy instanceof EventbusProxy) { entry.eventbusProxy.destroy(); }

            entry.eventbusProxy = new EventbusProxy(eventbus);
         }

         // Invoke private module method which allows skipping optional error checking.
         await s_INVOKE_ASYNC_EVENTS('onPluginLoad', {}, {}, this._pluginMap.keys(), this._pluginMap, this._options,
          false);

         for (const entry of this._pluginMap.values())
         {
            // Invoke `typhonjs:plugin:manager:eventbus:changed` allowing external code to react to plugin
            // changing eventbus.
            if (this._eventbus)
            {
               this._eventbus.trigger(`typhonjs:plugin:manager:eventbus:changed`, Object.assign({
                  oldEventbus: this._eventbus,
                  oldManagerEventPrepend: oldPrepend,
                  oldScopedName: `${oldPrepend}:${entry.name}`,
                  newEventbus: eventbus,
                  newManagerEventPrepend: eventPrepend,
                  newScopedName: `${eventPrepend}:${entry.name}`
               }, JSON.parse(JSON.stringify(entry.data))));
            }
         }
      }

      if (this._eventbus !== null)
      {
         this._eventbus.off(`${oldPrepend}:async:add`, this._addEventbus, this);
         this._eventbus.off(`${oldPrepend}:async:add:all`, this._addAllEventbus, this);
         this._eventbus.off(`${oldPrepend}:async:destroy:manager`, this._destroyEventbus, this);
         this._eventbus.off(`${oldPrepend}:async:invoke`, this.invokeAsync, this);
         this._eventbus.off(`${oldPrepend}:async:invoke:event`, this.invokeAsyncEvent, this);
         this._eventbus.off(`${oldPrepend}:async:remove`, this._removeEventbus, this);
         this._eventbus.off(`${oldPrepend}:async:remove:all`, this._removeAllEventbus, this);
         this._eventbus.off(`${oldPrepend}:create:eventbus:proxy`, this.createEventbusProxy, this);
         this._eventbus.off(`${oldPrepend}:get:enabled`, this.getPluginsEnabled, this);
         this._eventbus.off(`${oldPrepend}:get:options`, this.getOptions, this);
         this._eventbus.off(`${oldPrepend}:has:plugin`, this.hasPlugin, this);
         this._eventbus.off(`${oldPrepend}:invoke`, this.invoke, this);
         this._eventbus.off(`${oldPrepend}:is:valid:config`, this.isValidConfig, this);
         this._eventbus.off(`${oldPrepend}:set:enabled`, this.setPluginsEnabled, this);
         this._eventbus.off(`${oldPrepend}:set:options`, this._setOptionsEventbus, this);
         this._eventbus.off(`${oldPrepend}:sync:invoke`, this.invokeSync, this);
         this._eventbus.off(`${oldPrepend}:sync:invoke:event`, this.invokeSyncEvent, this);

         // Invoke `typhonjs:plugin:manager:eventbus:removed` allowing external code to react to eventbus removal.
         this._eventbus.trigger(`typhonjs:plugin:manager:eventbus:removed`,
         {
            oldEventbus: this._eventbus,
            oldEventPrepend: oldPrepend,
            newEventbus: eventbus,
            newEventPrepend: eventPrepend
         });
      }

      eventbus.on(`${eventPrepend}:async:add`, this._addEventbus, this);
      eventbus.on(`${eventPrepend}:async:add:all`, this._addAllEventbus, this);
      eventbus.on(`${eventPrepend}:async:destroy:manager`, this._destroyEventbus, this);
      eventbus.on(`${eventPrepend}:async:invoke`, this.invokeAsync, this);
      eventbus.on(`${eventPrepend}:async:invoke:event`, this.invokeAsyncEvent, this);
      eventbus.on(`${eventPrepend}:async:remove`, this._removeEventbus, this);
      eventbus.on(`${eventPrepend}:async:remove:all`, this._removeAllEventbus, this);
      eventbus.on(`${eventPrepend}:create:eventbus:proxy`, this.createEventbusProxy, this);
      eventbus.on(`${eventPrepend}:get:enabled`, this.getPluginsEnabled, this);
      eventbus.on(`${eventPrepend}:get:options`, this.getOptions, this);
      eventbus.on(`${eventPrepend}:has:plugin`, this.hasPlugin, this);
      eventbus.on(`${eventPrepend}:invoke`, this.invoke, this);
      eventbus.on(`${eventPrepend}:is:valid:config`, this.isValidConfig, this);
      eventbus.on(`${eventPrepend}:set:enabled`, this.setPluginsEnabled, this);
      eventbus.on(`${eventPrepend}:set:options`, this._setOptionsEventbus, this);
      eventbus.on(`${eventPrepend}:sync:invoke`, this.invokeSync, this);
      eventbus.on(`${eventPrepend}:sync:invoke:event`, this.invokeSyncEvent, this);

      // Invoke `typhonjs:plugin:manager:eventbus:set` allowing external code to react to eventbus set.
      eventbus.trigger('typhonjs:plugin:manager:eventbus:set',
      {
         oldEventbus: this._eventbus,
         oldEventPrepend: oldPrepend,
         newEventbus: eventbus,
         newEventPrepend: eventPrepend
      });

      for (const pluginSupport of this._pluginSupport)
      {
         pluginSupport.setEventbus({
            oldEventbus: this._eventbus,
            newEventbus: eventbus,
            oldPrepend,
            newPrepend: eventPrepend
         });
      }

      this._eventbus = eventbus;

      return this;
   }

   /**
    * Set optional parameters. All parameters are off by default.
    *
    * @param {PluginManagerOptions} options - Defines optional parameters to set.
    */
   setOptions(options = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof options !== 'object') { throw new TypeError(`'options' is not an object.`); }

      if (typeof options.pluginsEnabled === 'boolean') { this._options.pluginsEnabled = options.pluginsEnabled; }
      if (typeof options.noEventAdd === 'boolean') { this._options.noEventAdd = options.noEventAdd; }
      if (typeof options.noEventDestroy === 'boolean') { this._options.noEventDestroy = options.noEventDestroy; }
      if (typeof options.noEventOptions === 'boolean') { this._options.noEventOptions = options.noEventOptions; }
      if (typeof options.noEventRemoval === 'boolean') { this._options.noEventRemoval = options.noEventRemoval; }
      if (typeof options.throwNoMethod === 'boolean') { this._options.throwNoMethod = options.throwNoMethod; }
      if (typeof options.throwNoPlugin === 'boolean') { this._options.throwNoPlugin = options.throwNoPlugin; }
   }

   /**
    * Provides the eventbus callback which may prevent plugin manager options being set if optional `noEventOptions` is
    * enabled. This disables the ability for the plugin manager options to be set via events preventing any external
    * code modifying options.
    *
    * @param {PluginManagerOptions} options - Defines optional parameters to set.
    *
    * @private
    */
   _setOptionsEventbus(options = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (!this._options.noEventOptions) { this.setOptions(options); }
   }

   /**
    * Sets the enabled state of a plugin, a list of plugins, or all plugins.
    *
    * @param {object}            options - Options object.
    *
    * @param {boolean}           options.enabled - The enabled state.
    *
    * @param {string|string[]}   [options.pluginNames] - Plugin name or list of names to set state.
    */
   setPluginsEnabled({ enabled, pluginNames = [] } = {})
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginNames !== 'string' && !Array.isArray(pluginNames))
      {
         throw new TypeError(`'pluginNames' is not a string or array.`);
      }

      if (typeof enabled !== 'boolean') { throw new TypeError(`'enabled' is not a boolean.`); }

      const setEntryEnabled = (entry) =>
      {
         if (entry instanceof PluginEntry)
         {
            entry.enabled = enabled;

            // Invoke `typhonjs:plugin:manager:plugin:enabled` allowing external code to react to plugin enabled state.
            if (this._eventbus)
            {
               this._eventbus.trigger(`typhonjs:plugin:manager:plugin:enabled`, Object.assign({
                  enabled
               }, JSON.parse(JSON.stringify(entry.data))));
            }
         }
      };

      // Set enabled state for a single plugin if found.
      if (typeof pluginNames === 'string')
      {
         setEntryEnabled(this._pluginMap.get(pluginNames));
      }

      // If there are plugin names specified then limit setting enabled state just them.
      if (pluginNames.length)
      {
         for (const pluginName of pluginNames)
         {
            setEntryEnabled(this._pluginMap.get(pluginName));
         }
      }
      else // Set all plugins enabled state.
      {
         for (const pluginEntry of this._pluginMap.values())
         {
            setEntryEnabled(pluginEntry);
         }
      }
   }
}

// Module Private ----------------------------------------------------------------------------------------------------

/**
 * Private implementation to invoke asynchronous events. This allows internal calls in PluginManager for
 * `onPluginLoad` and `onPluginUnload` callbacks to bypass optional error checking.
 *
 * This dispatch method asynchronously passes to and returns from any invoked targets a PluginEvent. Any invoked plugin
 * may return a Promise which is awaited upon by `Promise.all` before returning the PluginEvent data via a Promise.
 *
 * @param {string}                     methodName - Method name to invoke.
 *
 * @param {object}                     copyProps - plugin event object.
 *
 * @param {object}                     passthruProps - if true, event has plugin option.
 *
 * @param {string|string[]}            nameOrList - An optional plugin name or array / iterable of plugin names to
 *                                                  invoke.
 *
 * @param {Map<string, PluginEvent>}   pluginMap - Stores the plugins by name with an associated PluginEntry.
 *
 * @param {object}                     options - Defines options for throwing exceptions. Turned off by default.
 *
 * @param {boolean}                    [performErrorCheck=true] - If false optional error checking is disabled.
 *
 * @returns {Promise<PluginEvent>} A PluginEvent representing the invocation results.
 */
const s_INVOKE_ASYNC_EVENTS = async (methodName, copyProps = {}, passthruProps = {}, nameOrList, pluginMap, options,
 performErrorCheck = true) =>
{
   if (typeof methodName !== 'string') { throw new TypeError(`'methodName' is not a string.`); }
   if (typeof passthruProps !== 'object') { throw new TypeError(`'passthruProps' is not an object.`); }
   if (typeof copyProps !== 'object') { throw new TypeError(`'copyProps' is not an object.`); }

   if (typeof nameOrList !== 'string' && !Array.isArray(nameOrList) &&
    typeof nameOrList[Symbol.iterator] !== 'function')
   {
      throw new TypeError(`'nameOrList' is not a string, array, or iterator.`);
   }

   // Track how many plugins were invoked.
   let pluginInvokeCount = 0;
   const pluginInvokeNames = [];

   // Track if a plugin method is invoked
   let hasMethod = false;
   let hasPlugin = false;

   // Create plugin event.
   const ev = new PluginEvent(copyProps, passthruProps);

   const results = [];

   if (typeof nameOrList === 'string')
   {
      const entry = pluginMap.get(nameOrList);

      if (entry instanceof PluginEntry && entry.enabled && entry.instance)
      {
         hasPlugin = true;

         if (typeof entry.instance[methodName] === 'function')
         {
            ev.eventbus = entry.eventbusProxy;
            ev.pluginName = entry.name;
            ev.pluginOptions = entry.data.plugin.options;

            const result = entry.instance[methodName](ev);

            if (typeof result !== 'undefined' && result !== null) { results.push(result); }

            hasMethod = true;
            pluginInvokeCount++;
            pluginInvokeNames.push(entry.name);
         }
      }
   }
   else
   {
      for (const name of nameOrList)
      {
         const entry = pluginMap.get(name);

         if (entry instanceof PluginEntry && entry.enabled && entry.instance)
         {
            hasPlugin = true;

            if (typeof entry.instance[methodName] === 'function')
            {
               ev.eventbus = entry.eventbusProxy;
               ev.pluginName = entry.name;
               ev.pluginOptions = entry.data.plugin.options;

               const result = entry.instance[methodName](ev);

               if (typeof result !== 'undefined' && result !== null) { results.push(result); }

               hasMethod = true;
               pluginInvokeCount++;
               pluginInvokeNames.push(entry.name);
            }
         }
      }
   }

   if (performErrorCheck && options.throwNoPlugin && !hasPlugin)
   {
      throw new Error(`PluginManager failed to find any target plugins.`);
   }

   if (performErrorCheck && options.throwNoMethod && !hasMethod)
   {
      throw new Error(`PluginManager failed to invoke '${methodName}'.`);
   }

   // Add meta data for plugin invoke count.
   ev.data.$$plugin_invoke_count = pluginInvokeCount;
   ev.data.$$plugin_invoke_names = pluginInvokeNames;

   await Promise.all(results);

   return ev.data;
};

/**
 * Private implementation to invoke synchronous events. This allows internal calls in PluginManager for
 * `onPluginLoad` and `onPluginUnload` callbacks to bypass optional error checking.
 *
 * This dispatch method synchronously passes to and returns from any invoked targets a PluginEvent.
 *
 * @param {string}                     methodName - Method name to invoke.
 *
 * @param {object}                     copyProps - plugin event object.
 *
 * @param {object}                     passthruProps - if true, event has plugin option.
 *
 * @param {string|string[]}            nameOrList - An optional plugin name or array / iterable of plugin names to
 *                                                  invoke.
 *
 * @param {Map<string, PluginEvent>}   pluginMap - Stores the plugins by name with an associated PluginEntry.
 *
 * @param {object}                     options - Defines options for throwing exceptions. Turned off by default.
 *
 * @param {boolean}                    [performErrorCheck=true] - If false optional error checking is disabled.
 *
 * @returns {PluginEvent} A PluginEvent representing the invocation results.
 */
const s_INVOKE_SYNC_EVENTS = (methodName, copyProps = {}, passthruProps = {}, nameOrList, pluginMap, options,
 performErrorCheck = true) =>
{
   if (typeof methodName !== 'string') { throw new TypeError(`'methodName' is not a string.`); }
   if (typeof passthruProps !== 'object') { throw new TypeError(`'passthruProps' is not an object.`); }
   if (typeof copyProps !== 'object') { throw new TypeError(`'copyProps' is not an object.`); }

   if (typeof nameOrList !== 'string' && !Array.isArray(nameOrList) &&
    typeof nameOrList[Symbol.iterator] !== 'function')
   {
      throw new TypeError(`'nameOrList' is not a string, array, or iterator.`);
   }

   // Track how many plugins were invoked.
   let pluginInvokeCount = 0;
   const pluginInvokeNames = [];

   // Track if a plugin method is invoked
   let hasMethod = false;
   let hasPlugin = false;

   // Create plugin event.
   const ev = new PluginEvent(copyProps, passthruProps);

   if (typeof nameOrList === 'string')
   {
      const entry = pluginMap.get(nameOrList);

      if (entry instanceof PluginEntry && entry.enabled && entry.instance)
      {
         hasPlugin = true;

         if (typeof entry.instance[methodName] === 'function')
         {
            ev.eventbus = entry.eventbusProxy;
            ev.pluginName = entry.name;
            ev.pluginOptions = entry.data.plugin.options;

            entry.instance[methodName](ev);

            hasMethod = true;
            pluginInvokeCount++;
            pluginInvokeNames.push(entry.name);
         }
      }
   }
   else
   {
      for (const name of nameOrList)
      {
         const entry = pluginMap.get(name);

         if (entry instanceof PluginEntry && entry.enabled && entry.instance)
         {
            hasPlugin = true;

            if (typeof entry.instance[methodName] === 'function')
            {
               ev.eventbus = entry.eventbusProxy;
               ev.pluginName = entry.name;
               ev.pluginOptions = entry.data.plugin.options;

               entry.instance[methodName](ev);

               hasMethod = true;
               pluginInvokeCount++;
               pluginInvokeNames.push(entry.name);
            }
         }
      }
   }

   if (performErrorCheck && options.throwNoPlugin && !hasPlugin)
   {
      throw new Error(`PluginManager failed to find any target plugins.`);
   }

   if (performErrorCheck && options.throwNoMethod && !hasMethod)
   {
      throw new Error(`PluginManager failed to invoke '${methodName}'.`);
   }

   // Add meta data for plugin invoke count.
   ev.data.$$plugin_invoke_count = pluginInvokeCount;
   ev.data.$$plugin_invoke_names = pluginInvokeNames;

   return ev.data;
};

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
 * @property {object}   manager - Data about the plugin manager
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
 *                               path or relative to current working directory to load.
 *
 * @property {string}   plugin.targetEscaped - Provides the target, but properly escaped for RegExp usage.
 *
 * @property {string}   plugin.type - The type of plugin: `instance` +
 *                                    In Node: `import-module`, `import-path`, `require-module`, or `require-path`.
 *                                    In Browser: `import-path`, `import-url`.
 *
 * @property {object}   plugin.options - Defines an object of options for the plugin.
 */

/**
 * @typedef {object} PluginManagerOptions
 *
 * @property {boolean}   [pluginsEnabled] - If false all plugins are disabled.
 *
 * @property {boolean}   [noEventAdd] - If true this prevents plugins from being added by `plugins:add` and
 *                                      `plugins:add:all` events forcing direct method invocation for addition.
 *
 * @property {boolean}   [noEventDestroy] - If true this prevents the plugin manager from being destroyed by
 *                                          `plugins:destroy:manager` forcing direct method invocation for destruction.
 *
 * @property {boolean}   [noEventOptions] - If true this prevents setting options for the plugin manager by
 *                                          `plugins:destroy:manager` forcing direct method invocation for destruction.
 *
 * @property {boolean}   [noEventRemoval] - If true this prevents plugins from being removed by `plugins:remove` and
 *                                          `plugins:remove:all` events forcing direct method invocation for removal.
 *
 * @property {boolean}   [throwNoMethod] - If true then when a method fails to be invoked by any plugin an exception
 *                                         will be thrown.
 *
 * @property {boolean}   [throwNoPlugin] - If true then when no plugin is matched to be invoked an exception will be
 *                                         thrown.
 */

// TODO THIS NEEDS REFINEMENT
/**
 * Interface for PluginSupport implementation classes.
 *
 * @interface PluginSupportImpl
 */

/**
 * A method to invoke when the plugin manager is destroyed.
 *
 * @function
 * @async
 * @name PluginSupportImpl#destroy
 */

/**
 * A method to invoke when the plugin manager eventbus is set.
 *
 * @function
 * @name PluginSupportImpl#setEventbus
 */

const requireMod = module.createRequire(import.meta.url);

class PluginManager extends AbstractPluginManager
{
   async _loadModule(moduleOrPath)
   {
      // Convert to file path if an URL or file URL string.
      const { filepath, isESM, type, loadPath } = resolvePath(moduleOrPath);

      if (!fs.existsSync(filepath))
      {
         throw new Error(`@typhonjs-plugin/manager could not load:\n${loadPath}`);
      }

      const module = isESM ? await import(url.pathToFileURL(filepath)) : requireMod(filepath);

      // Please note that a plugin or other logger must be setup on the associated eventbus.
      if (this._eventbus !== null && typeof this._eventbus !== 'undefined')
      {
         this._eventbus.trigger('log:debug', `@typhonjs-plugin/manager - ${isESM ? 'import' : 'require'}: ${loadPath}`);
      }

      let instance;

      // If the module has a named export for `onPluginLoad` then take the module.
      if (typeof module.onPluginLoad === 'function')
      {
         instance = module;
      }
      // Then potentially resolve any default export / static class.
      else if (module.default)
      {
         instance = module.default;
      }
      // Finally resolve as just the module.
      else
      {
         instance = module;
      }

      return { instance, type };
   }
}

// Module Private ----------------------------------------------------------------------------------------------------

/**
 * For `.js` files uses `getPackageType` to determine if `type` is set to `module` in associated `package.json`. If
 * the `modulePath` provided ends in `.mjs` it is assumed to be ESM.
 *
 * @param {string} filepath - File path to load.
 *
 * @returns {boolean} If the filepath is an ES Module.
 */
function isPathModule(filepath)
{
   const extension = path.extname(filepath).toLowerCase();

   switch (extension)
   {
      case '.js':
         return getPackageType({ filepath }) === 'module';

      case '.mjs':
         return true;

      default:
         return false;
   }
}

/**
 * Resolves a modulePath first by `require.resolve` to allow Node to resolve an actual module. If this fails then
 * the `moduleOrPath` is resolved as a file path.
 *
 * @param {string} moduleOrPath - A module name or file path to load.
 *
 * @returns {{filepath: string, isESM: boolean, type: string, loadPath: string}} An object including file path and
 *                                                                               whether the module is ESM.
 */
function resolvePath(moduleOrPath)
{
   let filepath, isESM, type = 'module';

   let loadPath = moduleOrPath;

   try
   {
      filepath = requireMod.resolve(moduleOrPath);
      isESM = isPathModule(filepath);
   }
   catch (error)
   {
      if (moduleOrPath instanceof URL || moduleOrPath.startsWith('file:'))
      {
         filepath = url.fileURLToPath(moduleOrPath);
         type = 'url';

         loadPath = moduleOrPath instanceof URL ? moduleOrPath.toString() : moduleOrPath;
      }
      else
      {
         filepath = path.resolve(moduleOrPath);
         type = 'path';

         loadPath = filepath;
      }

      isESM = isPathModule(filepath);
   }

   type = `${isESM ? 'import' : 'require'}-${type}`;

   return { filepath, isESM, type, loadPath };
}

/**
 * Provides a lightweight plugin manager for Node / NPM & the browser with eventbus integration for plugins in a safe
 * and protected manner across NPM modules, local files, and preloaded object instances. This pattern facilitates
 * message passing between modules versus direct dependencies / method invocation.
 *
 * It isn't necessary to use an eventbus associated with the plugin manager though invocation then relies on invoking
 * methods directly with the plugin manager instance.
 *
 * A default eventbus will be created, but you may also pass in an eventbus from `@typhonjs-plugin/eventbus` and the
 * plugin manager will register by default under these event categories:
 *
 * `plugins:get:all:plugin:data` - {@link PluginSupport#getAllPluginData}
 *
 * `plugins:get:method:names` - {@link PluginSupport#getMethodNames}
 *
 * `plugins:get:plugin:data` - {@link PluginSupport#getPluginData}
 *
 * `plugins:get:plugin:event:names` - {@link PluginSupport#getPluginEventNames}
 *
 * `plugins:get:plugin:method:names` - {@link PluginSupport#getPluginMethodNames}
 *
 * `plugins:get:plugin:names` - {@link PluginSupport#getPluginNames}
 *
 * `plugins:get:plugin:options` - {@link PluginSupport#getPluginOptions}
 *
 * `plugins:get:plugins:by:event:name` - {@link PluginSupport#getPluginsByEventName}
 *
 * `plugins:get:plugins:event:names` - {@link PluginSupport#getPluginsEventNames}
 *
 * `plugins:has:method` - {@link PluginSupport#hasMethod}
 *
 * `plugins:has:plugin:method` - {@link PluginSupport#hasPluginMethod}
 *
 * @example
 *
 * @implements {PluginSupportImpl}
 */
class PluginSupport
{
   constructor(pluginManager)
   {
      this._pluginManager = pluginManager;
   }

   get isDestroyed()
   {
      return this._pluginManager === null || this._pluginManager === void 0 ||
       this._pluginManager._pluginMap === null || this._pluginManager._pluginMap === void 0;
   }

   get pluginMap()
   {
      /* c8 ignore next 4 */
      if (this.isDestroyed)
      {
         throw new ReferenceError('This PluginManager instance has been destroyed.');
      }

      return this._pluginManager._pluginMap;
   }

   /**
    * Destroys all managed plugins after unloading them.
    *
    * @param {object}     options - An options object.
    *
    * @param {Eventbus}   options.eventbus - The eventbus to disassociate.
    *
    * @param {string}     options.eventPrepend - The current event prepend.
    */
   async destroy({ eventbus, eventPrepend } = {})
   {
      if (eventbus !== null && eventbus !== void 0)
      {
         eventbus.off(`${eventPrepend}:get:all:plugin:data`, this.getAllPluginData, this);
         eventbus.off(`${eventPrepend}:get:method:names`, this.getMethodNames, this);
         eventbus.off(`${eventPrepend}:get:plugin:data`, this.getPluginData, this);
         eventbus.off(`${eventPrepend}:get:plugin:event:names`, this.getPluginEventNames, this);
         eventbus.off(`${eventPrepend}:get:plugin:method:names`, this.getPluginMethodNames, this);
         eventbus.off(`${eventPrepend}:get:plugin:names`, this.getPluginNames, this);
         eventbus.off(`${eventPrepend}:get:plugin:options`, this.getPluginOptions, this);
         eventbus.off(`${eventPrepend}:get:plugins:by:event:name`, this.getPluginsByEventName, this);
         eventbus.off(`${eventPrepend}:get:plugins:event:names`, this.getPluginsEventNames, this);
         eventbus.off(`${eventPrepend}:has:method`, this.hasMethod, this);
         eventbus.off(`${eventPrepend}:has:plugin:method`, this.hasPluginMethod, this);
      }

      this._pluginManager = null;
   }

   /**
    * Returns all plugin data or if a boolean is passed in will return plugin data by current enabled state.
    *
    * @param {boolean|undefined} enabled - If enabled is a boolean it will return plugins given their enabled state.
    *
    * @returns {PluginData[]} A list of all PluginData or just enabled / disabled plugins.
    */
   getAllPluginData(enabled = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof enabled !== 'boolean' && typeof enabled !== 'undefined')
      {
         throw new TypeError(`'enabled' is not a 'boolean' or 'undefined'.`);
      }

      const results = [];

      // Return all plugin data if enabled is not defined.
      const allPlugins = enabled === void 0;

      for (const entry of this.pluginMap.values())
      {
         if (allPlugins || entry.enabled === enabled)
         {
            results.push(this.getPluginData(entry.name));
         }
      }

      return results;
   }

   /**
    * Returns all method names or if a boolean is passed in will return method names for plugins by current enabled
    * state.
    *
    * @param {boolean|undefined} [enabled] - If enabled is a boolean it will return plugin methods names given their
    *                                        enabled state.
    *
    * @param {string|undefined}  [pluginName] - If a string then just this plugins methods names are returned.
    *
    * @returns {string[]} A list of method names
    */
   getMethodNames(enabled = void 0, pluginName = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof enabled !== 'boolean' && typeof enabled !== 'undefined')
      {
         throw new TypeError(`'enabled' is not a 'boolean' or 'undefined'.`);
      }

      const results = {};
      const allEnabled = typeof enabled === 'undefined';
      const allNames = typeof pluginName === 'undefined';

      for (const entry of this.pluginMap.values())
      {
         if (entry.instance && (allEnabled || entry.enabled === enabled) && (allNames || entry.name === pluginName))
         {
            for (const name of s_GET_ALL_PROPERTY_NAMES(entry.instance))
            {
               // Skip any names that are not a function or are the constructor.
               if (entry.instance[name] instanceof Function && name !== 'constructor') { results[name] = true; }
            }
         }
      }

      return Object.keys(results);
   }

   /**
    * Gets the plugin data for a plugin by name.
    *
    * @param {string}   pluginName - A plugin name.
    *
    * @returns {PluginData|undefined} The plugin data for a specific plugin.
    */
   getPluginData(pluginName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginName !== 'string') { throw new TypeError(`'pluginName' is not a string.`); }

      const entry = this.pluginMap.get(pluginName);

      if (entry instanceof PluginEntry)
      {
         return JSON.parse(JSON.stringify(entry.data));
      }

      return void 0;
   }

// TODO FINISH IMPLEMENTING
   // /**
   //  * Returns the event binding names registered on any associated plugin EventbusProxy.
   //  *
   //  * @param {string}   pluginName - Plugin name to set state.
   //  *
   //  * @returns {string[]} - Event binding names registered from the plugin.
   //  *
   //  * @param {undefined|object}  [options] - Options object. If undefined all plugin enabled state is returned.
   //  *
   //  * @param {string|string[]}   [options.pluginNames] - Plugin name or list of names to get state.
   //  *
   //  * @returns {boolean|Array<{pluginName: string, enabled: boolean}>} - Event binding names registered from a
   //  *                                                                    plugin, list of plugins, or all plugins.
   //  */
   // newPluginEventNames({ pluginNames = [] } = {})
   // {
   //    if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }
   //
   //    if (typeof pluginName !== 'string') { throw new TypeError(`'pluginName' is not a string.`); }
   //
   //    const entry = this.pluginMap.get(pluginName);
   //
   //    return entry instanceof PluginEntry && entry.eventbusProxy ? entry.eventbusProxy.proxyEventNames : [];
   // }

   /**
    * Returns the event binding names registered on any associated plugin EventbusProxy.
    *
    * @param {string}   pluginName - Plugin name to set state.
    *
    * @returns {string[]} - Event binding names registered from the plugin.
    */
   getPluginEventNames(pluginName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginName !== 'string') { throw new TypeError(`'pluginName' is not a string.`); }

      const entry = this.pluginMap.get(pluginName);

      return entry instanceof PluginEntry && entry.eventbusProxy ? Array.from(entry.eventbusProxy.proxyKeys()) : [];
   }

   /**
    * Returns the event binding names registered from each plugin.
    *
    * @param {string|string[]} [nameOrList] - An array / iterable of plugin names.
    *
    * @returns {Array<{pluginName: string, events: string[]}>} A list of objects with plugin name and event binding
    *                                                          names registered from the plugin.
    */
   getPluginsEventNames(nameOrList)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof nameOrList === 'undefined') { nameOrList = this.pluginMap.keys(); }
      if (typeof nameOrList === 'string') { nameOrList = [nameOrList]; }

      const results = [];

      for (const pluginName of nameOrList)
      {
         results.push({ pluginName, events: this.getPluginEventNames(pluginName) });
      }

      return results;
   }

   /**
    * Returns the plugin names that registered the given event binding name.
    *
    * @param {string} eventName - An event name that plugins may have registered.
    *
    * @returns {string[]} A list of plugin names that has registered the given event name.
    */
   getPluginsByEventName(eventName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof eventName !== 'string') { throw new TypeError(`'eventName' is not a 'string'.`); }

      const results = [];

      const pluginEventNames = this.getPluginsEventNames();

      for (const entry of pluginEventNames)
      {
         if (entry.events.indexOf(eventName) >= 0) { results.push(entry.pluginName); }
      }

      return results;
   }

   /**
    * Returns all plugin names or if a boolean is passed in will return plugin names by current enabled state.
    *
    * @param {boolean|undefined} enabled - If enabled is a boolean it will return plugins given their enabled state.
    *
    * @returns {Array<{plugin: string, method: string}>} A list of plugin names and method names.
    */
   getPluginMethodNames(enabled = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof enabled !== 'boolean' && typeof enabled !== 'undefined')
      {
         throw new TypeError(`'enabled' is not a 'boolean' or 'undefined'.`);
      }

      const results = [];
      const allPlugins = typeof enabled === 'undefined';

      for (const entry of this.pluginMap.values())
      {
         if (entry.instance && (allPlugins || entry.enabled === enabled))
         {
            for (const name of s_GET_ALL_PROPERTY_NAMES(entry.instance))
            {
               // Skip any names that are not a function or are the constructor.
               if (entry.instance[name] instanceof Function && name !== 'constructor')
               {
                  results.push({ plugin: entry.name, method: name });
               }
            }
         }
      }

      return results;
   }

   /**
    * Returns all plugin names or if a boolean is passed in will return plugin names by current enabled state.
    *
    * @param {boolean|undefined} enabled - If enabled is a boolean it will return plugins given their enabled state.
    *
    * @returns {string[]} A list of plugin names optionally by enabled state.
    */
   getPluginNames(enabled = void 0)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof enabled !== 'boolean' && typeof enabled !== 'undefined')
      {
         throw new TypeError(`'enabled' is not a 'boolean' or 'undefined'.`);
      }

      // Return all plugin names if enabled is not defined.
      if (enabled === void 0) { return Array.from(this.pluginMap.keys()); }

      const results = [];

      for (const entry of this.pluginMap.values())
      {
         if (entry.enabled === enabled) { results.push(entry.name); }
      }

      return results;
   }

   /**
    * Returns a copy of the given plugin options.
    *
    * @param {string}   pluginName - Plugin name to retrieve.
    *
    * @returns {*} A copy of the given plugin options.
    */
   getPluginOptions(pluginName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginName !== 'string') { throw new TypeError(`'pluginName' is not a string.`); }

      let result;

      const entry = this.pluginMap.get(pluginName);

      if (entry instanceof PluginEntry) { result = JSON.parse(JSON.stringify(entry.data.plugin.options)); }

      return result;
   }

   /**
    * Returns true if there is at least one plugin loaded with the given method name.
    *
    * @param {string}   methodName - Method name to test.
    *
    * @returns {boolean} - True method is found.
    */
   hasMethod(methodName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof methodName !== 'string') { throw new TypeError(`'methodName' is not a string.`); }

      for (const plugin of this.pluginMap.values())
      {
         if (typeof plugin.instance[methodName] === 'function') { return true; }
      }

      return false;
   }

   /**
    * Returns true if there is a plugin loaded with the given plugin name that also has a method with the given
    * method name.
    *
    * @param {string}   pluginName - Plugin name to test.
    * @param {string}   methodName - Method name to test.
    *
    * @returns {boolean} - True if a plugin and method exists.
    */
   hasPluginMethod(pluginName, methodName)
   {
      if (this.isDestroyed) { throw new ReferenceError('This PluginManager instance has been destroyed.'); }

      if (typeof pluginName !== 'string') { throw new TypeError(`'pluginName' is not a string.`); }
      if (typeof methodName !== 'string') { throw new TypeError(`'methodName' is not a string.`); }

      const plugin = this.pluginMap.get(pluginName);

      return plugin instanceof PluginEntry && typeof plugin[methodName] === 'function';
   }

   /**
    * Sets the eventbus associated with this plugin manager. If any previous eventbus was associated all plugin manager
    * events will be removed then added to the new eventbus. If there are any existing plugins being managed their
    * events will be removed from the old eventbus and then `onPluginLoad` will be called with the new eventbus.
    *
    * @param {object}     options - An options object.
    *
    * @param {Eventbus}   options.oldEventbus - The old eventbus to disassociate.
    *
    * @param {Eventbus}   options.newEventbus - The new eventbus to associate.
    *
    * @param {string}     options.oldPrepend - The old event prepend.
    *
    * @param {string}     options.newPrepend - The new event prepend.
    */
   setEventbus({ oldEventbus, newEventbus, oldPrepend, newPrepend } = {})
   {
      if (oldEventbus !== null && oldEventbus !== void 0)
      {
         oldEventbus.off(`${oldPrepend}:get:all:plugin:data`, this.getAllPluginData, this);
         oldEventbus.off(`${oldPrepend}:get:method:names`, this.getMethodNames, this);
         oldEventbus.off(`${oldPrepend}:get:plugin:data`, this.getPluginData, this);
         oldEventbus.off(`${oldPrepend}:get:plugin:event:names`, this.getPluginEventNames, this);
         oldEventbus.off(`${oldPrepend}:get:plugin:method:names`, this.getPluginMethodNames, this);
         oldEventbus.off(`${oldPrepend}:get:plugin:names`, this.getPluginNames, this);
         oldEventbus.off(`${oldPrepend}:get:plugin:options`, this.getPluginOptions, this);
         oldEventbus.off(`${oldPrepend}:get:plugins:by:event:name`, this.getPluginsByEventName, this);
         oldEventbus.off(`${oldPrepend}:get:plugins:event:names`, this.getPluginsEventNames, this);
         oldEventbus.off(`${oldPrepend}:has:method`, this.hasMethod, this);
         oldEventbus.off(`${oldPrepend}:has:plugin:method`, this.hasPluginMethod, this);
      }

      if (newEventbus !== null && newEventbus !== void 0)
      {
         newEventbus.on(`${newPrepend}:get:all:plugin:data`, this.getAllPluginData, this);
         newEventbus.on(`${newPrepend}:get:method:names`, this.getMethodNames, this);
         newEventbus.on(`${newPrepend}:get:plugin:data`, this.getPluginData, this);
         newEventbus.on(`${newPrepend}:get:plugin:event:names`, this.getPluginEventNames, this);
         newEventbus.on(`${newPrepend}:get:plugin:method:names`, this.getPluginMethodNames, this);
         newEventbus.on(`${newPrepend}:get:plugin:names`, this.getPluginNames, this);
         newEventbus.on(`${newPrepend}:get:plugin:options`, this.getPluginOptions, this);
         newEventbus.on(`${newPrepend}:get:plugins:by:event:name`, this.getPluginsByEventName, this);
         newEventbus.on(`${newPrepend}:get:plugins:event:names`, this.getPluginsEventNames, this);
         newEventbus.on(`${newPrepend}:has:method`, this.hasMethod, this);
         newEventbus.on(`${newPrepend}:has:plugin:method`, this.hasPluginMethod, this);
      }
   }
}

// Module Private ----------------------------------------------------------------------------------------------------

/**
 * Walks an objects inheritance tree collecting property names stopping before `Object` is reached.
 *
 * @param {object}   obj - object to walks.
 *
 * @returns {string[]} A list of property names.
 * @ignore
 */
const s_GET_ALL_PROPERTY_NAMES = (obj) =>
{
   const props = [];

   do
   {
      Object.getOwnPropertyNames(obj).forEach((prop) => { if (props.indexOf(prop) === -1) { props.push(prop); } });
      obj = Object.getPrototypeOf(obj);
   } while (typeof obj !== 'undefined' && obj !== null && !(obj === Object.prototype));

   return props;
};

/**
 * @typedef {object} PluginData
 *
 * @property {object}   manager - Data about the plugin manager
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
 *                               path or relative to current working directory to load.
 *
 * @property {string}   plugin.targetEscaped - Provides the target, but properly escaped for RegExp usage.
 *
 * @property {string}   plugin.type - The type of plugin: `instance` +
 *                                    In Node: `import-module`, `import-path`, `require-module`, or `require-path`.
 *                                    In Browser: `import-path`, `import-url`.
 *
 * @property {object}   plugin.options - Defines an object of options for the plugin.
 */

/**
 * Interface for PluginSupport instances.
 *
 * @interface PluginSupportImpl
 */

/**
 * A method to invoke when the plugin manager is destroyed.
 *
 * @function
 * @async
 * @name PluginSupportImpl#destroy
 */

/**
 * A method to invoke when the plugin manager eventbus is set.
 *
 * @function
 * @async
 * @name PluginSupportImpl#setEventbus
 */

export default PluginManager;
export { Eventbus, EventbusProxy, PluginSupport, isValidConfig };
//# sourceMappingURL=PluginManager.js.map
