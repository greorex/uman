import { Unit } from "./../uman";

export default Unit.instance(
  class extends Unit {
    constructor() {
      super();

      // to catch "log" event from tests
      this.units.tests.onlog = message => {
        // and render it
        this.render(message);
      };
    }

    render(message) {
      console.log(message);
    }
  }
);
