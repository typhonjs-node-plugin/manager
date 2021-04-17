/**
 * Increments a result count.
 */
export default class PluginTestNoName2
{
   /**
    * Increments a result count.
    *
    * @param {object} event - PluginEvent - A plugin event.
    */
   test2(event) { event.data.result.count++; }
}
