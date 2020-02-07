import { UnitMain, UnitsManager, UnitObject } from "uman";
import { pureSum } from "./pure";
import Log from "./units/log";

const testArray = [2, 3, 4];
const innerLog = true;

const logLoader = innerLog ? new Log() : () => new Log();

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

    this.units.on("testEvents", (sender, ...args) => {
      this.units.post(
        "log",
        `${args[0]} received from ${sender} by ${this.name}`
      );
    });
  }
  async run(arr) {
    return await this.units.tests.run(arr);
  }

  async testMisconception(arr) {
    const object = new TestsObject();
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

describe("runs all tests", () => {
  let main;

  beforeAll(() => {
    main = new Main();
  });

  test("main unit created", () => {
    expect(main).toBeInstanceOf(UnitsManager);
    // check real list
    expect(Object.keys(main._units).length).toEqual(1);
    expect(main._units.main).toBeInstanceOf(Main);
  });

  test("all other units added", () => {
    main.add({
      one: () => import("./units/one"),
      two: () => import("./units/two"),
      tests: () => import("./units/tests"),
      log: logLoader
    });
    // check real list
    expect(Object.keys(main._units).length).toEqual(5);
  });

  test("methods and events", async () => {
    // but call proxied
    const result = await main.units.tests.pureTest(testArray);
    // post event
    main.units.post("testEvents", "units.post -> event sent");
    expect(result).toEqual("passed");
  });

  test("inner tests passed", async () => {
    const result = await main.run(testArray);
    expect(result).toEqual("passed");
  });

  test("args and returns", async () => {
    const testsObject = await main.units.tests.TestsObject();
    testsObject.on("sum", arr => {
      main.units.post("log", "callback: testsObject.onsum " + arr);
    });

    const oneObject = await main.units.one.OneObject();
    oneObject.on("test", () => {
      main.units.post("log", "callback: oneObject.ontest");
    });

    const result = await oneObject.test({ testsObject, arr: testArray });
    expect(result).toEqual(pureSum(testArray));
  });

  test("args and returns from worker", async () => {
    const result = await main.units.tests.testArgsReturns(testArray);
    expect(result).toEqual("passed");
  });

  test("misconception", async () => {
    const result = await main.testMisconception(testArray);
    expect(result).toEqual("passed");
  });

  test("unit 'tests' terminated", async () => {
    await main.terminate("tests");
    // check real list
    expect(Object.keys(main._units).length).toEqual(4);
  });

  test("all other units terminated", async () => {
    await main.terminate();
    // check real list
    expect(Object.keys(main._units).length).toEqual(1);
    expect(main._units.main).toBeInstanceOf(Main);
  });
});
