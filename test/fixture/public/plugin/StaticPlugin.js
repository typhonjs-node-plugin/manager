export default class StaticPlugin
{
   static onPluginLoad(ev)
   {
      console.log('onPluginLoad: Loaded plugin StaticPlugin.');

      ev.eventbus.on('test:message', () => console.log('test:message from StaticPlugin'));
   }
}
