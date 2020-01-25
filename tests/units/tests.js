import { Unit, UnitObject } from "uman";

import { pureTest, pureSum } from "./../pure";

class TestsObject extends UnitObject {
  sum(arr) {
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
        .then(result => units.emit("log", `Sum of [${arr}] = ${result}`));

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
      this.emit(event.method, event.payload + " returned");
    }

    ondirectEmitTest(event) {
      this.units.emit(event.method, event.payload + " returned");
    }

    async noManagerTest(arr) {
      const result = await this.sum(arr);
      return pureSum(arr) === result ? "passed" : "failed";
    }

    newObject() {
      return new TestsObject();
    }
  }
);
