export function onPluginLoad(ev)
{
   console.log('onPluginLoad: Loaded named export / module.');

   ev.eventbus.on('test:message', () => console.log('test:message from namedExport'));
}
