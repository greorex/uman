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

/**
 * unit worker communication engine
 */
class UnitWorkerEngine extends UnitBase {
  constructor(engine) {
    super();

    // private
    const _handlers = {
      [MessageType.EVENT]: data => this._onevent(data),

      [MessageType.REQUEST]: async data => {
        const response = {
          cid: data.cid
        };

        // receipt?
        if (data.receipt) {
          response.type = MessageType.RECEIPT;
          engine.postMessage(response);
        }

        // call
        try {
          const { _calls } = this;
          // check arguments
          data.payload = _calls.fromArguments(data.payload);
          // execute and
          const result = await _calls.execute(data, this);
          // check result
          response.result = _calls.toResult(result, data.target);
        } catch (error) {
          response.error = error;
        }

        // response
        response.type = MessageType.RESPONSE;
        engine.postMessage(response);
      },

      [MessageType.RESPONSE]: data => this._calls.onresponse(data),

      [MessageType.RECEIPT]: data => this._calls.onreceipt(data)
    };

    // attach engine (worker or worker self instance)
    // ...args to support transferable objects
    this.postMessage = (...args) => engine.postMessage(...args);
    engine.onmessage = event => {
      const { data } = event;
      // is this our message?
      if (data instanceof Object && data.type in _handlers)
        return _handlers[data.type](data);
      // call standard listener
      // @ts-ignore
      this.onmessage instanceof Function && this.onmessage(event);
    };

    // override dispatcher
    this._dispatch = data => {
      switch (data.type) {
        case MessageType.REQUEST:
          // post and
          return new Promise((resolve, reject) => {
            const { name, options, _calls } = this;
            const c = {};

            // just in case no receiver
            if (options.timeout) {
              const timeout = setTimeout(
                () =>
                  c.onresponse({
                    error: `Timeout on request ${data.method} in ${name}`
                  }),
                options.timeout
              );
              c.onreceipt = () => clearTimeout(timeout);
              data.receipt = true;
            }

            // next call id
            data.cid = _calls.next();

            // to restore call
            c.onresponse = ({ error, result = null }) => {
              c.onreceipt instanceof Function && c.onreceipt();
              // remove call
              _calls.delete(data.cid);
              // promise's time
              !error
                ? resolve(_calls.fromResult(result))
                : reject(new Error(error));
            };

            // store call
            _calls.set(data.cid, c);
            // check arguments
            data.payload = _calls.toArguments(data.payload);
            // and post
            engine.postMessage(data);
          });

        case MessageType.EVENT:
          // just post
          engine.postMessage(data);
      }
    };
  }

  // to self and back
  post(event, ...args) {
    return this._dispatch({
      type: MessageType.EVENT,
      method: event,
      payload: args
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
}

/**
 * unit base for worker script file
 */
export class UnitWorkerSelf extends UnitWorkerEngine {
  constructor(engine = self) {
    super(engine);
  }
}
