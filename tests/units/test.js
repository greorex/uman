import { Unit } from "../../src";

export default class UnitTest extends Unit {
  async run(arr) {
    const units = this.units;
    const { one, log } = units;

    // call method "sum" of Unit One
    const sum = await one.sum(arr);
    // and fire event "log" to all units
    log.emit("log", "Sum of " + arr + " = " + sum);

    const cubes = await units.two.cubes(arr);
    log.emit("log", "Cubes of " + arr + " = " + cubes);

    const sumofcubes1 = await one.sumofcubes(arr);
    log.emit("log", "Sum of cubes of " + arr + " = " + sumofcubes1);

    const sumofcubes2 = await one.sum(cubes);
    log.emit("log", "Sum of " + cubes + " = " + sumofcubes2);

    return sumofcubes1 === sumofcubes2 ? "passed" : "failed";
  }
}

Unit.use(UnitTest);
