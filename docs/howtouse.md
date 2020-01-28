# Units Manager

_A javascript library to split your code with web workers_

## How to use

Let's create units [One](#unit_one) and [Two](#unit_two) for calculation, add them to the [Main](#unit_main) and run [Tests](#unit_tests) unit with logging in the [Log](#unit_log) unit.

> Note, the syntax of units is equal and doesn't depend on where the units will be, in the main thread or in the workers.

Do not forget to [bundle](howtobundle.md) it and test.

<a name="unit_one"></a>

### Unit One

`./units/one.js`

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

<a name="unit_two"></a>

### Unit Two

`./units/two.js`

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

<a name="unit_tests"></a>

### Tests Unit

`./units/tests.js`

```javascript
import { Unit } from "uman";

export default Unit.instance(
  class extends Unit {
    async run(arr) {
      const units = this.units;
      const { one } = units;

      // call method "sum" of Unit One
      one
        .sum(arr)
        .then(result => units.post("log", `Sum of [${arr}] = ${result}`));

      const sum = await Promise.all([
        // call method "cubes" of Unit Two
        one.sum(await units.two.cubes(arr)),
        one.sumofcubes(arr)
      ]);

      return sum[0] === sum[1] ? "passed" : "failed";
    }
  }
);
```

<a name="unit_log"></a>

### Log Unit

`./units/log.js`

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

<a name="unit_main"></a>

### Main Unit

`index.js`

```javascript
import { UnitMain, Unit } from "uman";

// main class to run app
class Main extends UnitMain {
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
const main = new Main();

import LogUnit from "./units/log";

// add units
main.add({
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
main.run([2, 3, 4]);
```

Thats all.

- [API reference](api.md)
- [How to bundle](howtobundle.md)

## License

Copyright © 2019-2020 G. Schurovski

Licensed under the [Apache-2.0](./../LICENSE) license.
