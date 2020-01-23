# Units Manager

_A javascript library to split your code with web workers_

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/greorex/uman/Tests) ![David](https://img.shields.io/david/greorex/uman) ![npm bundle size](https://img.shields.io/bundlephobia/min/uman) [![npm](https://img.shields.io/npm/v/uman)](https://www.npmjs.com/package/uman)

## About

Being a small but robust javascript library, the Uman lets easily split your code by separarted modules - units. Even more, you may define units as web workers to have pure multithreading way of programming. With the Uman you don't have to think about communication between workers.

Everything is as simple as if you code in asynchronous way:

- [How to use](#how_to_use)
- [Examples](#examples)
- [API reference](#api_reference)

## Features

- ES6+
- small size
- no dependency
- code splitting support
- units lazy loading on demand
- easy communications between units
- pure multithreading with web workers

## Getting started

```
npm install uman --save
```

<a name="how_to_use"></a>

## How to use

Let's create two units for calculation, add them to the Uman, and run test unit with logging in the log unit.

> Note, the syntax of units is equal and doesn't depend on where the units will be, in the main thread or in the workers.

### Unit One

./units/one.js

```javascript
import { Unit } from "uman";

export default Unit.instance(
  class extends Unit {
    // returns sum of array's elements
    sum(arr) {
      return arr.reduce((r, i) => (r += i), 0);
    }

    // returns sum of cubes of array's elements
    // it doesn't calc cubes but Unit Two does
    async sumofcubes(arr) {
      const cubes = await this.units.two.cubes(arr);
      return this.sum(cubes);
    }
  }
);
```

### Unit Two

./units/two.js

```javascript
import { Unit } from "uman";

export default Unit.instance(
  class extends Unit {
    // returns cubes of array's elements
    cubes(arr) {
      return arr.map(i => i ** 3);
    }
  }
);
```

### Tests Unit

./units/tests.js

```javascript
import { Unit } from "uman";

export default Unit.instance(
  class extends Unit {
    async run(arr) {
      const units = this.units;
      const { one } = units;

      units.emit("log", "Starting with " + arr);

      // call method "sum" of Unit One
      const sum = await one.sum(arr);
      // and fire event "log" to all units
      units.emit("log", "Sum of " + arr + " = " + sum);

      // call method "cubes" of Unit Two
      const cubes = await units.two.cubes(arr);
      units.emit("log", "Cubes of " + arr + " = " + cubes);

      const sumofcubes1 = await one.sumofcubes(arr);
      units.emit("log", "Sum of cubes of " + arr + " = " + sumofcubes1);

      const sumofcubes2 = await one.sum(cubes);
      units.emit("log", "Sum of " + cubes + " = " + sumofcubes2);

      units.emit("log", "Done: " + sumofcubes1 + " = " + sumofcubes2);

      return sumofcubes1 === sumofcubes2 ? "passed" : "failed";
    }
  }
);
```

### Log Unit

./units/log.js

```javascript
import { Unit } from "uman";

export default Unit.instance(
  class extends Unit {
    // to catch "log" events from all units
    onlog(event) {
      console.log(event.sender + ": " + event.payload);
    }
  }
);
```

### Main Unit

index.js

```javascript
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
  }
};
```

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

### Unit

Class to create unit.

```javascript
Unit();
```

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

```javascript
units.other.onevent = payload => {};
```

3. to emit events:

```javascript
// to all units
units.emit("event", payload);
// to "other" unit
units.other.emit("event", payload);
```

## TODO

- arguments and return values proxies
- service worker class support
- node.js support
- communication with server units

## Contacts

Please feel free to contact me if you have any questions.

## License

Copyright © 2019-2020 Grigory Schurovski

Licensed under the [Apache-2.0](https://github.com/greorex/uman/blob/master/LICENSE) license.
