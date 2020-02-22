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
import { UnitBase } from "./base";

// locals
const EVENT = MessageType.EVENT;
const REQUEST = MessageType.REQUEST;
const RESPONSE = MessageType.RESPONSE;
const RECEIPT = MessageType.RECEIPT;
const SIGNATURE = "uman";

/**
 * unit worker communication engine
 */
export class UnitWorkerEngine extends UnitBase {
  constructor(engine) {
    super();

    // proper engine
    this._engine = data => engine;

    // attach engine (worker or worker self instance)
    // ...args to support transferable objects
    this.postMessage = (...args) => engine.postMessage(...args);
    engine.onerror = error => {
      throw new Error(error);
    };
    engine.onmessage = event => {
      const data = this.fromEvent(event);

      if (!data) {
        // call standard listener
        // @ts-ignore
        return typeof this.onmessage === "function" && this.onmessage(event);
      }

      // uman's
      switch (data.type) {
        case EVENT: {
          return this._onevent(data);
        }

        case REQUEST: {
          const _engine = this._engine(data),
            response = {
              cid: data.cid
            };

          if (data.receipt) {
            // alive
            response.type = RECEIPT;
            this.toMessage(response, _engine);
          }

          return (async () => {
            // call
            try {
              response.result = await this._calls._oncall(data, this);
            } catch (error) {
              response.error = error;
            }

            response.type = RESPONSE;
            this.toMessage(response, _engine);
          })();
        }

        case RESPONSE: {
          const c = this._calls.get(data.cid);
          return c && c.onresponse(data);
        }

        case RECEIPT: {
          const c = this._calls.get(data.cid);
          return c && c.onreceipt === "function" && c.onreceipt();
        }
      }
    };
  }

  // override
  _dispatch(data) {
    switch (data.type) {
      case REQUEST:
        // post and
        return new Promise((resolve, reject) => {
          const _engine = this._engine(data),
            { _calls, options } = this,
            c = {};

          // to check if target alive
          if (options.timeout) {
            data.receipt = true;
          }

          // id
          data.cid = _calls.store(c);

          // post
          this.toMessage(data, _engine);

          // to return result
          c.onresponse = ({ cid, result, error }) => {
            c.onreceipt && c.onreceipt();
            _calls.delete(cid);
            !error ? resolve(result) : reject(error);
          };

          // check no target
          if (options.timeout) {
            const timer = setTimeout(() => {
              reject(
                new Error(`Timeout on request ${data.method} in ${data.target}`)
              );
            }, options.timeout);
            // alive
            c.onreceipt = () => clearTimeout(timer);
          }
        });

      case EVENT:
        // just post
        this.toMessage(data);
    }
  }

  toMessage(data, engine = null) {
    const signed = {
        [SIGNATURE]: data
      },
      args = !data.error ? this._calls.toMessage(signed) : [signed];

    if (!engine) {
      engine = this._engine(data);
    }

    engine.postMessage(...args);
  }

  fromEvent(event) {
    const signed = this._calls.fromMessage(event.data);
    // unsign
    return signed ? signed[SIGNATURE] : undefined;
  }

  // to self and back
  post(event, ...args) {
    return this._dispatch({
      type: EVENT,
      method: event,
      args
    });
  }
}
