import path                from 'path';
import url                 from 'url';

import { assert }          from 'chai';

import { isValidConfig }   from '../../../src/node/index.js';
import NodePluginManager   from '../../../src/node/index.js';

import tests               from '../../utils/tests.js';

if (tests.isValidConfig)
{
   describe('PluginConfig checks:', () =>
   {
      describe('isValidConfig:', () =>
      {
         it('is valid', () =>
         {
            assert.isTrue(isValidConfig({ name: 'test' }));
            assert.isTrue(isValidConfig({ name: 'test', target: 'target' }));
            assert.isTrue(isValidConfig({ name: 'test', target: 'target', options: {} }));
            assert.isTrue(isValidConfig({ name: 'test', options: {} }));
            assert.isTrue(isValidConfig({
               name: 'test',
               target: url.pathToFileURL(path.resolve('./test/fixture/esm/namedExport.js'))
            }));
         });

         it('is invalid', () =>
         {
            assert.isFalse(isValidConfig());
            assert.isFalse(isValidConfig({}));
            assert.isFalse(isValidConfig({ name: 123 }));
            assert.isFalse(isValidConfig({ target: 'target' }));
            assert.isFalse(isValidConfig({ options: {} }));
            assert.isFalse(isValidConfig({ name: 'test', target: 123 }));
            assert.isFalse(isValidConfig({ name: 'test', target: 'target', options: 123 }));
            assert.isFalse(isValidConfig({ name: 'test', options: 123 }));
         });
      });

      describe('NodePluginManager -> isValidConfig:', () =>
      {
         let pluginManager;

         beforeEach(() =>
         {
            pluginManager = new NodePluginManager();
         });

         it('PluginConfig is valid', () =>
         {
            assert.isTrue(pluginManager.isValidConfig({ name: 'test' }));
            assert.isTrue(pluginManager.isValidConfig({ name: 'test', target: 'target' }));
            assert.isTrue(pluginManager.isValidConfig({ name: 'test', target: 'target', options: {} }));
            assert.isTrue(pluginManager.isValidConfig({ name: 'test', options: {} }));
            assert.isTrue(pluginManager.isValidConfig({
               name: 'test',
               target: url.pathToFileURL(path.resolve('./test/fixture/esm/namedExport.js'))
            }));
         });

         it('PluginConfig is invalid', () =>
         {
            assert.isFalse(pluginManager.isValidConfig());
            assert.isFalse(pluginManager.isValidConfig({}));
            assert.isFalse(pluginManager.isValidConfig({ name: 123 }));
            assert.isFalse(pluginManager.isValidConfig({ target: 'target' }));
            assert.isFalse(pluginManager.isValidConfig({ options: {} }));
            assert.isFalse(pluginManager.isValidConfig({ name: 'test', target: 123 }));
            assert.isFalse(pluginManager.isValidConfig({ name: 'test', target: 'target', options: 123 }));
            assert.isFalse(pluginManager.isValidConfig({ name: 'test', options: 123 }));
         });
      });
   });
}