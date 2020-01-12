import { UnitsManager, Unit } from "uman";

// main class to run app
class MainUnit extends Unit {
  constructor() {
    super();

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
  // worker thread
  one: () => new Worker("./units/one.js", { type: "module" }),
  // lazy import
  two: () => import("./units/two"),
  // other worker thread
  tests: () => new Worker("./units/tests.js", { type: "module" }),
  // direct instance
  log: new LogUnit()
});

// run
uman.units.main.run([2, 3, 4]);
