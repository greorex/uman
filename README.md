 <div align="center">
   <h1>Uman</h1>
   <h2>Units manager javascript library</h2>
  <blockquote>Allows to easily split your code with web workers</blockquote>
 
 <a href="https://github.com/greorex/uman/actions"><img alt="Build Status" src="https://github.com/greorex/uman/workflows/Build/badge.svg?color=green" /></a> <a href="https://github.com/greorex/uman/actions"> <img alt="Publish Status" src="https://github.com/greorex/uman/workflows/Publish/badge.svg?color=green" /></a> <img src="https://api.dependabot.com/badges/status?host=github&repo=greorex/uman" />

 </div>

## About

Being a small but robust javascript library, the Uman lets easily split your code by separarted modules - units. Even more, you may define units as web workers to have pure multithreading way of programming. With the Uman you don't need to think how to orginize communication between units. Everything is simple as if you code in asynchronous way.

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

# Unit One

This unit will be in the main thread.

./units/one.js

```
import {Unit} from 'uman';

export default class UnitOne extends Unit {

  // returns sum of array elements
  sum(arr) {
    return arr.reduce((r,i) => r += i, 0);
  }

  // returns sum of cubes of array elements
  // it doesn't calc cubes but Unit Two does
  async sumofcubes(arr) {
    const cubes = await this.units.two.cubes(arr);
    return this.sum(cubes);
  }

}
```

# Unit Two

This unit will be as web worker unit.

./units/two.worker.js

```
import {UnitSelf} from 'uman';

class UnitTwo extends UnitSelf {

  // returns cubes of array elements
  cubes(arr) {
    return arr.map(i => i ** 3);
  }

}

new UnitTwo();
```

# Test Unit

The test will also be a unit, as a worker unit as well.

./units/test.worker.js

```
import {UnitSelf} from 'uman';

class UnitTest extends UnitSelf {

  async run(arr) {
    const log = this.units.log;
    const one = this.units.one;

    // call method "sum" of Unit One
    const sum = await one.sum(arr);
    // and fire event "log" to the Unit Log
    log.emit("log", "Sum of " + arr + " = " + sum);

    const cubes = await this.units.two.cubes(arr);
    log.emit("log", "Cubes of " + arr + " = " + cubes);

    const sumofcubes1 = await one.sumofcubes(arr);
    log.emit("log", "Sum of cubes of " + arr + " = " + sumofcubes);

    const sumofcubes2 = await one.sum(cubes);
    log.emit("log", "Sum of " + cubes + " = " + sumofcubes);

    return (sumofcubes1 === sumofcubes2) ? "passed" : "failed";
  }

}

new UnitTest();
```

# Log Unit

This unit will log test, in the main thread.

./units/log.js

```
import {Unit} from 'uman';

export default class UnitLog extends Unit {
  constructor() {
    super();

    // it will catch log event
    this.units.test.onlog = message => {
      this.log(message);
    }
  }

  log(message) {
    console.log(message);
  }

}
```

# Run test

Add units to the manager in the main script.

main.js

```
import {UnitsManager, UnitWorker} from 'uman';
import UnitOne from './units/one';
import UnitLog from './units/log';

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
    const worker = new Worker("./units/test.worker.js", { type: "module" }); return new UnitWorker(worker);
  },
  log: () => new UnitLog()
});

// run test and then delete it
uman.units.test.run()
  .then(result => {
    uman.units.log("Test " + result);
    uman.deleteUnit("test");
  });

```

That's all.

## Contacts

Fill free to contact me if you need help with customization or installation.

## License

Apache-2.0
