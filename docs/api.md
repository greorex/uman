# Units Manager

## API Reference

Classes:

- [UnitsManager](#units_manager)
- [Unit](#unit)
- [UnitWorker](#unit_worker)
- property: [units](#units)

Special:

- [UnitObject](#unit_object)

<a name="units_manager"></a>

### UnitsManager

Class to create manager.

```javascript
UnitsManager(units: Object like {
  // 1) created unit
  name: new Unit(),
  // 2) unit will be created on demand
  name: () => new Unit(),
  // 3) unit will be run on demand as web worker
  name: () => new Worker(url, options);
  // 4) unit will be imported on demand
  name: () => import('pathto/unit.js');
})

addUnits(units: see constructor) : UnitsManager

deleteUnit(name: string)

deleteAllUnits()
```

<a name="unit"></a>

### Unit

Class to create unit.

```javascript
Unit();
```

Please follow the syntax to have the unit as an universal module:

```javascript
export default Unit.instance(
  class extends Unit {
    // your ES6+ code
    method(...args) {
      // do things
      return something;
    }
    // may be async
    async method(...args) {
      // do things
      return await something(...args);
    }
  }
);
```

The class will be atomatically instantiated if it's used as a script part of web worker unit.

But it's possible to use it as ES6+ module, with _import_ and _new_.

<a name="unit_worker"></a>

### UnitWorker

Class to create worker part of web worker unit.

```typescript
UnitWorker(worker: Worker);
```

It's created automatically in case you initialize the unit with _Worker_.

You may use web worker's methods, like _postMessage_ to exchange raw data with the worker thread, as well as _onmessage_ to catch events.

<a name="units"></a>

### Property "units"

Each class has special property:

```javascript
units: Object;
```

1. to call "method" of "other" unit:

```javascript
async units.other.method(...args);
```

2. to catch "event" from "other" unit:

```javascript
units.other.onevent = payload => {};
```

3. to post events:

```javascript
// to all units
units.post("event", payload);
// to "other" unit
units.other.post("event", payload);
```

<a name="unit_object"></a>

### UnitObject

If you'd like to export object from the unit, you have to extend it's class from _UnitObject_. In that case the unit may be as a class factory.

> Note, there is no [units](#units) property in _UnitObject_.

Technically, the object will live in the unit's thread but you may call it's methods from other threads to do things.

`./units/unit.js`

```javascript
class MyObject extends UnitObject {
  constructor(...args) {
    // init with args
  }
  method(...args) {
    // do things
    return something;
  }
  // can be async
  async method(...args) {
    return await something(...args);
  }
}

export default Unit.instance(
  class extends Unit {
    createMyObject(...args) {
      return new MyObject(...args);
    }
  }
);
```

Somethere in the code:

```javascript
// create objects
const object1 = uman.units.unit.createMyObject(...args);
const object2 = uman.units.unit.createMyObject(...args);
// do things
const result1 = object1.method(...args);
const result2 = object2.method(...args);
// you my pass them as arguments as well
const object3 = uman.units.other.method(object1, ...args);
// or
const result3 = object3.method({ object2, ...args });
```

## License

Copyright © 2019-2020 Grigory Schurovski

Licensed under the [Apache-2.0](./../LICENSE) license.
