const fs = require("fs");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { name, version } = require("./../package.json");

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
        loader: "babel-loader"
      }
    ]
  },
  resolve: {
    alias: {
      uman: path.resolve(__dirname, "../src/index.js")
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: `${name}, v${version}, development`
    })
  ],
  devtool: "source-map",
  devServer: {
    host: "0.0.0.0",
    port: "8080",
    compress: true,
    // https: {
    //   key: fs.readFileSync(path.resolve(__dirname, "../certs/server.key")),
    //   cert: fs.readFileSync(path.resolve(__dirname, "../certs/server.crt"))
    // },
    contentBase: [path.join(__dirname, "public")]
  }
};
