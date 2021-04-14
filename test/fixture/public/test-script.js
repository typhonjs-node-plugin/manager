import PluginManager from '@typhonjs-plugin/manager';

const pluginManager = new PluginManager();

const eventbus = pluginManager.createEventbusProxy();

await pluginManager.add({ name: '@typhonjs-util/test' });
await pluginManager.add({ name: 'StaticPlugin', target: './plugin/StaticPlugin.js' });
await pluginManager.add({ name: 'namedExport', target: './plugin/namedExport.js' });
await pluginManager.add({ name: 'urlNamedExport', target: new URL('http://localhost:8080/plugin/urlNamedExport.js') });
await pluginManager.add({ name: 'urlNamedExportBare', target: 'http://localhost:8080/plugin/urlNamedExportBare.js' });

await eventbus.triggerAsync('plugins:async:add', {
   name: 'eventbusNamedExport',
   target: './plugin/eventbusNamedExport.js'
});

eventbus.trigger('test:message');
