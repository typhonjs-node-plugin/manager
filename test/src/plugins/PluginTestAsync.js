/**
 * Defines an asynchronous test class.
 */
export default class PluginTestAsync
{
   /**
    * A ctor
    */
   constructor() { this.c = 3; }

   /**
    * Provides a delayed promise.
    * @returns {Promise}
    */
   onPluginLoad()
   {
      return new Promise((resolve) =>
      {
         setTimeout(() => resolve(), 1000);
      });
   }

   /**
    * Returns a number result.
    * @param {number} a - A number.
    * @param {number} b - A number.
    * @returns {Promise<number>}
    */
   test(a, b)
   {
      return new Promise((resolve) =>
      {
         setTimeout(() => resolve(a + b + this.c), 1000);
      });
   }

   /**
    * Increments a result count after a 1 second delay.
    * @param {PluginEvent} event - A plugin event.
    * @returns {Promise<PluginEvent>}
    */
   test2(event)
   {
      return new Promise((resolve) =>
      {
         setTimeout(() => resolve(event.data.result.count++), 1000);
      });
   }
}
