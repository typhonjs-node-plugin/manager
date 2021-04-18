import fs                     from 'fs';
import module                 from 'module';
import path                   from 'path';
import url                    from 'url';

import { getPackageType }     from '@typhonjs-utils/package-json';

import AbstractPluginManager  from '../AbstractPluginManager.js';

const requireMod = module.createRequire(import.meta.url);

export default class PluginManager extends AbstractPluginManager
{
   async _loadModule(moduleOrPath)
   {
      // Convert to file path if an URL or file URL string.
      const { filepath, isESM, isPath } = resolvePath(moduleOrPath);

      const loadPath = `${isPath ? filepath : moduleOrPath}`;

      if (!fs.existsSync(filepath))
      {
         throw new Error(`@typhonjs-plugin/manager could not load:\n${loadPath}`);
      }

      let type = isESM ? 'import-' : 'require-';
      type += isPath ? 'path' : 'module';

      const module = isESM ? await import(url.pathToFileURL(filepath)) : requireMod(filepath);

      // Please note that a plugin or other logger must be setup on the associated eventbus.
      if (this._eventbus !== null && typeof this._eventbus !== 'undefined')
      {
         this._eventbus.trigger('log:debug', `@typhonjs-plugin/manager - ${isESM ? 'import' : 'require'}: ${loadPath}`);
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

      return { instance, type };
   }
}

// Module Private ----------------------------------------------------------------------------------------------------

/**
 * For `.js` files uses `getPackageType` to determine if `type` is set to `module` in associated `package.json`. If
 * the `modulePath` provided ends in `.mjs` it is assumed to be ESM.
 *
 * @param {string} filepath - File path to load.
 *
 * @returns {boolean} If the filepath is an ES Module.
 */
function isPathModule(filepath)
{
   const extension = path.extname(filepath).toLowerCase();

   switch (extension)
   {
      case '.js':
         return getPackageType({ filepath }) === 'module';

      case '.mjs':
         return true;

      default:
         return false;
   }
}

/**
 * Resolves a modulePath first by `require.resolve` to allow Node to resolve an actual module. If this fails then
 * the `moduleOrPath` is resolved as a file path.
 *
 * @param {string} moduleOrPath - A module name or file path to load.
 *
 * @returns {{filepath: string, isPath: boolean, isESM: boolean}} An object including file path and whether the module
 *                                                                is ESM.
 */
function resolvePath(moduleOrPath)
{
   let filepath, isESM, isPath = false;

   try
   {
      filepath = requireMod.resolve(moduleOrPath);
      isESM = isPathModule(filepath);
   }
   catch (error)
   {
      if (moduleOrPath instanceof URL || moduleOrPath.startsWith('file:'))
      {
         filepath = url.fileURLToPath(moduleOrPath);
      }
      else
      {
         filepath = path.resolve(moduleOrPath);
      }

      isESM = isPathModule(filepath);
      isPath = true;
   }

   return { filepath, isESM, isPath };
}
