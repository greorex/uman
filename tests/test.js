import { UnitMain, UnitsManager, UnitObject } from "uman";
import { pureSum } from "./pure";
import Log from "./units/log";

const testArray = [2, 3, 4];
const innerLog = false;

const logLoader = innerLog ? new Log() : () => new Log();

if (!global.Worker) global.Worker = class Worker {};

class TestsObject extends UnitObject {
  sum(arr) {
    return pureSum(arr);
  }
}

// main class to run app
class Main extends UnitMain {
  async run(arr) {
    return await this.units.tests.run(arr);
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

  test("method accessed with direct call", async () => {
    // check real list
    expect(main._units.tests).toBeInstanceOf(UnitObject);
    // but call proxied
    const result = await main.units.tests.pureTest(testArray);
    expect(result).toEqual("passed");
  });

  test("inner tests passed", async () => {
    const result = await main.run(testArray);
    expect(result).toEqual("passed");
  });

  test("args and returns", async () => {
    const testsObject = await main.units.tests.TestsObject();
    const oneObject = await main.units.one.OneObject();
    const result = await oneObject.test({ testsObject, arr: testArray });
    expect(result).toEqual(pureSum(testArray));
  });

  test("args and returns from worker", async () => {
    const result = await main.units.tests.testArgsReturns(testArray);
    expect(result).toEqual("passed");
  });

  test("unit 'tests' terminated", () => {
    main.terminate("tests");
    // check real list
    expect(Object.keys(main._units).length).toEqual(4);
  });

  test("all other units terminated", () => {
    main.terminate();
    // check real list
    expect(Object.keys(main._units).length).toEqual(0);
  });
});
