import { Unit, UnitObject } from "uman";

class OneObject extends UnitObject {
  async test(testsObject, arr) {
    return await testsObject.sum(arr);
  }
}

export default Unit.instance(
  class extends Unit {
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

    newObject() {
      return new OneObject();
    }
  }
);
