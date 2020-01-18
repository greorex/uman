import { UnitsManager, UnitWorker, Unit } from "uman";

import LogUnit from "./units/log";
import { pureTest, pureSum } from "./pure";

const testArray = [2, 3, 4, 5];
const innerLog = true;

const logLoader = innerLog ? new LogUnit() : () => new LogUnit();

const render = message => {
  const p = document.createElement("p");
  p.innerHTML = message;
  document.body.appendChild(p);
};

// simple test, no manager

// unit manager test

// main class to run app
class MainUnit extends Unit {
  constructor() {
    super();

    this.units.tests.onlog = message => render(message);
  }

  async test(arr) {
    let result = await this.units.tests.run(arr);
    if (result === "passed") {
      const t0 = performance.now();
      result = await this.units.tests.pureTest(arr);
      const t1 = performance.now();
      pureTest(arr);
      const t2 = performance.now();
      render("Time: " + (t1 - t0).toFixed(3) + " ms");
      render("Pure: " + (t2 - t1).toFixed(3) + " ms");
    }
    return result;
  }
}

// add main unit
const uman = new UnitsManager({
  // create on demand
  main: () => new MainUnit()
});

// add units
uman.addUnits({
  // worker thread
  one: () => new Worker("./units/one.js", { type: "module" }),
  // lazy import
  two: () => import("./units/two"),
  // other worker thread
  tests: () => new Worker("./units/tests.js", { type: "module" }),
  // direct instance
  log: logLoader
});

// run all
class TestEngine {
  constructor() {
    this.cases = [];
  }

  test(name, func) {
    this.cases.push({
      name,
      func
    });
  }

  async run() {
    for (let item of this.cases) {
      render("+ Test " + item.name);
      try {
        render("Test " + (await item.func()));
      } catch (error) {
        render("Test " + error);
      }
    }
  }
}

const te = new TestEngine();
const test = (...args) => te.test(...args);

test("Worker Engine", async () => {
  class TestUnit extends UnitWorker {
    sum(arr) {
      return pureSum(arr);
    }
    onnoManagerTest(event) {
      render(event.payload + " received");
    }
  }

  const unit = new TestUnit(new Worker("./units/tests.js", { type: "module" }));

  unit.emit("noManagerTest", "event sent");

  const result = await unit.noManagerTest(testArray);

  unit.terminate();

  return result;
});

test("Direct Call", async () => {
  return await uman.units.tests.pureTest(testArray);
});

test("Units Manager", async () => {
  return await uman.units.main.test(testArray);
});

te.run();