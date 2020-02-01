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
class UnitWorkerEngine extends UnitBase {
  constructor(engine) {
    super();

    // private
    const _handlers = {
      [EVENT]: data => this._onevent(data),

      [REQUEST]: async data => {
        const response = {
          cid: data.cid
        };

        // receipt
        response.type = RECEIPT;
        engine.postMessage(response);

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
      },

      [RESPONSE]: data => this._calls.onresponse(data),

      [RECEIPT]: data => this._calls.onreceipt(data)
    };

    // attach engine (worker or worker self instance)
    // ...args to support transferable objects
    this.postMessage = (...args) => engine.postMessage(...args);
    engine.onmessage = event => {
      const { data } = event;
      // is this our message?
      if (data instanceof Object && data.type in _handlers) {
        return _handlers[data.type](data);
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
            const { _calls } = this,
              c = {};

            // next call id
            data.cid = _calls.next();
            // store call
            _calls.set(data.cid, c);
            // check arguments
            data.args = _calls.toArguments(data.args);

            // post
            engine.postMessage(data);

            // to restore call
            c.onresponse = response => {
              c.onreceipt instanceof Function && c.onreceipt();
              // remove call
              _calls.delete(response.cid);
              // promise's time
              !response.error
                ? resolve(_calls.fromResult(response.result))
                : reject(response.error);
            };

            const { options } = this;

            // just in case no receiver
            if (options.timeout) {
              const timeout = setTimeout(
                () =>
                  c.onresponse({
                    error: `Timeout on request ${data.method} in ${data.target}`
                  }),
                options.timeout
              );
              c.onreceipt = () => {
                timeout && clearTimeout(timeout);
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

/**
 * unit base for worker adapter
 */
export class UnitWorker extends UnitWorkerEngine {
  constructor(worker) {
    super(worker);

    this.terminate = () => worker.terminate();
  }

  _onevent(data) {
    if (data.target) return this._redispatch(data);
    return super._onevent(data);
  }

  _oncall(data) {
    if (data.target) return this._redispatch(data);
    return super._oncall(data);
  }

  init(name) {
    super.init(name);

    // initialize worker self
    this.post("init", name, this.options);
  }
}

/**
 * unit base for worker script file
 */
export class UnitWorkerSelf extends UnitWorkerEngine {
  constructor(engine = self) {
    super(engine);
  }

  oninit(event) {
    const [name, options] = event.args;
    this.init(name);
    this.options = { ...options };
  }
}
