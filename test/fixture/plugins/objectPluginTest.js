/**
 * A plugin object
 */
const objectPluginTest =
{
   test: (event) =>
   {
      event.data.result.count++;

      if (event.pluginName !== 'objectPluginTest') { throw new Error(`event.pluginName !== objectPluginTest`); }
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
