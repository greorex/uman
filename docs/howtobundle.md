# Units Manager

## How to bundle

Use webpack or other bundler with code-splitting support.

> Note, the library is not transpiled, so do not ignore it while transpiling your bundles and chunks.

For webpack, the configuration could be the following:

```javascript
const path = require("path");
const WorkerPlugin = require("worker-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./index.js",
  output: {
    filename: "[name].bundle.js",
    chunkFilename: "[name].chunk.js",
    path: path.resolve(__dirname, "public")
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        loader: "babel-loader",
        // do not exclude "uman"
        exclude: /node_modules\/(?!(uman)\/).*/
        // for browsers to support
        // use proper babel.config
        // with @babel/preset-env
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: `Uman tests`
    }),
    new WorkerPlugin({
      globalObject: "self"
    })
  ],
  devtool: "source-map",
  devServer: {
    host: "0.0.0.0",
    port: "8080",
    contentBase: [path.join(__dirname, "public")]
  }
};
```

## License

Copyright © 2019-2020 Grigory Schurovski

Licensed under the [Apache-2.0](./../LICENSE) license.
