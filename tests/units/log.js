import { Unit } from "uman";

export default Unit.instance(
  class extends Unit {
    // to catch "log" events from all units
    onlog(event) {
      console.log(event.sender + ": " + event.payload);
    }
  }
);
