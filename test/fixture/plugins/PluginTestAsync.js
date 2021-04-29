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
    *
    * @returns {Promise} A Promise.
    */
   onPluginLoad(ev)
   {
      ev.eventbus.on('plugin:test:async:test', this.test, this);

      return new Promise((resolve) =>
      {
         setTimeout(() => resolve(), 1000);
      });
   }

   /**
    * Returns a number result.
    *
    * @param {number} a - A number.
    * @param {number} b - A number.
    *
    * @returns {Promise<number>} A Promise / number.
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
    *
    * @param {object} event - PluginEvent - A plugin event.
    *
    * @returns {Promise<number>} A Promise / number.
    */
   test2(event)
   {
      return new Promise((resolve) =>
      {
         setTimeout(() => resolve(event.data.result.count++), 1000);
      });
   }
}
