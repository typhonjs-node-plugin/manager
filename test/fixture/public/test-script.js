import PluginManager from '@typhonjs-plugin/manager';

const pluginManager = new PluginManager();

const eventbus = pluginManager.createEventbusProxy();

await pluginManager.add({ name: '@typhonjs-util/test' });
await pluginManager.add({ name: 'StaticPlugin', target: './plugin/StaticPlugin.js' });
// await pluginManager.add({ name: 'namedExport', target: './plugin/namedExport.js' });

await pluginManager.add({ name: 'namedExport', target: new URL('http://localhost:8080/plugin/namedExport.js') });

eventbus.trigger('test:message');
