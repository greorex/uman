import { UnitsManager, Unit, UnitWorker } from "../src";
import UnitOne from "./units/one";
import UnitLog from "./units/log";

const twoLoader = () => {
  const worker = new Worker("./units/two.worker.js");
  return new UnitWorker(worker);
};
const testLoader = () => {
  const worker = new Worker("./units/test.worker.js");
  return new UnitWorker(worker);
};

describe("runs all test", () => {
  let uman;
  const mockRender = jest.fn(message => message);
  class Log extends UnitLog {
    render(message) {
      mockRender(message);
    }
  }

  beforeAll(() => {
    uman = new UnitsManager({
      one: new UnitOne(),
      two: twoLoader
    });
  });

  afterAll(() => {
    if (uman) {
      uman.deleteAll();
    }
  });

  test("units manager created", () => {
    expect(uman).toBeInstanceOf(UnitsManager);
  });

  test("units manager has two units", () => {
    expect(uman.units).toHaveProperty("one");
    expect(uman.units).toHaveProperty("two");
  });

  test("addUnits adds two units", () => {
    uman.addUnits({
      test: testLoader,
      log: new Log()
    });
    expect(uman.units).toHaveProperty("test");
    expect(uman.units).toHaveProperty("log");
  });

  test("log unit created", () => {
    const log = uman.units.log;
    expect(log).toBeInstanceOf(Unit);
  });

  test("test unit loaded", () => {
    const test = uman.units.test;
    expect(test).toBeInstanceOf(UnitWorker);
  });

  it("test's run returns passed", async () => {
    //expect.assertions(1);
    const log = uman.units.log;
    const result = await log.units.test.run([2, 3, 4]);
    expect(result).toEqual("passed");
  });

  test("units manager deletes test", () => {
    uman.deleteUnit("test");
    expect(uman.units).not.toHaveProperty("test");
  });
});
