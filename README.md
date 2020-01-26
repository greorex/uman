# Units Manager

_A javascript library to split your code with web workers_

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/greorex/uman/Tests) ![David](https://img.shields.io/david/greorex/uman) ![npm bundle size](https://img.shields.io/bundlephobia/min/uman) [![npm](https://img.shields.io/npm/v/uman)](https://www.npmjs.com/package/uman)

## About

<<<<<<< HEAD
Being a small but robust javascript library, the _Uman_ lets easily split your code by separarted modules - units. Even more, you may define units as web workers to have pure multithreading way of programming. With the _Uman_ you don't have to think about communication between workers.
=======
Being a small but robust javascript library, the Uman lets easily split your code by separarted modules - units. Even more, you may define units as web workers to have pure multithreading way of programming. With the Uman you don't have to think about communication between workers.

Everything is as simple as if you code in asynchronous way:

- [How to use](#how_to_use)
- [Examples](#examples)
- [API reference](#api_reference)
>>>>>>> master

## Features

- ES6+
- small size
- no dependency
- code splitting support
- units lazy loading on demand
- easy communications between units
- pure multithreading with web workers

<<<<<<< HEAD
## Why?
=======
## Getting started

```
npm install uman --save
```

<a name="how_to_use"></a>

## How to use
>>>>>>> master

_Javascript_ is single threaded. The browser freezes UI and other operations if task eats a lot of resources and time to do things. To avoid this you have to code in asynchronous way.

The best choice is _web workers_ to run the code in background threads independently from the main thread. This also gives you pure multithreading approach.

To start code with _web worker_ you type the following:

`main.js`

```javascript
const worker = new Worker("worker.js");
worker.postMessage(message);
worker.onmessage = message => {
  // check if it has data
  // check if it's for you
  // do things
};
```

`worker.js`

```javascript
onmessage(message) {
  // check if it has data
  // check it's for you
  // do things, response
  postMessage(message)
}
```

It looks nice for a task.

But what if you have more than one? What if you need to run tasks in separate workers? How to communicate between them and the main thread? How to avoid code duplication?

With the _Uman_ everything is as simple as if you code in asynchronous way:

`index.js`

```javascript
// set up units
const uman = UnitsManager({
  main: () => import("main.js"),
  // as a worker thread
  one: () => new Worker("one.js"),
  two: () => new Worker("two.js"),
  // ...
  // as a main thread
  ten: () => import("ten.js")
});

uman.units.main.run();
```

`main.js`

```javascript
export default class extends Unit {
  async run() {
    // ask worker "one" to do things
    const result = await this.units.one.task(...args);
    // do things with result
  }
}
```

`one.js`

```javascript
export default Unit.instance(
  class extends Unit {
    async task(...args) {
      // ask other workers to do things
      const result = await Promise.all([
        this.units.two.dothing(...args),
        this.units.ten.dothing(...args)
      ]);
      // do things, response
      return result[0] + result[1];
    }
  }
);
```

`two.js` or `ten.js`

```javascript
<<<<<<< HEAD
export default Unit.instance(
  class extends Unit {
    async dothing(...args) {
      // do things, response
      return await result;
    }
=======
import { UnitsManager, Unit } from "uman";

// main class to run app
class MainUnit extends Unit {
  constructor() {
    super();

    // to catch event "log" from unit "tests"
    this.units.tests.onlog = message => this.render(message);
  }

  async run(arr) {
    this.render("Units Manager Test");
    const result = await this.units.tests.run(arr);
    this.render("Test " + result);
  }

  render(message) {
    const p = document.createElement("p");
    p.innerHTML = message;
    document.body.appendChild(p);
  }
}

// add main unit
const uman = new UnitsManager({
  // create on demand
  main: () => new MainUnit()
});

import LogUnit from "./units/log";

// add units
uman.addUnits({
  // web worker thread
  one: () => new Worker("./units/one.js", { type: "module" }),
  // lazy import
  two: () => import("./units/two"),
  // other web worker thread
  tests: () => new Worker("./units/tests.js", { type: "module" }),
  // direct instance
  log: new LogUnit()
});

// run
uman.units.main.run([2, 3, 4]);
```

### Bundle it and test

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
>>>>>>> master
  }
);
```

<<<<<<< HEAD
## Examples
=======
Thats all.

<a name="examples"></a>

## Examples

There are some [working examples](https://github.com/greorex/uman/tree/master/tests) to test the Uman.

Clone repository and:

```
npm install
npm run dev
```

Then open browser with http://loclahost:8080.

<a name="api_reference"></a>

## API Reference

### UnitsManager

Class to create manager.

```javascript
UnitsManager(units: Object like {
  // 1) created unit
  name: new Unit(),
  // 2) unit will be created on demand
  name: () => new Unit(),
  // 3) unit will be run on demand as web worker
  name: () => new Worker(url, options);
  // 4) unit will be imported on demand
  name: () => import('pathto/unit.js');
})

addUnits(units: see constructor) : UnitsManager

deleteUnit(name: string)

deleteAllUnits()
```
>>>>>>> master

There are some [working examples](https://github.com/greorex/uman/tree/master/tests) to test the _Uman_.

<<<<<<< HEAD
Clone repository and:
=======
Class to create unit.
>>>>>>> master

```
<<<<<<< HEAD
npm install
npm run dev
```

Then open browser with http://loclahost:8080.

<a name="getting_started"></a>
=======

Please follow the syntax to have the unit as an universal module:

```javascript
export default Unit.instance(
  class extends Unit {
    // your ES6+ code
  }
);
```

The class will be atomatically instantiated if it's used as a script part of web worker unit.

But it's possible to use it as ES6+ module, with _import_ and _new_.

### UnitWorker

Class to create worker part of web worker unit.

```typescript
UnitWorker(worker: Worker);
```

It's created automatically in case you initialize the unit with _Worker_.

You may use web worker's methods, like _postMessage_ to exchange raw data with the worker thread, as well as _onmessage_ to catch events.

### Property "units"

Each class has special property:

```javascript
units: Object;
```

1. to call "other" unit:

```javascript
async units.other(...args);
```

2. to catch event from "other" unit:
>>>>>>> master

## Getting started

<<<<<<< HEAD
Install the _Uman_ with `npm i uman` and use it with _import_.
=======
3. to emit events:
>>>>>>> master

- [How to use](docs/howtouse.md)
- [API reference](docs/api.md)
- [How to bundle](docs/howtobundle.md)

## TODO

- service worker class support
- node.js support
- communication with server units

## Contacts

Please feel free to contact me if you have any questions.

## License

Copyright © 2019-2020 Grigory Schurovski

Licensed under the [Apache-2.0](LICENSE) license.
