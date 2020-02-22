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

import { MessageType } from "./enums";
import { UnitObject } from "./object";
import { UnitsProxyTarget } from "./proxy";

// locals
const REQUEST = MessageType.REQUEST;

// reference
const REFERENCE = "_ref";
// types
const OBJECT = "_o";
const FUNCTION = "_f";
const UNIT = "_u";
const TRANSFERABLE = "_t";

/**
 * creates reference object
 */
const Reference = ({ type, id, owner = null }) => {
  const r = {
    type: type,
    id
  };
  if (owner) r.owner = owner;
  return {
    [REFERENCE]: r
  };
};

/**
 * object proxy
 */
class UnitObjectProxy {
  constructor(ref, handler) {
    this._ref = ref;

    // no then function
    // if promise check
    this.then = undefined;

    // no toJSON
    this.toJSON = undefined;

    return new Proxy(this, {
      get: (t, prop, receiver) =>
        prop in t
          ? // if own asked
            Reflect.get(t, prop, receiver)
          : // unit knows
            (...args) =>
              handler._redispatch({
                type: REQUEST,
                target: ref.owner,
                handler: ref,
                method: prop,
                args
              })
    });
  }
}

/**
 * cache
 */
class CallsCache {
  constructor() {
    this._cache = Object.create(null);
  }

  set(key, value) {
    this._cache[key] = value;
  }

  get(key) {
    return this._cache[key];
  }

  delete(key) {
    delete this._cache[key];
  }
}

/**
 * engine to execute calls with built in cache
 */
export class UnitCallsEngine extends CallsCache {
  constructor(handler) {
    super();

    // key
    let _n = 0;
    this.store = value => {
      _n++;
      this.set(_n, value);
      return _n;
    };

    // redispatcher
    this._handler = handler;
  }

  cache(handler, type) {
    return Reference({
      type,
      id: this.store(handler),
      owner: this._handler.name
    });
  }

  _oncall(data, handler) {
    const ref = data.handler;

    // default context
    if (!(ref && ref.owner === handler.name)) {
      return handler._oncall(data);
    }

    // by reference
    const { type, id, owner } = ref;

    switch (type) {
      case OBJECT: {
        const { method } = data,
          o = this.get(id);
        if (!(o instanceof UnitObject && method in o)) {
          throw new Error(`Wrong object for ${method} in ${owner}`);
        }
        return o[method](...data.args);
      }

      case FUNCTION: {
        const f = this.get(id);
        if (typeof f !== "function") {
          throw new Error(`Wrong function reference in ${owner}`);
        }
        return f(...data.args);
      }
    }
  }

  toMessage(data) {
    const transfer = [],
      message = JSON.stringify(data, (_, v) => {
        switch (typeof v) {
          case "function":
            return this.cache(v, FUNCTION);

          case "object":
            if (v instanceof UnitObject) {
              return this.cache(v, OBJECT);
            }
            if (v instanceof UnitsProxyTarget) {
              return Reference({
                type: UNIT,
                id: v._target
              });
            }
            if (v instanceof UnitObjectProxy) {
              return Reference(v._ref);
            }

            // transfer?
            if (
              v instanceof ArrayBuffer ||
              v instanceof ImageBitmap ||
              v instanceof OffscreenCanvas
            ) {
              transfer.push(v);
              return Reference({
                type: TRANSFERABLE,
                id: transfer.length
              });
            }
        }
        // as is
        return v;
      });

    // as args
    return !transfer.length
      ? [message]
      : [
          {
            message,
            transfer
          },
          transfer
        ];
  }

  fromMessage(data) {
    let transferables = null;

    if (typeof data !== "string") {
      const { message, transfer } = data;
      if (!message) {
        // as is
        return data;
      }
      // transfer?
      data = message;
      transferables = transfer;
    }

    const handler = this._handler;

    return JSON.parse(data, (_, v) => {
      if (typeof v === "object") {
        const ref = v[REFERENCE];
        if (ref) {
          const { type, id, owner } = ref;

          switch (type) {
            case OBJECT:
              return owner === handler.name
                ? this.get(id)
                : new UnitObjectProxy(ref, handler);

            case FUNCTION:
              return owner === handler.name
                ? this.get(id)
                : (...args) =>
                    handler._redispatch({
                      type: REQUEST,
                      target: owner,
                      handler: ref,
                      args
                    });

            case UNIT:
              return handler.units[id];

            case TRANSFERABLE:
              if (transferables) {
                return transferables[id - 1];
              }
          }
        }
      }
      // as is
      return v;
    });
  }
}
