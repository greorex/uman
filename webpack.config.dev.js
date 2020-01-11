const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const WorkerPlugin = require("worker-plugin");
const { name } = require("./package.json");

module.exports = {
  mode: "development",
  entry: "./tests/index.js",
  output: {
    filename: "[name].bundle.js",
    chunkFilename: "[name].chunk.js",
    path: path.resolve(__dirname, "public")
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        loader: "babel-loader",
        options: {
          comments: false,
          presets: [["@babel/preset-env"]],
          plugins: [
            ["@babel/plugin-transform-runtime"],
            ["@babel/plugin-proposal-class-properties", { loose: true }]
          ]
        }
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      title: `Development of ${name}`
    }),
    new WorkerPlugin({
      // use "self" as the global object when receiving hot updates.
      globalObject: "self" // <-- this is the default value
    })
  ],
  devtool: "source-map",
  devServer: {
    host: "0.0.0.0",
    port: "8080",
    contentBase: [path.join(__dirname, "public")]
  }
};
