export default class APIErrors
{
   static run(Module, data, chai)
   {
      const { expect } = chai;

      const PluginManager = Module.default;

      describe(`Core API Errors (${data.suitePrefix}):`, () =>
      {
         let pluginManager;

         beforeEach(() =>
         {
            pluginManager = new PluginManager();
         });

         it('constructor - throws w/ options not an object', () =>
         {
            expect(() => new PluginManager(false)).to.throw(TypeError, `'options' is not an object.`);
         });

         it('add - throws w/ no pluginConfig', async () =>
         {
            await expect(pluginManager.add()).to.be.rejectedWith(TypeError, `'pluginConfig' is not an object.`);

            const pluginConfig = { name: false };
            await expect(pluginManager.add(pluginConfig)).to.be.rejectedWith(TypeError,
             `'pluginConfig.name' is not a string for entry:\n${JSON.stringify(pluginConfig, null, 3)}`);
         });

         it('add - throws w/ bad pluginConfig (name)', async () =>
         {
            const pluginConfig = { name: false };
            await expect(pluginManager.add(pluginConfig)).to.be.rejectedWith(TypeError,
             `'pluginConfig.name' is not a string for entry:\n${JSON.stringify(pluginConfig, null, 3)}`);
         });

         it('add - throws w/ bad pluginConfig (target)', async () =>
         {
            const pluginConfig = { name: 'a name', target: false };
            await expect(pluginManager.add(pluginConfig)).to.be.rejectedWith(TypeError,
             `'pluginConfig.target' is not a string or URL for entry:\n${JSON.stringify(pluginConfig, null, 3)}`);
         });

         it('add - throws w/ bad pluginConfig (options)', async () =>
         {
            const pluginConfig = { name: 'a name', options: false };
            await expect(pluginManager.add(pluginConfig)).to.be.rejectedWith(TypeError,
             `'pluginConfig.options' is not an object for entry:\n${JSON.stringify(pluginConfig, null, 3)}`);
         });

         it('add - throws w/ bad moduleData', async () =>
         {
            const pluginConfig = { name: 'a name' };
            await expect(pluginManager.add(pluginConfig, false)).to.be.rejectedWith(TypeError,
             `'moduleData' is not an object for entry:\n${JSON.stringify(pluginConfig, null, 3)}`);
         });

         it('add - already has a plugin with same name', async () =>
         {
            const pluginConfig = { name: 'NAME', instance: {} };
            await pluginManager.add(pluginConfig);

            await expect(pluginManager.add(pluginConfig)).to.be.rejectedWith(Error,
             `A plugin already exists with name: NAME for entry:\n${JSON.stringify(pluginConfig, null, 3)}`);
         });

         it('add - throws w/ bad module path', async () =>
         {
            const pluginConfig = { name: 'bad-module', target: 'bad-path.js' };
            await expect(pluginManager.add(pluginConfig)).to.be.rejectedWith(Error);
         });

         it('addAll - pluginConfigs not iterable', async () =>
         {
            await expect(pluginManager.addAll(false)).to.be.rejectedWith(TypeError,
             `'pluginConfigs' is not iterable.`);
         });

         it('pluginManager destroyed - all methods throw', async () =>
         {
            await pluginManager.destroy();

            await expect(pluginManager.add()).to.be.rejectedWith(ReferenceError,
             'This PluginManager instance has been destroyed.');

            await expect(pluginManager.addAll()).to.be.rejectedWith(ReferenceError,
             'This PluginManager instance has been destroyed.');

            await expect(pluginManager.destroy()).to.be.rejectedWith(ReferenceError,
             'This PluginManager instance has been destroyed.');
         });
      });
   }
}
