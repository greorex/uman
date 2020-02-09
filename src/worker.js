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

    // attach engine (worker or worker self instance)
    // ...args to support transferable objects
    this.postMessage = (...args) => engine.postMessage(...args);
    engine.onerror = error => {
      throw new Error(error);
    };
    engine.onmessage = async event => {
      const { data } = event;

      // current event
      this.event = event;

      // is this our message?
      switch (data instanceof Object && data.type) {
        case EVENT: {
          this._onevent(data);
          return;
        }

        case REQUEST: {
          const response = {
            cid: data.cid
          };

          if (data.receipt) {
            // alive
            response.type = RECEIPT;
            engine.postMessage(response);
          }

          // call
          try {
            const { _calls } = this;
            // check arguments
            data.args = _calls.fromArguments(data.args);
            // call
            const result = await _calls._oncall(data, this);
            // check result
            response.result = _calls.toResult(result);
          } catch (error) {
            response.error = error;
          }

          // response
          response.type = RESPONSE;
          engine.postMessage(response);
          return;
        }

        case RESPONSE: {
          const c = this._calls.get(data.cid);
          c && c.onresponse(data);
          return;
        }

        case RECEIPT: {
          const c = this._calls.get(data.cid);
          c && c.onreceipt instanceof Function && c.onreceipt();
          return;
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
            const { _calls, options } = this,
              c = {};

            // store call
            data.cid = _calls.store(c);
            // check arguments
            data.args = _calls.toArguments(data.args);
            // to check if target alive
            if (options.timeout) data.receipt = true;

            // post
            engine.postMessage(data);

            // to return result
            c.onresponse = ({ cid, result, error }) => {
              c.onreceipt instanceof Function && c.onreceipt();
              // remove call
              _calls.delete(cid);
              // promise's time
              !error ? resolve(_calls.fromResult(result)) : reject(error);
            };

            if (options.timeout) {
              // to check no target
              const timer = setTimeout(
                () =>
                  // @ts-ignore
                  c.onresponse({
                    error: `Timeout on request ${data.method} in ${data.target}`
                  }),
                options.timeout
              );
              c.onreceipt = () => {
                timer && clearTimeout(timer);
              };
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
