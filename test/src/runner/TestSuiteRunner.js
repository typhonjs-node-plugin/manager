import APIErrors              from './tests/APIErrors.js';
import Runtime                from './tests/Runtime.js';
import RuntimeInvoke          from './tests/RuntimeInvoke.js';
import RuntimeInvokeASync     from './tests/RuntimeInvokeAsync.js';
import RuntimeInvokeSync      from './tests/RuntimeInvokeSync.js';
import PluginSupportAPIErrors from './tests/PluginSupportAPIErrors.js';
import PluginSupport          from './tests/PluginSupport.js';
import UtilsEscapeTarget      from './tests/UtilsEscapeTarget.js';
import UtilsIsValidConfig     from './tests/UtilsIsValidConfig.js';

const s_API_ERRORS                  = true;
const s_RUNTIME                     = true;
const s_RUNTIME_INVOKE              = true;
const s_RUNTIME_INVOKE_ASYNC        = true;
const s_RUNTIME_INVOKE_SYNC         = true;
const s_PLUGIN_SUPPORT_API_ERRORS   = true;
const s_PLUGIN_SUPPORT              = true;
const s_UTILS_ESCAPE_TARGET         = true;
const s_UTILS_IS_VALID_CONFIG       = true;

const s_TESTS = [];

if (s_API_ERRORS) { s_TESTS.push(APIErrors); }
if (s_RUNTIME) { s_TESTS.push(Runtime); }
if (s_RUNTIME_INVOKE) { s_TESTS.push(RuntimeInvoke); }
if (s_RUNTIME_INVOKE_ASYNC) { s_TESTS.push(RuntimeInvokeASync); }
if (s_RUNTIME_INVOKE_SYNC) { s_TESTS.push(RuntimeInvokeSync); }
if (s_PLUGIN_SUPPORT_API_ERRORS) { s_TESTS.push(PluginSupportAPIErrors); }
if (s_PLUGIN_SUPPORT) { s_TESTS.push(PluginSupport); }
if (s_UTILS_ESCAPE_TARGET) { s_TESTS.push(UtilsEscapeTarget); }
if (s_UTILS_IS_VALID_CONFIG) { s_TESTS.push(UtilsIsValidConfig); }

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
