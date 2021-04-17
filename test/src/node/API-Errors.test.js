import { expect }          from 'chai';

import NodePluginManager   from '../../../src/node/index.js';
import PluginEntry         from '../../../src/PluginEntry.js';

import tests               from '../../utils/tests.js';

if (tests.apiErrors)
{
   describe('API Errors:', () =>
   {
      describe('NodePluginManager:', () =>
      {
         let pluginManager;

         beforeEach(() =>
         {
            pluginManager = new NodePluginManager();
         });

         it('constructor - throws w/ options not an object', async () =>
         {
            expect(() => new NodePluginManager(false)).to.throw(TypeError, `'options' is not an object.`);
         });

         it('add - throws w/ no pluginConfig', async () =>
         {
            await expect(pluginManager.add()).to.be.rejectedWith(TypeError, `'pluginConfig' is not an object.`);

            const pluginConfig = { name: false };
            await expect(pluginManager.add(pluginConfig)).to.be.rejectedWith(TypeError,
             `'pluginConfig.name' is not a string for entry: ${JSON.stringify(pluginConfig)}.`);
         });

         it('add - throws w/ bad pluginConfig (name)', async () =>
         {
            const pluginConfig = { name: false };
            await expect(pluginManager.add(pluginConfig)).to.be.rejectedWith(TypeError,
             `'pluginConfig.name' is not a string for entry: ${JSON.stringify(pluginConfig)}.`);
         });

         it('add - throws w/ bad pluginConfig (target)', async () =>
         {
            const pluginConfig = { name: 'a name', target: false };
            await expect(pluginManager.add(pluginConfig)).to.be.rejectedWith(TypeError,
             `'pluginConfig.target' is not a string or URL for entry: ${JSON.stringify(pluginConfig)}.`);
         });

         it('add - throws w/ bad pluginConfig (options)', async () =>
         {
            const pluginConfig = { name: 'a name', options: false };
            await expect(pluginManager.add(pluginConfig)).to.be.rejectedWith(TypeError,
             `'pluginConfig.options' is not an object for entry: ${JSON.stringify(pluginConfig)}.`);
         });

         it('add - throws w/ bad moduleData', async () =>
         {
            const pluginConfig = { name: 'a name' };
            await expect(pluginManager.add(pluginConfig, false)).to.be.rejectedWith(TypeError,
               `'moduleData' is not an object for entry: ${JSON.stringify(pluginConfig)}.`);
         });

         it('add - already has a plugin with same name', async () =>
         {
            await pluginManager.add({ name: 'NAME', instance: {} });

            await expect(pluginManager.add({ name: 'NAME', instance: {} })).to.be.rejectedWith(Error,
             `A plugin already exists with name: NAME.`);
         });

         it('addAll - pluginConfigs not array', async () =>
         {
            await expect(pluginManager.addAll(false)).to.be.rejectedWith(TypeError,
             `'pluginConfigs' is not an array.`);
         });

         it('createEventbusProxy - throws when _eventbus is not set (artificial)', () =>
         {
            pluginManager._eventbus = null;

            expect(() => pluginManager.createEventbusProxy()).to.throw(ReferenceError,
             `No eventbus assigned to plugin manager.`);
         });

         it('invokeAsyncEvent - throws when called with empty parameters', async () =>
         {
            await expect(pluginManager.invokeAsyncEvent()).to.be.rejectedWith(TypeError,
             `'methodName' is not a string.`);
         });

         it('invokeSyncEvent - throws when called with empty parameters', () =>
         {
            expect(() => pluginManager.invokeSyncEvent()).to.throw(TypeError, `'methodName' is not a string.`);
         });

         it('pluginManager destroyed - all methods throw', async () =>
         {
            await pluginManager.destroy();

            await expect(pluginManager.add()).to.be.rejectedWith(ReferenceError,
             'This PluginManager instance has been destroyed.');

            await expect(pluginManager.addAll()).to.be.rejectedWith(ReferenceError,
             'This PluginManager instance has been destroyed.');

            await expect(pluginManager.destroy()).to.be.rejectedWith(ReferenceError,
             'This PluginManager instance has been destroyed.');
         });
      });

      describe('PluginEntry:', () =>
      {
         it('escape - throws on value not string', () =>
         {
            expect(() => PluginEntry.escape(false)).to.throw(TypeError, `'value' is not a string.`);
         });
      });
   });
}