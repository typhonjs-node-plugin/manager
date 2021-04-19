const s_EVENT_RUN_END = 'end';
const s_EVENT_TEST_FAIL = 'fail';

/**
 * Instruments a Mocha runner with the Spec reporter with a modification to force color usage in the browser.
 *
 * When the Mocha runner finishes all tests a message [MOCHA_PASSED] or [MOCHA_FAILED] is output to the console.
 *
 * @param {object}   runner - Mocha runner.
 *
 * @param {boolean}  [useColors=true] - Output console colors.
 */
export default function mochaConsoleLog(runner, useColors = true)
{
   Mocha.reporters.Spec.super_.useColors = useColors;
   new Mocha.reporters.Spec(runner);

   let failed = false;

   runner.once(s_EVENT_TEST_FAIL, () =>
   {
      failed = true;
   });

   runner.once(s_EVENT_RUN_END, () =>
   {
      console.log(`[MOCHA_${failed ? 'FAILED' : 'PASSED'}]`);
   });
}
