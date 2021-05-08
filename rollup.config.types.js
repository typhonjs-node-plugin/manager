import dts from 'rollup-plugin-dts';

// Rollup the TS definitions generated in ./lib

export default [
   {
      input: "./lib/index.d.ts",
      output: [{ file: "types/index.d.ts", format: "es" }],
      plugins: [dts()],
   },
];
