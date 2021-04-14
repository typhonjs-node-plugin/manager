import fs                     from 'fs';
import module                 from 'module';
import path                   from 'path';
import url                    from 'url';

import { getPackageType }     from '@typhonjs-utils/package-json';

import AbstractPluginManager  from '../AbstractPluginManager.js';

const require = module.createRequire(import.meta.url);

export default class NodePluginManager extends AbstractPluginManager
{
   async _loadModule(moduleOrPath)
   {
      // Convert to file path if an URL or file URL string.
      if (moduleOrPath instanceof URL || moduleOrPath.startsWith('file:'))
      {
         moduleOrPath = url.fileURLToPath(moduleOrPath);
      }

      const { filepath, isESM, isPath } = resolvePath(moduleOrPath);

      const loadPath = `${isPath ? filepath : moduleOrPath}`;

      if (!fs.existsSync(filepath))
      {
         throw new Error(`@typhonjs-plugin/manager could not load:\n${loadPath}`);
      }

      const module = isESM ? await import(url.pathToFileURL(filepath)) : require(filepath);

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

      return instance;
   }
}

// Module Private ----------------------------------------------------------------------------------------------------

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

function resolvePath(moduleOrPath)
{
   let filepath, isESM, isPath = false;

   try
   {
      filepath = require.resolve(moduleOrPath);
      isESM = isPathModule(filepath);
   } catch (error)
   {
      filepath = path.resolve(moduleOrPath);
      isESM = isPathModule(filepath);
      isPath = true;
   }

   return { filepath, isESM, isPath };
}
