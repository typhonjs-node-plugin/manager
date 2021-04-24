const s_TARGET_DATA = [
   './some/target/path.js',
   '../some/target/path.js',
   '../../../some/target/path.js',

   '.\\some\\target\\path.js',
   '..\\some\\target\\path.js',
   '..\\..\\..\\some\\target\\path.js',

   new URL('http://localhost:8080/some/target/path.js'),
   new URL('https://localhost:8080/some/target/path.js'),
   new URL('file:///some/target/path.js'),

   'http://localhost:8080/some/target/path.js',
   'https://localhost:8080/some/target/path.js',
   'file:///some/target/path.js'
];

const s_TARGET_VERIFY = [
   'some/target/path.js',
   'some/target/path.js',
   'some/target/path.js',

   'some\\\\target\\\\path.js',
   'some\\\\target\\\\path.js',
   'some\\\\target\\\\path.js',

   '/some/target/path.js',
   '/some/target/path.js',
   '/some/target/path.js',

   '/some/target/path.js',
   '/some/target/path.js',
   '/some/target/path.js'
];

export default class UtilsEscapeTarget
{
   static run(Module, data, chai)
   {
      const { assert, expect } = chai;

      const { escapeTarget } = Module;

      describe('Utility:', () =>
      {
         describe('escapeTarget:', () =>
         {
            for (let cntr = 0; cntr < s_TARGET_DATA.length; cntr++)
            {
               const target = s_TARGET_DATA[cntr];

               const targetString = target instanceof URL ? target.toString() : target;

               const escaped = escapeTarget(target);

               it(`${targetString} -> ${escaped}`, () =>
               {
                  assert.strictEqual(escaped, s_TARGET_VERIFY[cntr]);

                  let regex;

                  expect(() => { regex = new RegExp(escaped); }).to.not.throw();

                  assert.isTrue(regex.test(targetString));
               });
            }
         });
      });
   }
}
