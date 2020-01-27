import { UnitsManager, Unit, UnitObject } from "uman";
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
class MainUnit extends Unit {
  async run(arr) {
    return await this.units.tests.run(arr);
  }

  newObject() {
    return new TestsObject();
  }
}

describe("runs all tests", () => {
  let uman;

  beforeAll(() => {
    uman = new UnitsManager();
  });

  test("units manager created", () => {
    expect(uman).toBeInstanceOf(UnitsManager);
  });

  test("main unit added", () => {
    uman.addUnits({
      main: new MainUnit()
    });
    // check real list
    expect(Object.keys(uman._units).length).toEqual(1);
    expect(uman._units.main).toBeInstanceOf(MainUnit);
  });

  test("all other units added", () => {
    uman.addUnits({
      one: () => import("./units/one"),
      two: () => import("./units/two"),
      tests: () => import("./units/tests"),
      log: logLoader
    });
    // check real list
    expect(Object.keys(uman._units).length).toEqual(5);
  });

  test("method accessed with direct call", async () => {
    // check real list
    expect(uman._units.tests).toBeInstanceOf(UnitObject);
    // but call proxied
    const result = await uman.units.tests.pureTest(testArray);
    expect(result).toEqual("passed");
  });

  test("inner tests passed", async () => {
    const result = await uman.units.main.run(testArray);
    expect(result).toEqual("passed");
  });

  test("args and returns", async () => {
    const testsObject = await uman.units.tests.newObject();
    const oneObject = await uman.units.one.newObject();
    const result = await oneObject.test({ testsObject, arr: testArray });
    expect(result).toEqual(pureSum(testArray));
  });

  test("args and returns from worker", async () => {
    const result = await uman.units.tests.testArgsReturns(testArray);
    expect(result).toEqual("passed");
  });

  test("unit 'tests' deleted", () => {
    uman.deleteUnit("tests");
    // check real list
    expect(Object.keys(uman._units).length).toEqual(4);
  });

  test("all other units deleted", () => {
    uman.deleteAll();
    // check real list
    expect(Object.keys(uman._units).length).toEqual(0);
  });
});
