/**
 * Critical Section for asynchronous calls
 *
 * Copyright (c) 2020 Grigory Schurovski (https://github.com/greorex)
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-check

// import CS from "critical";
// const cs = new CS();
// const result = await cs.enter((leave, reject) => {
//   critical code...
//   leave(result);
//   or...
//   reject(error);
// });
export default class {
  constructor() {
    let flag = null;
    const queue = [];

    this.enter = section =>
      new Promise((resolve, reject) => {
        const f = () =>
          section(result => {
            resolve(result);
            if (queue.length) queue.pop()();
            else flag = null;
          }, reject);

        if (flag) queue.unshift(() => f());
        else (flag = {}), f();
      });
  }
}
