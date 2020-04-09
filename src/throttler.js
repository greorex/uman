/**
 * Throttler for asynchronous calls
 *
 * Copyright (c) 2020 Grigory Schurovski (https://github.com/greorex)
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-check

// import Throttler from "throttler";
// const throttler = new Throttler();
// throttler.start(stop => {
//   code...
//   stop();
// });
export default class {
  constructor() {
    let flag = null,
      last = null;

    this.start = (section) =>
      new Promise((resolve) => {
        const f = () =>
          section((result) => {
            // last
            if (last) last(), (last = null);
            if (!last) flag = null;
            resolve(result);
          });

        if (flag) last = () => f();
        else (flag = {}), f();
      });
  }
}
