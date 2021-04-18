import fs               from 'fs-extra';

import chai             from 'chai';
import chaiAsPromised   from 'chai-as-promised';

chai.use(chaiAsPromised);

fs.ensureDirSync('./.nyc_output');
fs.emptyDirSync('./.nyc_output');

fs.ensureDirSync('./coverage');
fs.emptyDirSync('./coverage');
