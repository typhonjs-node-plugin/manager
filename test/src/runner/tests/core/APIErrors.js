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

         it('constructor - throws w/ options.eventbus not an object', () =>
         {
            expect(() => new PluginManager({ eventbus: false })).to.throw(TypeError,
             `'options.eventbus' is not an Eventbus.`);
         });

         it('constructor - throws w/ options.eventPrepend not an string', () =>
         {
            expect(() => new PluginManager({ eventPrepend: false })).to.throw(TypeError,
             `'options.eventPrepend' is not a string.`);
         });

         it('constructor - throws w/ options.manager not an object', () =>
         {
            expect(() => new PluginManager({ manager: false })).to.throw(TypeError,
             `'options.manager' is not an object.`);
         });

         it('constructor - throws w/ options.PluginSupport not a function or iterable', () =>
         {
            expect(() => new PluginManager({ PluginSupport: false })).to.throw(TypeError,
             `'options.PluginSupport' must be a constructor function or iterable of such matching PluginSupportImpl.`);
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

            expect(() => pluginManager.createEventbusProxy()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => pluginManager.createEventbusSecure()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            await expect(pluginManager.destroy()).to.be.rejectedWith(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => pluginManager.getEnabled()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => pluginManager.getEventbus()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => pluginManager.getOptions()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => pluginManager.getPluginByEvent({ event: 'foobar' })).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => pluginManager.getPluginData()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => pluginManager.getPluginEntry()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => pluginManager.getPluginEvents()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => pluginManager.getPluginMapKeys()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => pluginManager.getPluginMapValues()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => pluginManager.getPluginNames()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => pluginManager.hasPlugins()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            await expect(pluginManager.remove({ plugins: 'foobar' })).to.be.rejectedWith(ReferenceError,
             'This PluginManager instance has been destroyed.');

            await expect(pluginManager.removeAll()).to.be.rejectedWith(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => pluginManager.setEnabled({ enabled: true })).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            await expect(pluginManager.setEventbus({ eventbus: null })).to.be.rejectedWith(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => pluginManager.setOptions()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');
         });

         it('pluginManager - missing object parameter - TypeError', async () =>
         {
            // Can't check actual error message as it is just slightly different on Node 12.2.0

            expect(() => pluginManager.getPluginByEvent()).to.throw(TypeError);

            await expect(pluginManager.reload()).to.be.rejectedWith(TypeError);

            await expect(pluginManager.remove()).to.be.rejectedWith(TypeError);

            expect(() => pluginManager.setEnabled()).to.throw(TypeError);

            await expect(pluginManager.setEventbus()).to.be.rejectedWith(TypeError);
         });

         it('getEnabled - throws w/ options.plugins not a string or iterable', () =>
         {
            expect(() => pluginManager.getEnabled({ plugins: false })).to.throw(TypeError,
             `'plugins' is not a string or iterable.`);
         });

         it('getPluginByEvent - throws w/ options.event not a string or RegExp', () =>
         {
            expect(() => pluginManager.getPluginByEvent({ event: false })).to.throw(TypeError,
             `'event' is not a string or RegExp.`);
         });

         it('getPluginData - throws w/ options.plugins not a string or iterable', () =>
         {
            expect(() => pluginManager.getPluginData({ plugins: false })).to.throw(TypeError,
             `'plugins' is not a string or iterable.`);
         });

         it('getPluginEvents - throws w/ options.plugins not a string or iterable', () =>
         {
            expect(() => pluginManager.getPluginEvents({ plugins: false })).to.throw(TypeError,
             `'plugins' is not a string or iterable.`);
         });

         it('getPluginNames - throws w/ options.enabled not a boolean', () =>
         {
            expect(() => pluginManager.getPluginNames({ enabled: 0 })).to.throw(TypeError,
             `'enabled' is not a boolean.`);
         });

         it('hasPlugins - throws w/ options.plugins not a string or iterable', () =>
         {
            expect(() => pluginManager.hasPlugins({ plugins: false })).to.throw(TypeError,
             `'plugins' is not a string or iterable.`);
         });

         it('reload - throws w/ options.plugin not a string', async () =>
         {
            await expect(pluginManager.reload({ plugin: false })).to.be.rejectedWith(TypeError,
             `'plugin' is not a string.`);
         });

         it('reload - throws w/ options.instance not an object', async () =>
         {
            await expect(pluginManager.reload({ plugin: 'foobar', instance: false })).to.be.rejectedWith(TypeError,
             `'instance' is not an object.`);
         });

         it('reload - throws w/ options.silent not a boolean', async () =>
         {
            await expect(pluginManager.reload({ plugin: 'foobar', silent: 0 })).to.be.rejectedWith(TypeError,
             `'silent' is not a boolean.`);
         });

         it('remove - throws w/ options.plugins not a string or iterable', async () =>
         {
            await expect(pluginManager.remove({ plugins: false })).to.be.rejectedWith(TypeError,
             `'plugins' is not a string or iterable.`);
         });

         it('setEnabled - throws w/ options.plugins not a string or iterable', () =>
         {
            expect(() => pluginManager.setEnabled({ plugins: false })).to.throw(TypeError,
             `'plugins' is not a string or iterable.`);
         });

         it('setEnabled - throws w/ options.enabled not a boolean', () =>
         {
            expect(() => pluginManager.setEnabled({ enabled: 0 })).to.throw(TypeError,
             `'enabled' is not a boolean.`);
         });

         it('setEventbus - throws w/ options.eventbus not an object', async () =>
         {
            await expect(pluginManager.setEventbus({ eventbus: false })).to.be.rejectedWith(TypeError,
             `'eventbus' is not an Eventbus.`);
         });

         it('setEventbus - throws w/ options.eventPrepend not a string', async () =>
         {
            await expect(pluginManager.setEventbus({ eventbus: {}, eventPrepend: false })).to.be.rejectedWith(TypeError,
             `'eventPrepend' is not a string.`);
         });

         it('setOptions - throws w/ options not object', () =>
         {
            expect(() => pluginManager.setOptions(false)).to.throw(TypeError,
             `'options' is not an object.`);
         });
      });
   }
}
