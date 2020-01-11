const path = require("path");
const webpack = require("webpack");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

const {
  version,
  name,
  license,
  repository,
  author,
  description
} = require("./package.json");

const banner = `
  ${name}, v${version}
  ${description}
  ${repository.url}

  Copyright (c) ${author.replace(/ *\<[^)]*\> */g, " ")}

  This source code is licensed under the ${license} license found in the
  LICENSE file in the root directory of this source tree.
`;

module.exports = {
  mode: "none",
  devtool: "source-map",
  entry: "./src/index.js",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    library: "uman",
    libraryTarget: "umd",
    libraryExport: "default"
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        loader: "babel-loader",
        options: {
          comments: false,
          sourceType: "module",
          plugins: [
            ["@babel/plugin-proposal-class-properties", { loose: true }]
          ]
        }
      }
    ]
  },
  plugins: [new CleanWebpackPlugin(), new webpack.BannerPlugin(banner)]
};
