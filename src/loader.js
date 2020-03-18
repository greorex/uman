/**
 * uman
 * Units Manager javascript library to orchestrate web workers
 *
 * Copyright (c) 2019 Grigory Schurovski (https://github.com/greorex)
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// @ts-check

import Base from "./base";
import Handler from "./handler";

/**
 * loaders by order
 */
const loadersQueue = [
  // function
  ({ loader }) => {
    if (typeof loader === "function") {
      return loader();
    }
  },
  // promise
  ({ loader }) => {
    if (loader instanceof Promise) {
      return loader;
    }
  },
  // module
  ({ loader, args }) => {
    if (loader && typeof loader.default === "function") {
      // has to be export default class
      loader = loader.default;
      if (loader && loader.constructor) {
        if (!args) args = [];
        return new loader(...args);
      }
    }
  }
];

/**
 * lazy loader engine
 */
export default class Loader {
  constructor(params) {
    this.params = params;
  }

  async instance() {
    let { loader, name, adapter, ...rest } = this.params;
    for (let f of loadersQueue) {
      let result = await f({ loader, name, ...rest });
      // loaded?
      if (result instanceof Base) {
        return result;
      }
      // by default?
      if (result instanceof Handler) {
        return new (adapter ? adapter : Base)(result);
      }
      // try next
      if (result) {
        loader = result;
      }
    }

    throw new Error(`Wrong class of unit: ${name}`);
  }

  static instance(params) {
    return new Loader(params).instance();
  }

  static register(loader) {
    if (Array.isArray(loader)) {
      for (let l of loader) {
        Loader.register(l);
      }
    } else if (!loadersQueue.includes(loader)) {
      loadersQueue.push(loader);
    }
  }
}
