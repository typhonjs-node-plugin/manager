import PluginManager from '@typhonjs-plugin/manager';

const pluginManager = new PluginManager();

const eventbus = pluginManager.createEventbusProxy();

let pData;

pData = await pluginManager.add({ name: '@typhonjs-util/test' });
console.log(`pData.plugin.type: ${pData.plugin.type}`);

pData = await pluginManager.add({ name: 'StaticPlugin', target: './plugin/StaticPlugin.js' });
console.log(`pData.plugin.type: ${pData.plugin.type}`);

pData = await pluginManager.add({ name: 'namedExport', target: './plugin/namedExport.js' });
console.log(`pData.plugin.type: ${pData.plugin.type}`);

pData = await pluginManager.add({ name: 'urlNamedExport', target: new URL('http://localhost:8080/plugin/urlNamedExport.js') });
console.log(`pData.plugin.type: ${pData.plugin.type}`);

pData = await pluginManager.add({ name: 'urlNamedExportBare', target: 'http://localhost:8080/plugin/urlNamedExportBare.js' });
console.log(`pData.plugin.type: ${pData.plugin.type}`);

pData = await eventbus.triggerAsync('plugins:async:add', {
   name: 'eventbusNamedExport',
   target: './plugin/eventbusNamedExport.js'
});
console.log(`pData.plugin.type: ${pData.plugin.type}`);

eventbus.trigger('test:message');
