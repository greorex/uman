import { UnitMain, UnitWorker, UnitObject, UnitOptionsDefault } from "uman";

import LogUnit from "./units/log";
import { pureTest, pureSum } from "./pure";

const testArray = [2, 3, 4, 5];
const innerLog = true;
const times = 1000;
// UnitOptionsDefault.timeout = 0;

const render = message => {
  const p = document.createElement("p");
  if (message.startsWith("#")) p.style.fontWeight = "bold";
  if (message.match(/failed|Error|Timeout/)) p.style.color = "red";
  p.innerHTML = message;
  document.body.appendChild(p);
};

class TestsObject extends UnitObject {
  sum(arr) {
    this.fire("sum", arr);
    return pureSum(arr);
  }
}

// main class to run app
class Main extends UnitMain {
  constructor() {
    super();

    this.units.tests.on("log", message => render(message));

    this.units.on("testEvents", (sender, ...args) => {
      render(`${args[0]} received from ${sender} by ${this.name}`);
    });
  }

  async test(arr) {
    let result = await this.units.tests.run(arr);

    this.units.post("testEvents", "units.post -> event sent");

    if (result === "passed") {
      const t0 = performance.now();
      for (let i = times; i--; ) await this.units.tests.pureTest(arr);
      const t1 = performance.now();
      for (let i = times; i--; ) pureTest(arr);
      const t2 = performance.now();

      const ams = d => (d / times).toFixed(3);
      const d1 = ams(t1 - t0),
        d2 = ams(t2 - t1);

      render(`${times} times. Avarage = ${d1}, pure = ${d2} ms`);
    }
    return result;
  }

  async testArgsReturns(arr) {
    const testsObject = await this.units.tests.TestsObject();

    const unsibscribe = await testsObject.on("sum", arr => {
      this.units.post("log", "callback: testsObject.onsum " + arr);
    });

    const oneObject = await this.units.one.OneObject();
    oneObject.on("test", () => {
      this.units.post("log", "callback: oneObject.ontest");
    });

    const result = await oneObject.test({ testsObject, arr });

    unsibscribe();

    return result === pureSum(arr) ? "passed" : "failed";
  }

  async testMisconception(arr) {
    const object = new TestsObject();
    this.units.one.on("testMisconception", () => {
      this.units.post("log", "main.units.one.ontestMisconception");
    });
    // try to pass UnitObject or Unit
    const result = await this.units.tests.testMisconception(
      { object, one: this.units.one },
      arr
    );
    return result;
  }

  TestsObject() {
    return new TestsObject();
  }
}

// main unit
const main = new Main();

// add units
main.add({
  // worker thread
  one: new Worker("./units/one.js", { type: "module" }),
  // one: () => import("./units/one"),
  // lazy import
  two: import("./units/two"),
  // other worker thread on demand
  tests: () => new Worker("./units/tests.js", { type: "module" }),
  // tests: () => import("./units/tests"),
  // create on demand?
  log: innerLog ? new LogUnit() : () => new LogUnit()
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
      render("# " + item.name);
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

test("No Manager", async () => {
  class TestUnit extends UnitWorker {
    sum(arr) {
      return pureSum(arr);
    }
  }

  const unit = new TestUnit(new Worker("./units/tests.js", { type: "module" }));

  await unit.init();

  unit.on("noManagerTest", (...args) => {
    render(`${args[0]}  received`);
  });

  unit.post("noManagerTest", "unit -> event sent");

  const result = await unit.noManagerTest(testArray);

  unit.terminate();

  return result;
});

test("Units Manager", async () => {
  return await main.test(testArray);
});

test("Args and Returns", async () => {
  return await main.testArgsReturns(testArray);
});

test("Args and Returns from worker", async () => {
  return await main.units.tests.testArgsReturns(testArray);
});

test("Misconception", async () => {
  return await main.testMisconception(testArray);
});

test("Terminate", async () => {
  main.terminate();
  // check real list
  return 1 === Object.keys(main._units).length ? "passed" : "failed";
});

te.run();
