import { render, describe, test, beforeAll, expect } from "./engine";
import { Main, Adapter } from "./classes";
import {
  name,
  version,
  options,
  UnitLoader,
  UnitsManager,
  PackagerMethod as PM
} from "uman";

// to debug...
options.timeout = 0;
options.packager = PM.OBJECT;

/**
 * tests
 */
describe(`${name}, v${version}`, () => {
  let main;
  const testArray = [2, 3, 4, 5];
  const innerLog = true;

  beforeAll(async () => {
    main = new Main();

    main.add({
      log: () => import("./units/log"),
      one: () => import("worker-loader!./units/one"),
      two: () => import("sharedworker-loader!./units/two"),
      tests: () => import("sharedworker-loader!./units/tests")
      // tests: {
      //   loader: () => import("service-worker-loader!./units/tests"),
      //   args: [{ scope: "/" }]
      // }
    });

    if (innerLog) await main.start("log");
  });

  test("no manager", async () => {
    const unit = await UnitLoader.instance({
      loader: import("worker-loader!./units/tests.js"),
      adapter: Adapter
    });

    await unit.start();

    const unsibscribe = await unit.on("noManagerTest", (...args) => {
      render(`${args[0]}  received`);
    });

    unit.post("noManagerTest", "unit -> event sent");

    const result = await unit.noManagerTest(testArray);

    unsibscribe();

    unit.terminate();

    expect(result).toEqual("passed");
  });

  test("main unit created", () => {
    expect(main).toBeInstanceOf(UnitsManager);
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
    const result = await main.run(testArray);
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

  test("other units terminated", async () => {
    await main.terminate();
    // check real list
    expect(main.select("all").length).toEqual(1);
    expect(main.select("main")).toBeInstanceOf(Main);
  });
});
