import { UnitsManager, Unit, UnitWorker } from "./../src";
// import UnitOne from "./units/one";
import UnitLog from "./units/log";

// add units
const uman = new UnitsManager({
  // one: () => new UnitOne(),
  one: () => {
    const worker = new Worker("./units/one.js", { type: "module" });
    return new UnitWorker(worker);
  },
  two: () => import("./units/two")
  // two: () => {
  //   const worker = new Worker("./units/two.js", { type: "module" });
  //   return new UnitWorker(worker);
  // }
});

// add test and log units later
uman.addUnits({
  test: () => {
    const worker = new Worker("./units/test.js", { type: "module" });
    return new UnitWorker(worker);
  },
  log: () => new UnitLog()
});

class MainUnit extends Unit {
  async run() {
    const result = await this.units.test.run([2, 3, 4]);
    this.units.log.render("Test " + result);
    uman.deleteUnit("test");
  }
}

Unit.use(MainUnit);

// add main unit
uman.addUnits({
  main: new MainUnit()
});

// run
uman.units.main.run();
