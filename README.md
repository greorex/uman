 <div align="center">
  <h1>Units Manager</h1>
  <p><i>A javascript library to split your code with web workers</i></p>
 
 <!--
 <a href="https://github.com/greorex/uman/actions"><img alt="Build Status" src="https://github.com/greorex/uman/workflows/Build/badge.svg?color=green" /></a> <a href="https://github.com/greorex/uman/actions"> <img alt="Publish Status" src="https://github.com/greorex/uman/workflows/Publish/badge.svg?color=green" /></a> <img src="https://api.dependabot.com/badges/status?host=github&repo=greorex/uman" />
-->
 </div>

## About

Being a small but robust javascript library, the Uman lets easily split your code by separarted modules - units. Even more, you may define units as web workers to have pure multithreading way of programming. With the Uman you don't have to think about communication between workers.

Everything is as simple as if you code in asynchronous way.

## Features

- code splitting by units
- units lazy loading on demand
- easy communications between units
- pure multithreading with web workers

## Getting started

```
npm install uman --save
```

## How to use

Let's create two units for calculation, add them to the Uman, and run test unit with logging in the log unit.

### Unit One

This unit will be in the main thread.

./units/one.js

```javascript
import { Unit } from "uman";

export default class UnitOne extends Unit {
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
```

### Unit Two

This unit will be as web worker unit.

./units/two.worker.js

```javascript
import { UnitSelf } from "uman";

class UnitTwo extends UnitSelf {
  // returns cubes of array's elements
  cubes(arr) {
    return arr.map(i => i ** 3);
  }
}

new UnitTwo();
```

### Test Unit

The test will also be a unit, as a worker unit as well.

./units/test.worker.js

```javascript
import { UnitSelf } from "uman";

class UnitTest extends UnitSelf {
  async run(arr) {
    const one = this.units.one;

    // call method "sum" of Unit One
    const sum = await one.sum(arr);
    // and fire event "log" to all units
    this.emit("log", "Sum of " + arr + " = " + sum);

    const cubes = await this.units.two.cubes(arr);
    this.emit("log", "Cubes of " + arr + " = " + cubes);

    const sumofcubes1 = await one.sumofcubes(arr);
    this.emit("log", "Sum of cubes of " + arr + " = " + sumofcubes);

    const sumofcubes2 = await one.sum(cubes);
    this.emit("log", "Sum of " + cubes + " = " + sumofcubes);

    return sumofcubes1 === sumofcubes2 ? "passed" : "failed";
  }
}

new UnitTest();
```

### Log Unit

This unit will log test, in the main thread.

./units/log.js

```javascript
import { Unit } from "uman";

export default class UnitLog extends Unit {
  constructor() {
    super();

    // to catch "log" event from test
    this.units.test.onlog = message => {
      this.render(message);
    };
  }

  render(message) {
    console.log(message);
  }
}
```

### Run

Add units to the manager in the main script.

main.js

```javascript
import { UnitsManager, UnitWorker } from "uman";
import UnitOne from "./units/one";
import UnitLog from "./units/log";

// add units
const uman = new UnitsManager({
  one: () => new UnitOne(),
  two: () => {
    const worker = new Worker(".units/two.worker.js", { type: "module" });
    return new UnitWorker(worker);
  }
});

// add test and log units later
uman.addUnits({
  test: () => {
    const worker = new Worker("./units/test.worker.js", { type: "module" });
    return new UnitWorker(worker);
  },
  log: () => new UnitLog()
});

// run test and then delete it
uman.units.test.run().then(result => {
  uman.units.log.render("Test " + result);
  uman.deleteUnit("test");
});
```

Thats all.

## API Reference

### UnitsManager

Class to create manager

```javascript
UnitsManager(units: Object like {
  // 1) created Unit
  name: new Unit(),
  // 2) will be created on demand
  name: () => return new Unit(),
  // 3) will be run on demand
  name: () => {
    const worker = new Worker(url, options);
    return new UnitWorker(worker);
  }
})

addUnits(units: see constructor) : UnitsManager

deleteUnit(name: string)

deleteAllUnits()
```

### Unit

Class to create unit in the main thread

```javascript
Unit();
```

### UnitWorker

Class to run unit as web worker

```javascript
UnitWorker(worker: Worker(url, options))
```

### UnitSelf

Class to write script of web worker

```javascript
UnitSelf();
```

### Property "units"

Each class has special property

```javascript
units: Object;
```

1. to call "other" unit

```javascript
async units.other(...args);
```

2. to catch event from "other" unit

```javascript
units.other.onevent = payload => {};
```

## TODO

- arguments and return values proxies
- service worker class support
- node.js support
- communication with server units

## Contacts

Fill free to contact me if you need help with customization or installation.

## License

Copyright © 2019 Grigory Schurovski

Licensed under the [Apache-2.0](http://www.apache.org/licenses/LICENSE-2.0) license.
