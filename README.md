# Units Manager

_A javascript library to split your code with web workers_

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/greorex/uman/Tests) ![David](https://img.shields.io/david/greorex/uman) ![npm bundle size](https://img.shields.io/bundlephobia/min/uman) [![npm](https://img.shields.io/npm/v/uman)](https://www.npmjs.com/package/uman)

## About

Being a small but robust javascript library, the _Uman_ lets easily split your code by separarted modules - units. Even more, you may define units as [web workers](https://developer.mozilla.org/docs/Web/API/Web_Workers_API) to have pure multithreading way of programming. With the _Uman_ you don't have to think about communication between workers.

## Features

- ES6+
- small size
- no dependency
- code splitting support
- units lazy loading on demand
- easy communication between units
- pure multithreading with web workers
- [dedicated](https://developer.mozilla.org/docs/Web/API/Worker), [shared](https://developer.mozilla.org/docs/Web/API/SharedWorker) and [service](https://developer.mozilla.org/docs/Web/API/ServiceWorker) workers support

## Why?

_Javascript_ is single threaded. The browser freezes UI and other operations if task eats a lot of resources and time to do things. To avoid this you have to code in asynchronous way.

The best choice is _web workers_ to run the code in background threads independently from the main thread. This also gives you pure multithreading approach.

To start code with _web worker_ you usually do the following:

`main.js`

```javascript
// ask worker to do things
worker.postMessage(message);
// sometime or never
worker.onmessage = event => {
  // check if it has data
  // check if it's for you
  // do things
};
```

`worker.js`

```javascript
// reply
onmessage = event => {
  // check if it has data
  // check it's for you
  // do things, reply
  postMessage(message);
};
```

It looks nice for a task.

But!

What if you have more than one? What if you need to run tasks in separate workers? How to communicate between them and the main thread? How to pass an object with methods to worker or back? How to avoid code duplication?

With the _Uman_ everything is as simple as if you code in asynchronous way:

`index.js`

```javascript
// ask worker to do things
const result = await unit.dothings(...args);
// do things with result
// or catch an error
```

`worker.js`

```javascript
// reply
unit.dothings = (...args) => {
  // do things, reply
  return result;
};
```

To run tasks in separate workers and communicate between them:

`index.js`

```javascript
const main = new UnitMain();

// set up units
main.add({
  // as a worker thread
  // with lazy loading
  one: () => new Worker("one.js"),
  two: () => new SharedWorker("two.js"),
  // ...
  // main thread unit
  // with lazy loading
  ten: () => import("ten.js"),
  // as a service worker
  // has to be registered
  sw: () => window.navigator.serviceWorker
});

// do
main.units.one.task(...args);
```

`one.js`

```javascript
export default Unit.instance(
  class extends Unit {
    async task(...args) {
      const { units } = this;
      // ask other workers to do things
      const result = await Promise.all([
        units.two.dothings(...args),
        units.ten.dothings(...args)
      ]);
      // ask "sw" to do things, and reply
      return await units.sw.dothings(result);
    }
  }
);
```

`two.js`, `ten.js` or `sw.js`

```javascript
export default Unit.instance(
  class extends Unit {
    async dothings(...args) {
      // do things, reply
      return await something...
    }
  }
);
```

## Examples

There are some [working examples](https://github.com/greorex/uman/tree/master/tests) to test the _Uman_.

Clone repository and:

```
npm install
npm run dev
```

Then open browser with https://loclahost:8080.

<a name="getting_started"></a>

## Getting started

Install the _Uman_ with `npm i uman` and use it with _import_.

- [How to use](docs/howtouse.md)
- [API reference](docs/api.md)
- [How to bundle](docs/howtobundle.md)

## TODO

- node.js worker support
- communication with server units

## Contacts

Please feel free to contact me if you have questions or open an [issue](https://github.com/greorex/uman/issues).

## License

Copyright © 2019-2020 G. Schurovski

Licensed under the [Apache-2.0](LICENSE) license.
