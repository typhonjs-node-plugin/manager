import TestsuiteRunner              from '@typhonjs-build-test/testsuite-runner';

import * as APIErrors               from './tests/core/APIErrors.js';
import * as Runtime                 from './tests/core/Runtime.js';

import * as UtilsEscapeTarget       from './tests/utils/UtilsEscapeTarget.js';
import * as UtilsIsValidConfig      from './tests/utils/UtilsIsValidConfig.js';

import * as PISAPIErrors            from './tests/support/invoke/APIErrors.js';
import * as PISRuntime              from './tests/support/invoke/Runtime.js';
import * as PISRuntimeInvoke        from './tests/support/invoke/RuntimeInvoke.js';
import * as PISRuntimeInvokeASync   from './tests/support/invoke/RuntimeInvokeAsync.js';
import * as PISRuntimeInvokeSync    from './tests/support/invoke/RuntimeInvokeSync.js';

const data = { name: 'PluginManager' };

export default new TestsuiteRunner({
   APIErrors,
   Runtime,
   UtilsEscapeTarget,
   UtilsIsValidConfig,
   PISAPIErrors,
   PISRuntime,
   PISRuntimeInvoke,
   PISRuntimeInvokeASync,
   PISRuntimeInvokeSync,
}, data);
