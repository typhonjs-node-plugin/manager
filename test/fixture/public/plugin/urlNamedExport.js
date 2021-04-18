/**
 * @param {object} ev -
 */
export function onPluginLoad(ev)
{
   console.log('onPluginLoad: Loaded urlNamedExport.');

   ev.eventbus.on('test:message', () => console.log('test:message from urlNamedExport'));
}
