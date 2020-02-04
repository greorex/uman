import { Unit, UnitObject } from "uman";

class OneObject extends UnitObject {
  async test({ testsObject, arr }) {
    this.fire("test");
    return await testsObject.sum(arr);
  }
}

export default Unit.instance(
  class extends Unit {
    constructor() {
      super();

      this._id = performance.now();
    }

    // returns sum of array's elements
    sum(arr) {
      return arr.reduce((r, i) => (r += i), 0);
    }

    // returns sum of cubes of array's elements
    // it doesn't calc cubes but Unit Two does
    async sumofcubes(arr) {
      const cubes = await this.units.two.cubes(arr);
      return this.sum(cubes);
    }

    // returns unit
    testMisconception(object, one) {
      this.units.post("testMisconception");
      return { object, one };
    }

    OneObject() {
      return new OneObject();
    }

    start() {
      console.log(`one started with ID=${this._id}`);
    }

    terminate() {
      console.log("one terminated");
    }
  }
);
