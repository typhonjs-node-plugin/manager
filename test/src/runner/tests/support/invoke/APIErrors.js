export default class APIErrors
{
   static run(Module, data, chai)
   {
      const { expect } = chai;

      const PluginManager = Module.default;
      const { PluginInvokeSupport } = Module;

      describe('PluginInvokeSupport is destroyed (artificial):', () =>
      {
         let invokeSupport;

         beforeEach(() =>
         {
            invokeSupport = new PluginInvokeSupport(null);
         });

         it('throws - ReferenceError', async () =>
         {
            expect(() => invokeSupport.getMethodNames()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => invokeSupport.hasMethod({ method: 'foobar' })).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => invokeSupport.invoke({ method: 'foobar' })).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            await expect(invokeSupport.invokeAsync({ method: 'foobar' })).to.be.rejectedWith(ReferenceError,
             'This PluginManager instance has been destroyed.');

            await expect(invokeSupport.invokeAsyncEvent({ method: 'foobar' })).to.be.rejectedWith(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => invokeSupport.invokeSync({ method: 'foobar' })).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => invokeSupport.invokeSyncEvent({ method: 'foobar' })).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');

            expect(() => invokeSupport.setEventbus({
               oldEventbus: null,
               newEventbus: null,
               oldPrepend: '',
               newPrepend: ''
            })).to.throw(ReferenceError, 'This PluginManager instance has been destroyed.');

            expect(() => invokeSupport.setOptions()).to.throw(ReferenceError,
             'This PluginManager instance has been destroyed.');
         });
      });

      describe('PluginInvokeSupport - missing object parameter:', () =>
      {
         let invokeSupport, pluginManager;

         beforeEach(() =>
         {
            pluginManager = new PluginManager();
            invokeSupport = new PluginInvokeSupport(pluginManager);
         });

         it('throws - TypeError', async () =>
         {
            // Can't check actual error message as it is just slightly different on Node 12.2.0

            expect(() => invokeSupport.hasMethod()).to.throw(TypeError);

            expect(() => invokeSupport.invoke()).to.throw(TypeError);

            await expect(invokeSupport.invokeAsync()).to.be.rejectedWith(TypeError);

            await expect(invokeSupport.invokeAsyncEvent()).to.be.rejectedWith(TypeError);

            expect(() => invokeSupport.invokeSync()).to.throw(TypeError);

            expect(() => invokeSupport.invokeSyncEvent()).to.throw(TypeError);

            expect(() => invokeSupport.setEventbus()).to.throw(TypeError);
         });
      });

      describe('PluginInvokeSupport bad options data:', () =>
      {
         let invokeSupport, pluginManager;

         beforeEach(() =>
         {
            pluginManager = new PluginManager();
            invokeSupport = new PluginInvokeSupport(pluginManager);
         });

         it('getMethodNames', () =>
         {
            expect(() => invokeSupport.getMethodNames({ enabled: 0 })).to.throw(TypeError,
             `'enabled' is not a boolean.`);

            expect(() => invokeSupport.getMethodNames({ plugins: false })).to.throw(TypeError,
             `'plugins' is not a string or iterable.`);
         });

         it('hasMethod', () =>
         {
            expect(() => invokeSupport.hasMethod({ method: false })).to.throw(TypeError, `'method' is not a string.`);

            expect(() => invokeSupport.hasMethod({ method: 'dummy', plugins: false })).to.throw(TypeError,
             `'plugins' is not a string or iterable.`);
         });

         it('invoke', () =>
         {
            expect(() => invokeSupport.invoke({ method: false })).to.throw(TypeError, `'method' is not a string.`);

            expect(() => invokeSupport.invoke({ method: 'dummy', args: false })).to.throw(TypeError,
             `'args' is not an array.`);

            expect(() => invokeSupport.invoke({ method: 'dummy', plugins: false })).to.throw(TypeError,
             `'plugins' is not a string or iterable.`);
         });

         it('invokeAsync', async () =>
         {
            await expect(invokeSupport.invokeAsync({ method: false })).to.be.rejectedWith(TypeError,
             `'method' is not a string.`);

            await expect(invokeSupport.invokeAsync({ method: 'dummy', args: false })).to.be.rejectedWith(TypeError,
             `'args' is not an array.`);

            await expect(invokeSupport.invokeAsync({ method: 'dummy', plugins: false })).to.be.rejectedWith(TypeError,
             `'plugins' is not a string or iterable.`);
         });

         it('invokeAsyncEvent', async () =>
         {
            await expect(invokeSupport.invokeAsyncEvent({ method: false })).to.be.rejectedWith(TypeError,
             `'method' is not a string.`);

            await expect(invokeSupport.invokeAsyncEvent({ method: 'dummy', passthruProps: false })).to.be.rejectedWith(
             TypeError, `'passthruProps' is not an object.`);

            await expect(invokeSupport.invokeAsyncEvent({ method: 'dummy', copyProps: false })).to.be.rejectedWith(
             TypeError, `'copyProps' is not an object.`);

            await expect(invokeSupport.invokeAsyncEvent({ method: 'dummy', plugins: false })).to.be.rejectedWith(
             TypeError, `'plugins' is not a string or iterable.`);
         });

         it('invokeSync', () =>
         {
            expect(() => invokeSupport.invokeSync({ method: false })).to.throw(TypeError,
             `'method' is not a string.`);

            expect(() => invokeSupport.invokeSync({ method: 'dummy', args: false })).to.throw(TypeError,
             `'args' is not an array.`);

            expect(() => invokeSupport.invokeSync({ method: 'dummy', plugins: false })).to.throw(TypeError,
             `'plugins' is not a string or iterable.`);
         });

         it('invokeSyncEvent', () =>
         {
            expect(() => invokeSupport.invokeSyncEvent({ method: false })).to.throw(TypeError,
             `'method' is not a string.`);

            expect(() => invokeSupport.invokeSyncEvent({ method: 'dummy', passthruProps: false })).to.throw(
             TypeError, `'passthruProps' is not an object.`);

            expect(() => invokeSupport.invokeSyncEvent({ method: 'dummy', copyProps: false })).to.throw(
             TypeError, `'copyProps' is not an object.`);

            expect(() => invokeSupport.invokeSyncEvent({ method: 'dummy', plugins: false })).to.throw(
             TypeError, `'plugins' is not a string or iterable.`);
         });
      });
   }
}
