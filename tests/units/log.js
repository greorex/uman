import { Unit } from "uman";

export default Unit.instance(
  class extends Unit {
    constructor() {
      super();

      // to catch "log" events from all units
      this.units.on("log", (sender, ...args) => {
        console.log(`${sender} : ${args[0]}`);
      });
    }
  }
);
