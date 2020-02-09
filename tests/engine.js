/**
 * Test Engine, pseudo jest for browsers
 *
 * Copyright (c) 2020 Grigory Schurovski (https://github.com/greorex)
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-check

/**
 * to run all
 */
class TestEngine {
  constructor() {
    this.queue = [];
  }

  test(name, func) {
    this.queue.push({
      name,
      func
    });
  }

  check(result, test) {
    if (result !== test) throw new Error(`${result} != ${test}`);
  }

  async runTest(item) {
    render(`# ${item.name}`, true);
    try {
      await item.func();
    } catch (error) {
      render(error);
    }
  }

  async run() {
    try {
      // @ts-ignore
      this.beforeAll && (await this.beforeAll());

      for (let item of this.queue) {
        await this.runTest(item);
      }
    } catch (error) {
      render(error);
    }
  }
}

const te = new TestEngine();

/**
 * exports
 */
// @ts-ignore
export const beforeAll = f => (te.beforeAll = f);
export const describe = (title, f) => {
  render(`${title}`, true);
  f();
  te.run();
};
export const test = (...args) => te.test(...args);
export const expect = result => ({
  toEqual: test => te.check(result, test),
  toBeInstanceOf: test => te.check(true, result instanceof test)
});
export let selector = "body";
export const render = (message, bold = false) => {
  message = String(message);
  if (!document) console.log(message);
  else {
    const p = document.createElement("p");
    if (bold) p.style.fontWeight = "bold";
    if (message.match(/Error|Timeout/)) p.style.color = "red";
    p.innerHTML = message;
    document.querySelector(selector).appendChild(p);
  }
};
