import nodeResolve from "@rollup/plugin-node-resolve";
import pkg from "./package.json" with { type: "json" };
import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: "./src/module/Module.ts",
    plugins: [typescript(), nodeResolve()],
    output: {
      file: `./${pkg.main}`,
      format: "iife"
    }
  },
  {
    input: "./src/node/Helper.ts",
    plugins: [typescript(), nodeResolve()],
    external: ["node_helper", "@iiot2k/gpiox"],
    output: {
      file: `./node_helper.js`,
      format: "cjs"
    }
  }
];
