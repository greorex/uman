import { Unit } from "../../src";

export default class UnitLog extends Unit {
  constructor() {
    super();

    // to catch "log" event from test
    this.units.test.onlog = message => {
      this.render(message);
    };
  }

  render(message) {
    console.log(message);
  }
}

Unit.use(UnitLog);
