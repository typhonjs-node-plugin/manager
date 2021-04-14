export function onPluginLoad(ev)
{
   console.log('onPluginLoad: Loaded input map plugin @typhonjs-util/test');

   ev.eventbus.on('test:message', () => console.log('test:message from TestInputMap'));
}
