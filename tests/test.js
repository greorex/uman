import { UnitsManager, Unit } from "uman";
import Log from "./units/log";

const testArray = [2, 3, 4];
const innerLog = false;

const logLoader = innerLog ? new Log() : () => new Log();

if (!globalThis.Worker) globalThis.Worker = class Worker {};

// main class to run app
class MainUnit extends Unit {
  async run(arr) {
    return await this.units.tests.run(arr);
  }
}

describe("runs all tests", () => {
  let uman;

  beforeAll(() => {
    uman = new UnitsManager();
  });

  afterAll(() => {
    if (uman) {
      uman.deleteAll();
    }
  });

  test("units manager created", () => {
    expect(uman).toBeInstanceOf(UnitsManager);
  });

  test("main unit added", () => {
    uman.addUnits({
      main: new MainUnit()
    });
    expect(Object.keys(uman.units).length).toEqual(1);
    expect(uman.units.main).toBeInstanceOf(MainUnit);
  });

  test("all other units added", () => {
    uman.addUnits({
      one: () => import("./units/one"),
      two: () => import("./units/two"),
      tests: () => import("./units/tests"),
      log: logLoader
    });
    expect(Object.keys(uman.units).length).toEqual(5);
  });

  test("method accessed with direct call", async () => {
    const result = await uman.units.tests.pureTest(testArray);
    expect(result).toEqual("passed");
  });

  test("inner tests passed", async () => {
    const result = await uman.units.main.run(testArray);
    expect(result).toEqual("passed");
  });
});
