import AbstractPluginManager from './AbstractPluginManager.js';

export default class BrowserPluginManager extends AbstractPluginManager
{
   async _loadModule(moduleOrPath)
   {
      const module = await import(moduleOrPath);

      // Please note that a plugin or other logger must be setup on the associated eventbus.
      if (this._eventbus !== null && typeof this._eventbus !== 'undefined')
      {
         this._eventbus.trigger('log:debug', `@typhonjs-plugin/manager - import: ${moduleOrPath}`);
      }

      let instance;

      // If the module has a named export for `onPluginLoad` then take the module.
      if (typeof module.onPluginLoad === 'function')
      {
         instance = module;
      }
      // Then potentially resolve any default export / static class.
      else if (module.default)
      {
         instance = module.default;
      }
      // Finally resolve as just the module.
      else
      {
         instance = module;
      }

      return instance;
   }
}
