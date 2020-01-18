import { Unit } from "uman";

export default Unit.instance(
  class extends Unit {
    constructor() {
      super();
      this.units.tests.onlog = message => {
        console.log("two: " + message);
      };
    }
    // returns cubes of array's elements
    cubes(arr) {
      return arr.map(i => i ** 3);
    }
  }
);
