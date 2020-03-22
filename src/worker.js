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

import { MessageType as MT, ReferenceType as RT } from "./enums";
import { Packager, PackagerMethod as PM } from "./packager";
import { ProxyObject, ProxyTarget } from "./proxy";
import Handler from "./handler";

// locals
const SIGNATURE = "_uman";
const REFERENCE = "_ref";

// if supported
const _offscreenCanvas = typeof OffscreenCanvas === "function",
  _bigUint64Array = typeof BigUint64Array === "function",
  _bigInt64Array = typeof BigInt64Array === "function";

/**
 * reference object to transfer
 */
const Reference = (type, id = null, owner = null) => {
  const r =
    typeof type === "object"
      ? type
      : {
          type,
          id
        };
  if (owner) r.owner = owner;
  return {
    [REFERENCE]: r
  };
};

/**
 * worker communication engine
 */
export default class WorkerHandler extends Handler {
  constructor(engine) {
    super();

    // proper engine
    this._engine = () => engine;

    // packager
    this.packager = new Packager(SIGNATURE);

    // attach engine (worker or worker self instance)
    // arguments to support transferable objects
    this.postMessage = (...args) => engine.postMessage(...args);
    engine.onerror = error => {
      throw error;
    };
    engine.onmessage = event => {
      const data = this.fromEvent(event);

      // uman's ?
      switch (data && data.type) {
        case MT.REQUEST:
        case MT.START:
        case MT.TERMINATE:
          return this.onrequest(data);
        case MT.RESPONSE:
          return this.onresponse(data);
        case MT.EVENT:
          return this.onevent(data);
        case MT.RECEIPT:
          return this.onreceipt(data);
      }

      // standard?
      // @ts-ignore
      this.onmessage && this.onmessage(event);
    };
  }

  // override
  dispatch(data) {
    switch (data.type) {
      case MT.REQUEST:
      case MT.START:
      case MT.TERMINATE:
        // post and
        return new Promise((resolve, reject) => {
          const { timeout } = this.options,
            c = {};

          // to check if target alive
          if (timeout) {
            data.receipt = true;
          }

          // id
          data.cid = this.calls.store(c);

          // post
          this.toMessage(data);

          // to return result
          c.onresponse = ({ cid, result, error }) => {
            c.timeout && clearTimeout(c.timeout);
            this.calls.delete(cid);
            !error ? resolve(result) : reject(error);
          };

          // check no target
          if (timeout) {
            c.timeout = setTimeout(() => {
              reject(
                new Error(`Timeout on request ${data.method} in ${data.target}`)
              );
            }, timeout);
          }
        });

      case MT.EVENT:
        // just post
        this.toMessage(data);
    }
  }

  // to override

  onrequest(data) {
    const { cid } = data,
      _engine = this._engine(),
      promises = [];

    // call
    promises.push(
      new Promise(async resolve => {
        const r = {
          type: MT.RESPONSE,
          cid
        };

        try {
          r.result = await this.calls.oncall(data, this);
        } catch (error) {
          r.error = error;
        }

        this.toMessage(r, _engine, r.error);

        resolve();
      })
    );

    if (data.receipt) {
      // alive
      promises.push(
        new Promise(resolve => {
          const r = {
            type: MT.RECEIPT,
            cid
          };

          this.toMessage(r, _engine, true);

          resolve();
        })
      );
    }

    // in parallel
    Promise.all(promises);
  }

  onresponse(data) {
    const c = this.calls.get(data.cid);
    if (!c) {
      throw new Error(`Unknown response ${data.cid}`);
    }
    c && c.onresponse(data);
  }

  onreceipt(data) {
    const c = this.calls.get(data.cid);
    c && c.timeout && clearTimeout(c.timeout);
  }

  toMessage(data, engine = null, pure = false) {
    let id = 0;
    const transfer = [],
      { name } = this.calls._handler,
      method = pure ? PM.PURE : this.options.packager;

    // pack
    transfer[0] = this.packager.pack(method, data, (_, v) => {
      switch (v && typeof v) {
        case "object":
          // plain obejcts can be cloned
          if (
            Object.getPrototypeOf(v) === Object.prototype ||
            Array.isArray(v)
          ) {
            break;
          }

          // can be cloned by structured clone algorithm
          if (
            method === PM.OBJECT &&
            (v instanceof Boolean ||
              v instanceof String ||
              v instanceof Date ||
              v instanceof RegExp ||
              v instanceof Map ||
              v instanceof Set ||
              v instanceof Blob ||
              v instanceof File ||
              v instanceof FileList ||
              v instanceof ImageData ||
              // typed arrays
              v instanceof Uint8Array ||
              v instanceof Uint8ClampedArray ||
              v instanceof Int8Array ||
              v instanceof Uint16Array ||
              v instanceof Int16Array ||
              v instanceof Uint32Array ||
              v instanceof Int32Array ||
              v instanceof Float32Array ||
              v instanceof Float64Array ||
              (_bigUint64Array && v instanceof BigUint64Array) ||
              (_bigInt64Array && v instanceof BigInt64Array))
          ) {
            break;
          }

          // can be transfered
          if (
            v instanceof ArrayBuffer ||
            v instanceof ImageBitmap ||
            (_offscreenCanvas && v instanceof OffscreenCanvas)
          ) {
            transfer[++id] = v;
            return Reference(RT.TRANSFER, id);
          }

          // others
          return v instanceof ProxyObject
            ? Reference(v._ref)
            : v instanceof ProxyTarget
            ? Reference(RT.UNIT, v._target)
            : Reference(RT.OBJECT, this.calls.store(v), name);

        case "function":
          return Reference(RT.FUNCTION, this.calls.store(v), name);
      }

      return v;
    });

    if (!engine) {
      engine = this._engine();
    }

    // as args, with transferables
    engine.postMessage(
      ...[transfer, method === PM.BUFFER ? transfer : transfer.slice(1)]
    );
  }

  fromEvent(event) {
    const { data } = event;

    // from args, with transferables
    if (Array.isArray(data) && data.length) {
      const handler = this.calls._handler,
        { name, units } = handler;

      return this.packager.unpack(data[0], (_, v) => {
        if (typeof v === "object" && v && REFERENCE in v) {
          const ref = v[REFERENCE],
            { type, id, owner } = ref;

          switch (type) {
            case RT.OBJECT:
              return owner === name
                ? this.calls.get(id)
                : new ProxyObject(handler, ref);

            case RT.FUNCTION:
              return owner === name
                ? this.calls.get(id)
                : (...args) =>
                    handler.redispatch({
                      type: MT.REQUEST,
                      target: owner,
                      handler: ref,
                      args
                    });

            case RT.UNIT:
              return units[id];

            case RT.TRANSFER:
              return data[id];
          }
        }

        // as is
        return v;
      });
    }
  }
}
