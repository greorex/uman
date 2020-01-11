import babel from "rollup-plugin-babel";
import pkg from "./package.json";

const banner = `/*!
 * @license
 * ${pkg.name}, v${pkg.version}
 * ${pkg.description}
 * ${pkg.repository.url}
 *
 * ${`(c) 2019-${new Date().getFullYear()} ${pkg.author.replace(
   / *\<[^)]*\> */g,
   " "
 )}`}
 * Released under the ${pkg.license}
 */`;

export default {
  input: "./src/index.js",
  output: [
    {
      banner,
      file: pkg.main,
      format: "cjs"
    },
    {
      banner,
      file: pkg.module,
      format: "es",
      sourceMap: "inline"
    }
  ],
  plugins: [
    babel({
      exclude: "node_modules/**", // only transpile our source code
      babelrc: false,
      comments: false,
      presets: [
        [
          "@babel/preset-env",
          {
            modules: false,
            targets: { node: "10" }
          }
        ]
      ],
      plugins: [["@babel/plugin-proposal-class-properties", { loose: true }]]
    })
  ]
};
