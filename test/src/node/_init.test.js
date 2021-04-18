import fs               from 'fs-extra';
import path             from 'path';
import url              from 'url';

import chai             from 'chai';
import chaiAsPromised   from 'chai-as-promised';

import * as Module      from '../../../dist/node/PluginManager.js';

import TestSuiteRunner  from '../runner/TestSuiteRunner.js';

chai.use(chaiAsPromised);

fs.ensureDirSync('./.nyc_output');
fs.emptyDirSync('./.nyc_output');

fs.ensureDirSync('./coverage');
fs.emptyDirSync('./coverage');

const data = {
   suitePrefix: 'node/PluginManager',

   moduleURL: url.pathToFileURL(path.resolve('./test/fixture/esm/namedExport.js'))
};

TestSuiteRunner.run(Module, data, chai);
