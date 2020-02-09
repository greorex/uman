import { UnitObject, UnitMain, UnitWorker } from "uman";
import { render } from "./engine";
import { pureTest, pureSum } from "./pure";

/**
 * to test objects
 */
export class TestsObject extends UnitObject {
  sum(arr) {
    this.fire("sum", arr);
    return pureSum(arr);
  }
}

/**
 * to test adapters
 */
export class Adapter extends UnitWorker {
  sum(arr) {
    return pureSum(arr);
  }
}

/**
 * to test manager
 */
export class Main extends UnitMain {
  constructor() {
    super();

    this.units.tests.on("log", message => render(message));

    this.units.on("testEvents", (sender, ...args) => {
      render(`${args[0]} received from ${sender} by ${this.name}`);
    });
  }

  async run(arr, times = 1000) {
    let result = await this.units.tests.run(arr);

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