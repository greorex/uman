import { Unit } from "uman";

export default Unit(
  class {
    // returns cubes of array's elements
    cubes(arr) {
      return arr.map(i => i ** 3);
    }

    onstart() {
      console.log("two started");
    }

    onterminate() {
      console.log("two terminated");
    }
  }
);
