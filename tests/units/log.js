import { Unit } from "uman";

export default Unit(
  class {
    constructor() {
      // to catch "log" events from all units
      this.units.on("log", (sender, ...args) => {
        console.log(`${sender} : ${args[0]}`);
      });
    }
  }
);
