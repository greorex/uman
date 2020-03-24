import { Unit, Emitter } from "uman";

class OneObject extends Emitter {
  async test({ testsObject, arr }) {
    this.fire("test");
    return await testsObject.sum(arr);
  }
}

export default Unit(
  class {
    sum(arr) {
      return arr.reduce((r, i) => (r += i), 0);
    }

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

    onstart() {
      console.log("one started");
    }

    onterminate() {
      console.log("one terminated");
    }
  }
);
