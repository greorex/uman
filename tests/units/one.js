import { Unit } from "../../src";

export default class UnitOne extends Unit {
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
}

Unit.use(UnitOne);
