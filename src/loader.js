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

import { UnitBase } from "./base";

/**
 * loaders by order
 */
const loadersQueue = [
  // function
  params => {
    const { loader } = params;
    if (loader instanceof Function) return loader();
  },
  // promise
  params => {
    const { loader } = params;
    if (loader instanceof Promise) return loader;
  },
  // module
  params => {
    let { loader, args } = params;
    if (loader && loader.default instanceof Function) {
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
export class UnitLoader {
  constructor(params) {
    this.params = params;
  }

  async instance() {
    let { loader, name, ...rest } = this.params;
    for (let f of loadersQueue) {
      const unit = await f({ loader, name, ...rest });
      // loaded?
      if (unit instanceof UnitBase) return unit;
      // try next
      if (unit) loader = unit;
    }

    throw new Error(`Wrong class of unit: ${name}`);
  }

  static instance(params) {
    return new UnitLoader(params).instance();
  }

  static register(loader) {
    if (Array.isArray(loader)) {
      for (let l of loader) UnitLoader.register(l);
    } else {
      if (!loadersQueue.includes(loader)) loadersQueue.push(loader);
    }
  }
}
