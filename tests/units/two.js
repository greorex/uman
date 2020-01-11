import { Unit } from "../../src";

export default class UnitTwo extends Unit {
  // returns cubes of array's elements
  cubes(arr) {
    return arr.map(i => i ** 3);
  }
}

Unit.use(UnitTwo);
