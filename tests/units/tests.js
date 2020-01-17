import { Unit } from "uman";

import { pureTest, pureSum } from "./../pure";

export default Unit.instance(
  class extends Unit {
    async run(arr) {
      const units = this.units;
      const { one } = units;

      units.emit("log", "Starting with " + arr);

      // call method "sum" of Unit One
      const sum = await one.sum(arr);
      // and fire event "log" to all units
      units.emit("log", "Sum of " + arr + " = " + sum);

      // call method "cubes" of Unit Two
      const cubes = await units.two.cubes(arr);
      units.emit("log", "Cubes of " + arr + " = " + cubes);

      const sumofcubes1 = await one.sumofcubes(arr);
      units.emit("log", "Sum of cubes of " + arr + " = " + sumofcubes1);

      const sumofcubes2 = await one.sum(cubes);
      units.emit("log", "Sum of " + cubes + " = " + sumofcubes2);

      units.emit("log", "Done: " + sumofcubes1 + " = " + sumofcubes2);

      return sumofcubes1 === sumofcubes2 ? "passed" : "failed";
    }

    pureTest(arr) {
      return pureTest(arr);
    }

    onnoManagerTest(event) {
      this.emit(event.method, event.payload + " returned");
    }

    async noManagerTest(arr) {
      const result = await this.sum(arr);
      return pureSum(arr) === result ? "passed" : "failed";
    }
  }
);
