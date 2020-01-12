import { Unit } from "uman";

export default Unit.instance(
  class extends Unit {
    // returns cubes of array's elements
    cubes(arr) {
      return arr.map(i => i ** 3);
    }
  }
);
