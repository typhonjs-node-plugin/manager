import fs                  from 'fs-extra';
import path                from 'path';
import url                 from 'url';

import chai                from 'chai';
import chaiAsPromised      from 'chai-as-promised';

import * as Module         from '../../../dist/node/PluginManager.js';

import TestSuiteRunner     from '../runner/TestSuiteRunner.js';

import PluginTest          from '../../fixture/plugins/PluginTest.js';
import PluginTestNoName2   from '../../fixture/plugins/PluginTestNoName2.js';
import PluginTestAsync     from '../../fixture/plugins/PluginTestAsync.js';
import PluginTestSync      from '../../fixture/plugins/PluginTestSync.js';

chai.use(chaiAsPromised);

fs.ensureDirSync('./.nyc_output');
fs.emptyDirSync('./.nyc_output');

fs.ensureDirSync('./coverage');
fs.emptyDirSync('./coverage');

const moduleURL = url.pathToFileURL(path.resolve('./test/fixture/formats/esm/namedExport.js'));
const moduleURLString = moduleURL.toString();

const data = {
   suitePrefix: 'node/PluginManager',
   moduleURL,
   moduleURLString,
   isBrowser: false,

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
      { name: '@typhonjs-utils/package-json', type: 'import-module' },
      { name: 'ESM-URL-namedExport', target: moduleURL, type: 'import-url' },
      { name: 'ESM-file-URL-namedExport', target: moduleURLString, type: 'import-url' }
   ]
};

TestSuiteRunner.run(Module, data, chai);
