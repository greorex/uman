import { UnitsManager, Unit } from "uman";

const pureTest = arr => {
  const sum = arr.reduce((r, i) => (r += i), 0);
  const cubes = arr.map(i => i ** 3);
  const sumofcubes1 = arr.map(i => i ** 3).reduce((r, i) => (r += i), 0);
  const sumofcubes2 = cubes.reduce((r, i) => (r += i), 0);
  return sumofcubes1 === sumofcubes2 ? "passed" : "failed";
};

// main class to run app
class MainUnit extends Unit {
  constructor() {
    super();

    this.units.tests.onlog = message => this.render(message);
  }

  async test(arr) {
    this.render("Units Manager Test");
    let result = await this.units.tests.run(arr);
    if (result === "passed") {
      const t0 = performance.now();
      result = await this.units.tests.pureTest(arr);
      const t1 = performance.now();
      pureTest(arr);
      const t2 = performance.now();
      this.render("Time: " + (t1 - t0).toFixed(4) + " ms");
      this.render("Pure: " + (t2 - t1).toFixed(4) + " ms");
    }
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
  // worker thread
  one: () => new Worker("./units/one.js", { type: "module" }),
  // lazy import
  two: () => import("./units/two"),
  // other worker thread
  tests: () => new Worker("./units/tests.js", { type: "module" }),
  // direct instance
  log: () => new LogUnit()
});

// run
uman.units.main.test([2, 3, 4]);
