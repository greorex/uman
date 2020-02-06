# Units Manager

_A javascript library to split your code with web workers_

## API Reference

> Don't forget to `await` any `async` result. Otherwise it will be a _Promise_.

How to:

- [use](howtouse.md)
- [bundle](howtobundle.md)

Engine:

- [Unit](#unit)
- [UnitMain](#unit_main)
- [UnitsManager](#units_manager)
- property: [units](#units)

Special:

- [UnitObject](#unit_object)

[Adapters](#adapters):

- [UnitWorker](#unit_worker)
- [UnitSharedWorker](#unit_shared_worker)
- [UnitServiceWorker](#unit_service_worker)

## Engine

<a name="units_manager"></a>

### UnitsManager

Class to create manager.

```typescript
UnitsManager(units?: Object); // see add

// to add other units
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
// to load unit
async start(name: string)

// or terminate it
async terminate(name?: string) // all by default
```

<a name="unit"></a>

### Unit

Class to create unit.

```javascript
Unit();
```

Please follow the syntax to have the unit as universal.

Inplace export

```typescript
export default Unit.instance(
  class extends Unit {
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
class MyUnit extends Unit {
  // your ES6+ code
}

export default Unit.instance(MyUnit);
```

You may override these methods:

```javascript
async start() {
  // to initialize unit
  await loading...
}

async terminate() {
  // to finalize unit
  await unloading...
}
```

Use [units](#units) property to access other units.

Also you have to read about [UnitObject](#unit_object)s.

The base class for the script part will depend on how the unit is [instantiated](#units_manager):

- [UnitWorkerSelf](#unit_worker) - as dedicated worker with _Worker_
- [UnitSharedWorkerSelf](#unit_shared_worker) - as shared worker with _SharedWorker_
- [UnitServiceWorkerSelf](#unit_service_worker) - as service worker with _ServiceWorker_

If you'd like to load the unit into the main thread you have to `import` it as ES6+ module and instantiate with `new`.

<a name="unit_main"></a>

### UnitMain

Class to create the main unit with built in manager. Being a [Unit](#unit) it extends [UnitsManager](#units_manager) to orchestrate all other units and helps to write less code.

```typescript
UnitMain(name?: string); // "main" by default
```

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

> Note, there might be timeout error in case no answer.

To catch "event" from all units:

```typescript
this.units.on(event: string, (sender: string, ...args: any) => {
  // do things
});
```

To catch "event" from "other" unit:

```typescript
this.units.other.on(event: string, (...args: any) => {
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

<a name="unit_object"></a>

### UnitObject

If you'd like to export object from the unit, you have to extend it's class from _UnitObject_. In that case the unit may be as a class factory, while the object will be as an interface to access it's methods.

> Note, there is no [units](#units) property in _UnitObject_.

The object is event emitter and you may subscribe on events fired by it:

```typescript
// to subscribe on event
// returns unsubscribe function
on(event: string, callback: (...args: any) => {
  // do things
})

// emits event to subscribers
fire(event: string, ...args: any);
```

Technically, the object will live in the unit's thread but you may call it's methods from other threads.

For example:

`./units/one.js`

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

And somewhere in your unit:

```typescript
// call "one" to create objects
const object1 = this.units.one.MyObject(...args);
const object2 = this.units.one.MyObject(...args);

// subscribe to catch event
const off = object2.on("event", (...args) => {
  // do things
});

// do things
const result1 = object1.method(...args);
const result2 = object2.method(...args);
// you my pass them as arguments as well
const object3 = this.units.two.method(object1, ...args);
// or
const result3 = object3.method({ object2, ...args });

// unsubscribe
off();
```

<a name="adapters"></a>

## Adapters

Adaptrers are required to control the workers from the main thread.

> Note, they are created automatically with the [manager](#units_manager).

To extend unit's functionality from the main thread side you may use web worker's methods, like `postMessage` and `onmessage` to catch events to exchange raw data with the worker thread.

But with the _Uman_ you don't need to.

For example, if you know "unit" will be always as _shared worker_:

`index.js`

```typescript
main.add({
  unit: () =>
    new (class extends UnitSharedWorker {
      // your ES6+ class
      constuctor() {
        super(new SharedWorker("unit.js"));
      }
      progress(persent) {
        // do something
      }
    })()
});

main.units.unit.dothings();
```

`unit.js`

```typescript
new (class extends UnitSharedWorkerSelf {
  // your ES6+ class
  dothings() {
    this.progress(0);
    // do things...
    this.progress(100);
  }
})();
```

<a name="unit_worker"></a>

### UnitWorker

[Adapter](#adapters) to create worker part of web worker unit.

```typescript
UnitWorker(worker: Worker);
```

It's created automatically in case you initialize the unit with [Worker](https://developer.mozilla.org/docs/Web/API/Worker).

The base class for the script part will be _UnitWorkerSelf_.

<a name="unit_shared_worker"></a>

### UnitSharedWorker

[Adapter](#adapters) to create shared worker part of shared worker unit.

```typescript
UnitSharedWorker(worker: SharedWorker);
```

It's created automatically in case you initialize the unit with [SharedWorker](https://developer.mozilla.org/docs/Web/API/SharedWorker).

The base class for the script part will be _UnitSharedWorkerSelf_.

<a name="unit_service_worker"></a>

### UnitServiceWorker

[Adapter](#adapters) to create service worker part of service worker unit.

> Note, the service worker has to be registered.

> Don't forget to use trusted SSL certificate.

```typescript
UnitServiceWorker(worker: window.navigator.serviceWorker);
```

It's created automatically in case you initialize the unit with [ServiceWorker](https://developer.mozilla.org/docs/Web/API/ServiceWorker).

The base class for the script part will be _UnitServiceWorkerSelf_.

## License

Copyright © 2019-2020 G. Schurovski

Licensed under the [Apache-2.0](./../LICENSE) license.
