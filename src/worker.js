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
      const { data } = event;

      // is this our message?
      switch (data instanceof Object && data.type) {
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
            _engine.postMessage(response);
          }

          // call
          response.type = RESPONSE;
          return this._calls
            .response(data, this)
            .then(result => (response.result = result))
            .catch(error => (response.error = error))
            .finally(() => _engine.postMessage(response));
        }

        case RESPONSE: {
          const c = this._calls.get(data.cid);
          return c && c.onresponse(data);
        }

        case RECEIPT: {
          const c = this._calls.get(data.cid);
          return c && c.onreceipt instanceof Function && c.onreceipt();
        }
      }

      // call standard listener
      // @ts-ignore
      this.onmessage instanceof Function && this.onmessage(event);
    };

    // override
    this._dispatch = data => {
      switch (data.type) {
        case REQUEST:
          // post and
          return new Promise((resolve, reject) => {
            const _engine = this._engine(data),
              { _calls, options } = this,
              c = {};

            // to check if target alive
            if (options.timeout) data.receipt = true;

            // post
            _engine.postMessage(_calls.toRequest(data, c));

            // to return result
            c.onresponse = ({ cid, result, error }) => {
              c.onreceipt instanceof Function && c.onreceipt();
              !error
                ? resolve(_calls.fromResponse({ cid, result }))
                : reject(error);
            };

            // check no target
            if (options.timeout) {
              const timer = setTimeout(() => {
                reject(
                  new Error(
                    `Timeout on request ${data.method} in ${data.target}`
                  )
                );
              }, options.timeout);
              // alive
              c.onreceipt = () => clearTimeout(timer);
            }
          });

        case EVENT:
          // just post
          engine.postMessage(data);
      }
    };
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
