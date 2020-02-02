# Units Manager

_A javascript library to split your code with web workers_

## API Reference

Classes:

- [Unit](#unit)
- [UnitMain](#unit_main)
- [UnitWorker](#unit_worker)
- [UnitsManager](#units_manager)
- property: [units](#units)

Special:

- [UnitObject](#unit_object)

<a name="units_manager"></a>

### UnitsManager

Class to create manager.

```typescript
UnitsManager(units: Object like {
  // 1) created unit
  name: new Unit(),
  // 2) unit will be created on demand
  name: () => new Unit(),
  // 3) unit will be run on demand as web worker
  name: () => new Worker(url: string, options: any);
  // 4) unit will be imported on demand
  name: () => import('pathto/unit.js');
});

// to add other units
add(units: see constructor)

// to terminate unit
terminate(name?: string) // all by default
```

<a name="unit"></a>

### Unit

Class to create unit.

```javascript
Unit();
```

Please follow the syntax to have the unit as an universal module:

```typescript
export default Unit.instance(
  class extends Unit {
    // your ES6+ code
    method(...args: any) {
      // do things
      return something;
    }
    // may be asynchronous
    async method(...args: any) {
      // do things
      return await something(...args);
    }
  }
);
```

You may override these methods:

```javascript
async init() {
  // to initialize unit
  await loading ...
}

terminate() {
  // to finalize unit
}
```

The class will be automatically instantiated if it's used as a script part of web worker unit.

But it's possible to use it as ES6+ module, with _import_ and _new_.

<a name="unit_worker"></a>

### UnitWorker

Class to create worker part of web worker unit.

```typescript
UnitWorker(worker: Worker);
```

It's created automatically in case you initialize the unit with _Worker_.

You still may use web worker's methods, like _postMessage_ as well as _onmessage_ to catch events to exchange raw data with the worker thread. But with the _Uman_ you don't need to.

<a name="unit_main"></a>

### UnitMain

Class to create main unit with built in manager. Being a [Unit](#unit) it extends [UnitsManager](#units_manager) to orchestrate all other units and helps to write less code.

```typescript
UnitMain(name?: string); // "main" by default
```

<a name="units"></a>

### Property "units"

Each class has special property:

```javascript
units: Object;
```

Somewhere in your unit:

```typescript
// 1) to call "method" of "other" unit:
await this.units.other.method(...args: any);

// 2) to catch "event" from all units
this.units.on(event: string, (sender: string, ...args: any) => {
  // do things
});

// 3) to catch "event" from "other" unit:
this.units.other.on(event: string, (...args: any) => {
  // do things
});

// 4) to post events:
// to all units, this will be "sender"
this.units.post(event: string, ...args: any);
// to "other" unit
this.units.other.post(event: string, ...args: any);
```

<a name="unit_object"></a>

### UnitObject

If you'd like to export object from the unit, you have to extend it's class from _UnitObject_. In that case the unit may be as a class factory, while the object will be as interface to access it's methods.

> Note, there is no [units](#units) property in _UnitObject_.

The object is event emitter and you may subscribe on events fired by it:

```typescript
on(event: string, callback: (...args: any) => {
  // do things
}) // returns off function

fire(event: string, ...args: any);
```

Technically, the object will live in the unit's thread but you may call it's methods from other threads.

For example:

`./units/unit.js`

```typescript
class MyObject extends UnitObject {
  constructor(...args) {
    super();
    // init with args
  }
  method(...args) {
    // do things
    // fire event
    this.fire("event", ...args);
    return something;
  }
  // can be async
  async method(...args) {
    return await something(...args);
  }
}

export default Unit.instance(
  class extends Unit {
    MyObject(...args) {
      return new MyObject(...args);
    }
  }
);
```

Somewhere in your unit:

```typescript
// call "unit" to create objects
const object1 = this.units.unit.MyObject(...args);
const object2 = this.units.unit.MyObject(...args);

// subscribe to catch event
const off = object2.on("event", (...args) => {
  // do things
});

// do things
const result1 = object1.method(...args);
const result2 = object2.method(...args);
// you my pass them as arguments as well
const object3 = this.units.other.method(object1, ...args);
// or
const result3 = object3.method({ object2, ...args });

// unsubscribe
off();
```

Don't forget to use async/await if you have to wait the result. Otherwise it would be a _Promise_.

## License

Copyright © 2019-2020 G. Schurovski

Licensed under the [Apache-2.0](./../LICENSE) license.
