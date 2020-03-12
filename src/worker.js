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
import { UnitBase } from "./base";
import { json2ab } from "./buffer/writer";
import { ab2json } from "./buffer/reader";

// locals
const SIGNATURE = "_uman";
const TRANSFER = "_transfer";

// if supported
const _offscreenCanvas = typeof OffscreenCanvas === "function";

/**
 * unit worker communication engine
 */
export class UnitWorkerEngine extends UnitBase {
  constructor(engine) {
    super();

    // proper engine
    this._engine = data => engine;

    // attach engine (worker or worker self instance)
    // arguments to support transferable objects
    this.postMessage = function() {
      engine.postMessage.apply(engine, arguments);
    };
    engine.onerror = error => {
      throw error;
    };
    engine.onmessage = event => {
      const data = this.fromEvent(event);

      if (!data) {
        // ordinary listener
        this.onmessage(event);
      }

      // uman's
      switch (data.type) {
        case MT.EVENT:
          return this._onevent(data);
        case MT.REQUEST:
          return this._onrequest(data);
        case MT.RESPONSE:
          return this._onresponse(data);
        case MT.RECEIPT:
          return this._onreceipt(data);
      }
    };
  }

  _onrequest(data) {
    const { cid } = data,
      _engine = this._engine(data),
      promises = [];

    // call
    promises.push(
      new Promise(async resolve => {
        const r = {
          type: MT.RESPONSE,
          cid
        };

        try {
          r.result = await this._calls._oncall(data, this);
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

  _onresponse(data) {
    const c = this._calls.get(data.cid);
    c && c.onresponse(data);
  }

  _onreceipt(data) {
    const c = this._calls.get(data.cid);
    c && c.onreceipt && c.onreceipt();
  }

  // override
  _dispatch(data) {
    switch (data.type) {
      case MT.REQUEST:
        // post and
        return new Promise((resolve, reject) => {
          const { _calls, options } = this,
            c = {};

          // to check if target alive
          if (options.timeout) {
            data.receipt = true;
          }

          // id
          data.cid = _calls.store(c);

          // post
          this.toMessage(data);

          // to return result
          c.onresponse = ({ cid, result, error }) => {
            c.onreceipt && c.onreceipt();
            _calls.delete(cid);
            !error ? resolve(result) : reject(error);
          };

          // check no target
          if (options.timeout) {
            let timer = setTimeout(() => {
              reject(
                new Error(`Timeout on request ${data.method} in ${data.target}`)
              );
            }, options.timeout);
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
      stringify = false,
      { _calls } = this,
      replacer = (k, v) => {
        switch (typeof v) {
          case "function":
          case "object":
            v = _calls.replacer(v);
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
      };

    /*
  console.time("str");
  JSON.stringify(data, replacer);
  console.timeEnd("str");
  transfer.length = id = 0;

  const e = new ValueEncoder();
  console.time("buf");
  e.encode(data, replacer);
  console.timeEnd("buf");
  transfer.length = id = 0;
  */

    if (!engine) {
      engine = this._engine(data);
    }

    // sign
    data[SIGNATURE] = true;

    transfer[0] = pure
      ? data
      : stringify
      ? JSON.stringify(data, replacer)
      : json2ab(data, replacer);

    // as args, with transferables
    engine.postMessage.apply(engine, [
      transfer,
      !(pure || stringify) ? transfer : transfer.slice(1)
    ]);
  }

  fromEvent(event) {
    const { data } = event,
      { _calls } = this,
      reviver = (k, v) => {
        if (typeof v === "object") {
          if (TRANSFER in v) {
            v = data[v[TRANSFER]];
          }
          v = _calls.reviver(v);
        }
        return v;
      };

    // from args, with transferables
    if (Array.isArray(data) && data.length) {
      const message = data[0],
        signed =
          typeof message === "string"
            ? JSON.parse(message, reviver)
            : message instanceof ArrayBuffer
            ? ab2json(message, reviver)
            : message;

      // our?
      if (signed && signed[SIGNATURE]) {
        return signed;
      }
    }
  }

  // to self and back
  post(event, ...args) {
    return this._dispatch({
      type: MT.EVENT,
      method: event,
      args
    });
  }

  // to override
  onmessage(event) {}
}
