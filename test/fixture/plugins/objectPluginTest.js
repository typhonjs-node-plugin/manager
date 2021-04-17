import { assert } from 'chai';

/**
 * A plugin object
 */
const objectPluginTest =
{
   test: (event) =>
   {
      event.data.result.count++;
      assert.strictEqual(event.pluginName, 'objectPluginTest');
   },

   onPluginLoad: (ev) =>
   {
      if (ev.eventbus)
      {
         ev.eventbus.on('test:trigger', () => {});
         ev.eventbus.on('test:trigger4', () => {});
         ev.eventbus.on('test:trigger5', () => {});
      }
   }
};

export default objectPluginTest;
