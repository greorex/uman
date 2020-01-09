const path = require("path");
const webpack = require("webpack");

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

const isProduction = process.env.NODE_ENV === "production";

const webpackConfig = {
  mode: isProduction ? "production" : "development",
  devtool: isProduction ? "source-map" : "eval-source-map",
  entry: "./src/index.js",
  output: {
    filename: isProduction ? "index.min.js" : "index.js",
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
        loader: "babel-loader"
      }
    ]
  },
  plugins: [new webpack.BannerPlugin(banner)]
};

module.exports = webpackConfig;
