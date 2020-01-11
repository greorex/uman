import { UnitsManager, Unit } from "./uman";

// main class to run app
class MainUnit extends Unit {
  async run() {
    const result = await this.units.tests.run([2, 3, 4]);
    this.units.log.render("Test " + result);
    uman.deleteUnit("tests");
  }
}

// add main unit
const uman = new UnitsManager({
  // direct instance
  main: new MainUnit()
});

import TwoUnit from "./units/two";

// add units
uman.addUnits({
  // worker thread
  one: () => new Worker("./units/one.js", { type: "module" }),
  // create on demand
  two: () => new TwoUnit(),
  // other worker thread
  tests: () => new Worker("./units/tests.js", { type: "module" }),
  // lazy import
  log: () => import("./units/log")
});

// run
uman.units.main.run();
