/**
 * uman
 * Units Manager javascript library to orchestrate web workers
 *
 * Copyright (c) 2019 Grigory Schurovski (https://github.com/greorex)
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// TODO - add easy method call (100%)
// TODO - add lazy loading (100%)
// TODO - add Unit auto class trigger (100%)
// TODO - split by files (100%)
// TODO - add transferable objects (100%)
// TODO - add service worker support (100%)
// TODO - add timeout for request (80%, if long calls failed?)
// TODO - add args and return proxies (80%, cleanup?)
// TODO - add units dependency (0%)
// TODO - add node.js support (0%)
// TODO - add communication with server units (0%)

// @ts-check

/**
 * exports
 */

//@ts-ignore
export { version, name } from "./../package.json";

// basic level
export { default as Unit } from "./unit";
export { default as Manager } from "./manager";

// expert level
export { default as options } from "./options";
export { MessageType, TargetType } from "./enums";
export { PackagerMethod } from "./packager";
export { default as Emitter } from "./emitter";
export { default as CriticalSection } from "./critical";
export { default as Throttler } from "./throttler";

// array buffer
export { default as LittleEndian } from "./buffer/endian";
export { str2ab } from "./buffer/utf8/str2ab";
export { ab2str } from "./buffer/utf8/ab2str";
export { BufferWriter, json2ab } from "./buffer/writer";
export { BufferReader, ab2json } from "./buffer/reader";
