import IsValidConfig from './tests/IsValidConfig.js';

const s_IS_VALID_CONFIG = true;

const s_TESTS = [];

if (s_IS_VALID_CONFIG) { s_TESTS.push(IsValidConfig); }

export default class TestSuiteRunner
{
   static run(PluginManager, config, chai)
   {
      for (const Test of s_TESTS)
      {
         Test.run(PluginManager, config, chai);
      }
   }
}
