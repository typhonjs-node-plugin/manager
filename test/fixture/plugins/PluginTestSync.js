/**
 * Defines a synchronous test class.
 */
export default class PluginTestSync
{
   /**
    * A ctor
    */
   constructor() { this.c = 3; }

   /**
    * Returns a number result.
    *
    * @param {number} a - A number.
    * @param {number} b - A number.
    *
    * @returns {number} A number.
    */
   test(a, b) { return a + b + this.c; }

   /**
    * Set event binding to `test`.
    *
    * @param {object}   ev PluginInvokeEvent
    */
   onPluginLoad(ev)
   {
      ev.eventbus.on('plugin:test:sync:test', this.test, this);
   }
}
