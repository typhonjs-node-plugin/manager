import fs                  from 'fs-extra';
import path                from 'path';
import url                 from 'url';

import * as ModuleEB       from '../../../dist/eventbus/index.js';
import * as Module         from '../../../dist/node/PluginManager.js';

import TestsuiteRunner     from '../runner/TestsuiteRunner.js';

import PluginTest          from '../../fixture/plugins/PluginTest.js';
import PluginTestNoName2   from '../../fixture/plugins/PluginTestNoName2.js';
import PluginTestAsync     from '../../fixture/plugins/PluginTestAsync.js';
import PluginTestSync      from '../../fixture/plugins/PluginTestSync.js';

fs.ensureDirSync('./.nyc_output');
fs.emptyDirSync('./.nyc_output');

fs.ensureDirSync('./coverage');
fs.emptyDirSync('./coverage');

const moduleURL = url.pathToFileURL(path.resolve('./test/fixture/formats/esm/namedExport.js'));
const moduleURLString = moduleURL.toString();

// Test to make sure module exports field properly resolves with Node 12.17+ The plugin is export scoped.
const moduleExports = '@typhonjs-utils/object/plugin';

const data = {
   moduleURL,
   moduleURLString,
   moduleExports,
   isBrowser: false,
   isNode12_2: process.version === 'v12.2.0',

   plugins: {
      PluginTest,
      PluginTestNoName2,
      PluginTestAsync,
      PluginTestSync
   },

   pluginFormats: [
      { name: 'CJS-InstancePlugin', target: './test/fixture/formats/cjs/InstancePlugin.js', type: 'require-path' },
      { name: 'CJS-StaticPlugin', target: './test/fixture/formats/cjs/StaticPlugin.js', type: 'require-path' },
      { name: 'CJS-namedExport', target: './test/fixture/formats/cjs/namedExport.js', type: 'require-path' },
      { name: 'ESM-InstancePlugin', target: './test/fixture/formats/esm/InstancePlugin.js', type: 'import-path' },
      { name: 'ESM-StaticPlugin', target: './test/fixture/formats/esm/StaticPlugin.js', type: 'import-path' },
      { name: 'ESM-namedExport', target: './test/fixture/formats/esm/namedExport.js', type: 'import-path' },
      { name: '@typhonjs-utils/object', type: 'import-module' },
      { name: 'ESM-URL-namedExport', target: moduleURL, type: 'import-url' },
      { name: 'ESM-file-URL-namedExport', target: moduleURLString, type: 'import-url' }
   ]
};

TestsuiteRunner.run({ Module, ModuleEB, data });
