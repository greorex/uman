# Units Manager

_A javascript library to split your code with web workers_

![GitHub Workflow Status](https://img.shields.io/github/workflow/status/greorex/uman/Tests) ![David](https://img.shields.io/david/greorex/uman) ![npm bundle size](https://img.shields.io/bundlephobia/min/uman) [![npm](https://img.shields.io/npm/v/uman)](https://www.npmjs.com/package/uman)

## About

Being a small but robust javascript library, the _Uman_ lets easily split your code by separarted modules - units. Even more, you may define units as web workers to have pure multithreading way of programming. With the _Uman_ you don't have to think about communication between workers.

## Features

- ES6+
- small size
- no dependency
- code splitting support
- units lazy loading on demand
- easy communications between units
- pure multithreading with web workers

## Why?

_Javascript_ is single threaded. The browser freezes UI and other operations if task eats a lot of resources and time to do things. To avoid this you have to code in asynchronous way.

The best choice is _web workers_ to run the code in background threads independently from the main thread. This also gives you pure multithreading approach.

To start code with _web worker_ you type the following:

`main.js`

```javascript
const worker = new Worker("worker.js");
worker.postMessage(message);
worker.onmessage = message => {
  // check if it has data
  // check if it's for you
  // do things
};
```

`worker.js`

```javascript
onmessage(message) {
  // check if it has data
  // check it's for you
  // do things, response
  postMessage(message)
}
```

It looks nice for a task.

But what if you have more than one? What if you need to run tasks in separate workers? How to communicate between them and the main thread? How to avoid code duplication?

With the _Uman_ everything is as simple as if you code in asynchronous way:

`index.js`

```javascript
// set up units
const uman = UnitsManager({
  main: () => import("main.js"),
  // as a worker thread
  one: () => new Worker("one.js"),
  two: () => new Worker("two.js"),
  // ...
  // as a main thread
  ten: () => import("ten.js")
});

uman.units.main.run();
```

`main.js`

```javascript
export default class extends Unit {
  async run() {
    // ask worker "one" to do things
    const result = await this.units.one.task(...args);
    // do things with result
  }
}
```

`one.js`

```javascript
export default Unit.instance(
  class extends Unit {
    async task(...args) {
      // ask other workers to do things
      const result = await Promise.all([
        this.units.two.dothing(...args),
        this.units.ten.dothing(...args)
      ]);
      // do things, response
      return result[0] + result[1];
    }
  }
);
```

`two.js` or `ten.js`

```javascript
export default Unit.instance(
  class extends Unit {
    async dothing(...args) {
      // do things, response
      return await result;
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

Then open browser with http://loclahost:8080.

<a name="getting_started"></a>

## Getting started

Install the _Uman_ with `npm i uman` and use it with _import_.

- [How to use](docs/howtouse.md)
- [API reference](docs/api.md)
- [How to bundle](docs/howtobundle.md)

## TODO

- service worker class support
- node.js support
- communication with server units

## Contacts

Please feel free to contact me if you have any questions.

## License

Copyright © 2019-2020 G. Schurovski

Licensed under the [Apache-2.0](LICENSE) license.
