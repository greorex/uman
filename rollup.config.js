import del from "rollup-plugin-delete";
import { terser } from "rollup-plugin-terser";
import pkg from "./package.json";

const copyright = `(c) 2019-${new Date().getFullYear()} ${pkg.author.replace(
  / *\<[^)]*\> */g,
  " "
)}`;

const banner = `/* @preserve
 * ${pkg.name}, v${pkg.version}
 * ${pkg.description}
 * ${copyright}
 * Released under the ${pkg.license} license
 */`;

const config = {
  input: pkg.source,
  output: [
    {
      banner,
      file: pkg.main,
      format: "umd",
      name: pkg.name,
      sourcemap: true
    },
    {
      banner,
      file: pkg.module,
      format: "esm",
      sourcemap: true
    }
  ],
  plugins: [del({ targets: "dist/*" }), terser()]
};

export default config;
