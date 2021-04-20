import APIErrors              from './tests/APIErrors.js';
import APIErrorsPluginSupport from './tests/APIErrorsPluginSupport.js';
import IsValidConfig          from './tests/IsValidConfig.js';
import PluginSupport          from './tests/PluginSupport.js';
import Runtime                from './tests/Runtime.js';

const s_API_ERRORS                  = true;
const s_API_ERRORS_PLUGIN_SUPPORT   = true;
const s_IS_VALID_CONFIG             = true;
const s_PLUGIN_SUPPORT              = true;
const s_RUNTIME                     = true;

const s_TESTS = [];

if (s_API_ERRORS) { s_TESTS.push(APIErrors); }
if (s_API_ERRORS_PLUGIN_SUPPORT) { s_TESTS.push(APIErrorsPluginSupport); }
if (s_IS_VALID_CONFIG) { s_TESTS.push(IsValidConfig); }
if (s_PLUGIN_SUPPORT) { s_TESTS.push(PluginSupport); }
if (s_RUNTIME) { s_TESTS.push(Runtime); }

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
