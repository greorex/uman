import { Unit, Emitter } from "uman";

import { pureTest, pureSum } from "./../pure";

class TestsObject extends Emitter {
  sum(arr) {
    this.fire("sum", arr);
    return pureSum(arr);
  }
}

export default Unit(
  class {
    constructor() {
      this.on("noManagerTest", (...args) => {
        this.post("noManagerTest", `${args[0]} returned`);
      });

      this.units.on("testEvents", (sender, ...args) => {
        this.units.post(
          "testEvents",
          `${args[0]} from ${sender} returned by ${this.name}`
        );
      });
    }

    async run(arr) {
      const units = this.units;
      const { one } = units;

      // call method "sum" of Unit One
      one.sum(arr).then(result => {
        units.post("log", `Sum of [${arr}] = ${result}`);
      });

      const sum = await Promise.all([
        // call method "cubes" of Unit Two
        one.sum(await units.two.cubes(arr)),
        one.sumofcubes(arr)
      ]);

      return sum[0] === sum[1] ? "passed" : "failed";
    }

    pureTest(arr) {
      return pureTest(arr);
    }

    async noManagerTest(arr) {
      const result = await this.sum(arr);
      return pureSum(arr) === result ? "passed" : "failed";
    }

    async testArgsReturns(arr) {
      const testsObject = await this.units.main.TestsObject();
      testsObject.on("sum", arr => {
        this.units.post("log", `callback: testsObject.onsum ${arr}`);
      });

      const oneObject = await this.units.one.OneObject();
      oneObject.on("test", () => {
        this.units.post("log", "callback: oneObject.ontest");
      });

      const result = await oneObject.test({ testsObject, arr });
      return result === pureSum(arr) ? "passed" : "failed";
    }

    async testMisconception({ object, one }, arr) {
      let result;
      // test object passed
      result = await object.sum(arr);
      if (result !== pureSum(arr)) return "failed";
      this.units.one.on("testMisconception", () => {
        this.units.post("log", "tests.units.one.ontestMisconception");
      });
      // test unit one passed from main
      one.on("testMisconception", () => {
        this.units.post("log", "one.ontestMisconception");
      });
      result = await one.sum(arr);
      if (result !== pureSum(arr)) return "failed";
      // super test
      result = await one.testMisconception(object, one);
      if (!(result instanceof Object)) return "failed";
      if ((await result.one.sum(arr)) !== (await result.object.sum(arr)))
        return "failed";

      return "passed";
    }

    testTransferables(arrBuf1, arrBuf2) {
      return [arrBuf1, arrBuf2];
    }

    TestsObject() {
      return new TestsObject();
    }

    onstart() {
      console.log("tests started");
    }

    onterminate() {
      console.log("tests terminated");
    }
  }
);
