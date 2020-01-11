import { UnitsManager, Unit } from "./uman";
import One from "./units/one";
import Two from "./units/two";
import Tests from "./units/tests";
import Log from "./units/log";

const testArray = [2, 3, 4];

if (!globalThis.Worker) globalThis.Worker = class Worker {};

// main class to run app
class MainUnit extends Unit {
  async run(arr) {
    return await this.units.tests.run(arr);
  }
}

describe("runs all test", () => {
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

  it("adds main unit", () => {
    uman.addUnits({
      main: new MainUnit()
    });
    expect(Object.keys(uman.units).length).toEqual(1);
    expect(uman.units.main).toBeInstanceOf(MainUnit);
  });

  it("adds all other units", () => {
    uman.addUnits({
      one: () => new One(),
      two: () => new Two(),
      tests: () => new Tests(),
      log: () => new Log()
    });
    expect(Object.keys(uman.units).length).toEqual(5);
  });

  it("runs all inner tests", async () => {
    const result = await uman.units.main.run(testArray);
    expect(result).toEqual("passed");
  });
});
