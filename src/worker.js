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

import { MessageType as MT } from "./enums";
import { Packager, PackagerMethod as PM } from "./packager";
import Base from "./base";
import Handler from "./handler";

// locals
const SIGNATURE = "_uman";
const TRANSFER = "_transfer";

// if supported
const _offscreenCanvas = typeof OffscreenCanvas === "function";

/**
 * worker communication engine
 */
export class WorkerHandler extends Handler {
  constructor(engine) {
    super();

    // proper engine
    this._engine = () => engine;

    // packager
    this.packager = new Packager(SIGNATURE);

    // attach engine (worker or worker self instance)
    // arguments to support transferable objects
    engine.onerror = error => {
      throw error;
    };
    engine.onmessage = event => {
      const data = this.fromEvent(event);

      // uman's ?
      if (data) {
        switch (data.type) {
          case MT.EVENT:
            return this.onevent(data);
          case MT.REQUEST:
            return this.onrequest(data);
          case MT.RESPONSE:
            return this.onresponse(data);
          case MT.RECEIPT:
            return this.onreceipt(data);
        }
      }

      // standard
      this.unit.onmessage(event);
    };
  }

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
    c && c.onresponse(data);
  }

  onreceipt(data) {
    const c = this.calls.get(data.cid);
    c && c.onreceipt && c.onreceipt();
  }

  // override
  dispatch(data) {
    switch (data.type) {
      case MT.REQUEST:
        // post and
        return new Promise((resolve, reject) => {
          const c = {};

          // to check if target alive
          if (this.options.timeout) {
            data.receipt = true;
          }

          // id
          data.cid = this.calls.store(c);

          // post
          this.toMessage(data);

          // to return result
          c.onresponse = ({ cid, result, error }) => {
            c.onreceipt && c.onreceipt();
            this.calls.delete(cid);
            !error ? resolve(result) : reject(error);
          };

          // check no target
          if (this.options.timeout) {
            let timer = setTimeout(() => {
              reject(
                new Error(`Timeout on request ${data.method} in ${data.target}`)
              );
            }, this.options.timeout);
            // alive
            c.onreceipt = () => {
              if (timer) {
                clearTimeout(timer);
                timer = null;
              }
            };
          }
        });

      case MT.EVENT:
        // just post
        this.toMessage(data);
    }
  }

  toMessage(data, engine = null, pure = false) {
    let id = 0;
    const transfer = [],
      method = pure ? PM.PURE : this.options.packager;

    // pack
    transfer[0] = this.packager.pack(method, data, (_, v) => {
      switch (v && typeof v) {
        case "function":
        case "object":
          v = this.calls.replacer(v);
          // transfer?
          if (
            v instanceof ArrayBuffer ||
            v instanceof ImageBitmap ||
            (_offscreenCanvas && v instanceof OffscreenCanvas)
          ) {
            transfer[++id] = v;
            v = {
              [TRANSFER]: id
            };
          }
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
      return this.packager.unpack(data[0], (_, v) => {
        if (typeof v === "object" && v) {
          if (TRANSFER in v) {
            v = data[v[TRANSFER]];
          }
          v = this.calls.reviver(v);
        }
        return v;
      });
    }
  }
}

/**
 * base for worker related
 */
export class WorkerBase extends Base {
  constructor(handler) {
    super(handler);

    // attach engine
    this.postMessage = (...args) => handler._engine().postMessage(...args);

    // to self and back
    this.post = (event, ...args) => {
      return handler.dispatch({
        type: MT.EVENT,
        method: event,
        args
      });
    };
  }

  // to override
  onmessage(event) {}
}
