import fs         from 'fs';

import alias      from '@rollup/plugin-alias';
import dts        from 'rollup-plugin-dts';

import interfaces from './src/types/ts-interfaces.js';

let banner = fs.readFileSync('./lib/types/typedef.d.ts', 'utf-8');

banner += interfaces;

// Rollup the TS definitions generated in ./lib and add separate typedef.d.ts and interfaces as a banner.

// Use plugin-alias to replace @typhonjs-plugin/eventbus exports with reference to the local TS definitions.

export default [
   {
      input: "./lib/index.d.ts",
      output: [{ banner, file: "types/index.d.ts", format: "es" }],
      plugins: [
         alias({
            entries: [
               {
                  find: '@typhonjs-plugin/eventbus',
                  replacement: '../node_modules/@typhonjs-plugin/eventbus/types/index.d.ts'
               }
            ]
         }),
         dts()
      ],
   },
];
