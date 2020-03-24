import { Main } from "./classes";
import { name, version } from "uman";

/**
 * tests with jest
 */
describe(`${name}, v${version}`, () => {
  let main;
  const testArray = [2, 3, 4];
  const innerLog = true;

  beforeAll(() => {
    main = new Main();

    main.add({
      log: () => import("./units/log"),
      one: () => import("./units/one"),
      two: () => import("./units/two"),
      tests: () => import("./units/tests")
    });

    if (innerLog) main.start("log");
  });

  test("main unit created", () => {
    expect(main).toBeInstanceOf(Main);
    // check real list
    expect(main.select("main")).toBeInstanceOf(Main);
  });

  test("other units added", () => {
    // check real list
    expect(main.select("all").length).toEqual(5);
  });

  test("methods and events", async () => {
    // but call proxied
    const result = await main.units.tests.pureTest(testArray);
    // post event
    main.units.post("testEvents", "units.post -> event sent");
    expect(result).toEqual("passed");
  });

  test("inner tests passed", async () => {
    const result = await main.run(testArray, 0);
    expect(result).toEqual("passed");
  });

  test("args and returns", async () => {
    const result = await main.testArgsReturns(testArray);
    expect(result).toEqual("passed");
  });

  test("args and returns from worker", async () => {
    const result = await main.units.tests.testArgsReturns(testArray);
    expect(result).toEqual("passed");
  });

  test("misconception", async () => {
    const result = await main.testMisconception(testArray);
    expect(result).toEqual("passed");
  });

  test("transferables", async () => {
    const result = await main.testTransferables(testArray);
    expect(result).toEqual("passed");
  });

  test("unit 'tests' terminated", async () => {
    await main.terminate("tests");
    // check real list
    expect(main.select("all").length).toEqual(4);
  });

  test("all other units terminated", async () => {
    await main.terminate();
    // check real list
    expect(main.select("all").length).toEqual(1);
    expect(main.select("main")).toBeInstanceOf(Main);
  });
});
