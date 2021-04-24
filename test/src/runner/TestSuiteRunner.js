import APIErrors              from './tests/core/APIErrors.js';
import Runtime                from './tests/core/Runtime.js';

import UtilsEscapeTarget      from './tests/utils/UtilsEscapeTarget.js';
import UtilsIsValidConfig     from './tests/utils/UtilsIsValidConfig.js';

import PISAPIErrors           from './tests/support/invoke/APIErrors.js';
import PISRuntime             from './tests/support/invoke/Runtime.js';
import PISRuntimeInvoke       from './tests/support/invoke/RuntimeInvoke.js';
import PISRuntimeInvokeASync  from './tests/support/invoke/RuntimeInvokeAsync.js';
import PISRuntimeInvokeSync   from './tests/support/invoke/RuntimeInvokeSync.js';

const s_API_ERRORS                  = true;
const s_RUNTIME                     = false;

const s_UTILS_ESCAPE_TARGET         = false;
const s_UTILS_IS_VALID_CONFIG       = false;

const s_PIS_API_ERRORS              = false;
const s_PIS_RUNTIME                 = false;
const s_PIS_RUNTIME_INVOKE          = false;
const s_PIS_RUNTIME_INVOKE_ASYNC    = false;
const s_PIS_RUNTIME_INVOKE_SYNC     = false;

const s_TESTS = [];

if (s_API_ERRORS) { s_TESTS.push(APIErrors); }
if (s_RUNTIME) { s_TESTS.push(Runtime); }

if (s_UTILS_ESCAPE_TARGET) { s_TESTS.push(UtilsEscapeTarget); }
if (s_UTILS_IS_VALID_CONFIG) { s_TESTS.push(UtilsIsValidConfig); }

if (s_PIS_API_ERRORS) { s_TESTS.push(PISAPIErrors); }
if (s_PIS_RUNTIME) { s_TESTS.push(PISRuntime); }
if (s_PIS_RUNTIME_INVOKE) { s_TESTS.push(PISRuntimeInvoke); }
if (s_PIS_RUNTIME_INVOKE_ASYNC) { s_TESTS.push(PISRuntimeInvokeASync); }
if (s_PIS_RUNTIME_INVOKE_SYNC) { s_TESTS.push(PISRuntimeInvokeSync); }

export default class TestSuiteRunner
{
   static run(Module, data, chai)
   {
      for (const Test of s_TESTS)
      {
         Test.run(Module, data, chai);
      }
   }
}
