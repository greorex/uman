# Units Manager

_A javascript library to split your code with web workers_

## API Reference

> Don't forget to `await` any `async` result. Otherwise it will be a _Promise_.

How to:

- [use](howtouse.md)
- [bundle](howtobundle.md)

Engine:

- [Unit](#unit)
- [Manager](#units_manager)
- property: [units](#units)

Special:

- [Main](#unit_main)
- [Objects](#unit_object)
- [Emitters](#unit_emitter)
- [Transferables](#transferable)
- [Adapters](#adapters)

## Engine

<a name="units_manager"></a>

### UnitsManager

Class to create manager.

```typescript
Manager(units?: Object); // see add
```

To register units:

```typescript
add(units: Object like {
  // units:
  // 1) instantiated
  name: new Unit(),
  // 2) will be instantiated on demand in the main thread
  name: () => new Unit(),
  // 3) will be imported on demand
  name: () => import('pathto/unit.js'),
  // 4) will be run on demand as web worker
  name: () => new Worker(url: string, options: any),
  // 5) will be run on demand as shared worker
  name: () => new SharedWorker(url: string, options: any),
  // 6) as registered service worker
  name: () => window.navigator.serviceWorker
})
```

By default units are lazy if they are not instantiated. The manager loads them on demand automatically.

But you may do that yourself with:

```typescript
async start(name: string)
```

To terminate unit:

```typescript
async terminate(name?: string) // all by default
```

<a name="unit"></a>

### Unit

Factory to create unit.

```typescript
Unit(value: class);
```

Please follow the syntax to have the unit as universal.

Inplace export

```typescript
export default Unit(
  class {
    // your ES6+ class
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

or

```typescript
class MyUnit {
  // your ES6+ class
}

export default Unit(MyUnit);
```

You may define these methods:

```javascript
// to initialize unit
async start() {
  await loading...
}

// to finalize unit
async terminate() {
  await unloading...
}
```

Use [units](#units) property to access other units.

Also you have to read about [Objects](#unit_object), [Transferables](#transferable) and [Adapters](#adapters).

If you'd like to load the unit into the main thread you have to `import` it as ES6+ module and instantiate with `new`.

<a name="units"></a>

### Property "units"

Each class has special property to communicate with other units.

```javascript
units: Object;
```

To call "method" of "other" unit:

```typescript
await this.units.other.method(...args: any);
```

To catch "event" from all units:

```typescript
this.units.on(event: string, callback: (sender: string, ...args: any) => {
  // do things
});
```

To catch "event" from "other" unit:

```typescript
this.units.other.on(event: string, callback: (...args: any) => {
  // do things
});
```

To post events:

```typescript
// "this" will be "sender"

// to all other units
this.units.post(event: string, ...args: any);
// to "other" unit
this.units.other.post(event: string, ...args: any);
```

## Special

<a name="unit_main"></a>

### Main

To create the main unit with built in manager use the following syntax:

```typescript
class Main extends Unit(Manager) {
  // your main unit code
  constructor() {
    super(name?: string) // "main" by default
  }
}
```

Being a [Unit](#unit) it extends [Manager](#units_manager) functionality to orchestrate all other units and helps to write less code.

<a name="unit_object"></a>

### Objects

Due to [structured clone algorithm](https://developer.mozilla.org/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) you are restricted to transfer complex types between workers, such as objects with methods or functions.

But with the _Uman_ you can.

If you'd like to export `any` object which can not be cloned, just do it. The unit becomes an objects's factory, while the object exports own methods. Technically, the object will live in the unit's thread but you may call it's methods from other threads.

<a name="unit_emitter"></a>

### Emitters

if you'd like to fire events from the object, extend it's class with _Emitter_ class:

```typescript
class MyObject extends Emitter {
  // your code
}

// fo fire event from the object:
fire(event: string, ...args: any);

// to subscribe on event:
// returns unsubscribe function
on(event: string, callback: (...args: any) => {
  // do things
})
```

Usage:

`./units/one.js`

```typescript
class MyObject extends Emitter {
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

// as a factory
export default Unit(
  class {
    MyObject(...args) {
      return new MyObject(...args);
    }
  }
);
```

And somewhere in your unit:

```typescript
const { one, two } = this.units;
// call "one" to create objects
const object1 = one.MyObject(...args);
const object2 = one.MyObject(...args);

// subscribe to catch event
const off = object2.on("event", (...args) => {
  // do things
});

// do things
const result1 = object1.method(...args);
const result2 = object2.method(...args);
// you my pass them as arguments as well
const object3 = two.method(object1, ...args);
// or
const result3 = object3.method({ object2, ...args });

// unsubscribe
off();
```

<a name="transferable"></a>

### Transferables

To send [transferable](https://developer.mozilla.org/docs/Web/API/Transferable) objects from one unit to another just pass them as arguments of methods. You may return such objects as well.

The following classes like [ArrayBuffer](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), [ImageBitmap](https://developer.mozilla.org/docs/Web/API/ImageBitmap) and [OffscreenCanvas](https://developer.mozilla.org/docs/Web/API/OffscreenCanvas) are supported.

> Note, object becomes unusable in the thread it was sent from and becomes available to the thread it was sent to.

Example:

`one.js`

```typescript
const abuf1 = new ArrayBuffer(size1);
const abuf2 = new ArrayBuffer(size2);
// send buffers
const result = await this.units.two.method(abuf1, abuf2);
// do things with result
```

`two.js`

```typescript
async method(buffer1, buffer2) {
  // do things with buffers, reply
  return result;
}
```

<a name="adapters"></a>

## Adapters

Adaptrers are required to control the workers from the main thread.

> Note, they are created automatically with the [manager](#units_manager).

To extend unit's functionality from the main thread side you may use web worker's methods, like `postMessage` and `onmessage` to catch events to exchange raw data with the worker thread.

But with the _Uman_ you don't need to.

Usage:

`index.js`

```typescript
class Adapter {
  progress(persent) {
    // do something
  }
}

main.add({
  unit: {
    // see Manager.add
    loader: () => new SharedWorker("unit.js"),
    adapter: Adapter
  }
});

main.units.unit.dothings();
```

`unit.js`

```typescript
export default Unit(
  class {
    // your ES6+ class
    dothings() {
      this.progress(0);
      // do things...
      this.progress(100);
    }
  }
);
```

## License

Copyright © 2019-2020 G. Schurovski

Licensed under the [Apache-2.0](./../LICENSE) license.
