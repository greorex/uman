import { Unit, UnitObject } from "uman";

import { pureTest, pureSum } from "./../pure";

class TestsObject extends UnitObject {
  sum(arr) {
    this.fire("sum", arr);
    return pureSum(arr);
  }
}

export default Unit.instance(
  class extends Unit {
    async run(arr) {
      const units = this.units;
      const { one } = units;

      // call method "sum" of Unit One
      one
        .sum(arr)
        .then(result => units.post("log", `Sum of [${arr}] = ${result}`));

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

    onnoManagerTest(event) {
      this.post(event.method, event.args[0] + " returned");
    }

    ontestEvents(event) {
      this.units.post(event.method, event.args[0] + " returned");
    }

    async noManagerTest(arr) {
      const result = await this.sum(arr);
      return pureSum(arr) === result ? "passed" : "failed";
    }

    async testArgsReturns(arr) {
      const testsObject = await this.units.main.TestsObject();
      testsObject.on("sum", arr => {
        this.units.post("log", "callback: testsObject.onsum " + arr);
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
      // test UnitObject passed
      result = await object.sum(arr);
      if (result !== pureSum(arr)) return "failed";
      // test unit one passe
      result = await one.sum(arr);
      if (result !== pureSum(arr)) return "failed";
      // super test
      result = await one.testMisconception(object, one);
      if (!(result instanceof Object)) return "failed";
      result = await result.one.sum(arr);
      if (result !== pureSum(arr)) return "failed";

      return "passed";
    }

    TestsObject() {
      return new TestsObject();
    }
  }
);
