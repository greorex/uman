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

/**
 * message types enum
 */
export const MessageType = {
  EVENT: 1,
  REQUEST: 2,
  RESPONSE: 3,
  RECEIPT: 4,
  START: 126,
  TERMINATE: 127
};

/**
 * target types enum
 */
export const TargetType = {
  ALL: 0xff,
  THIS: 0
};

/**
 * refernce types enum
 */
export const ReferenceType = {
  OBJECT: 1,
  FUNCTION: 2,
  UNIT: 3,
  TRANSFER: 4
};
