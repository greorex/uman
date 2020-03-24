# Units Manager

_A javascript library to split your code with web workers_

## How to bundle

Use bundler with code-splitting support.

> Note, the library is not transpiled, so do not ignore it while transpiling your bundles.

With [webpack](https://webpack.js.org/), for example, you may use:

- [worker-loader](https://www.npmjs.com/package/worker-loader) to bundle worker scripts,
- [sharedworker-loader](https://www.npmjs.com/package/sharedworker-loader) to bundle shared worker scripts,
- [service-worker-loader](https://www.npmjs.com/package/service-worker-loader) to bundle service worker scripts.

Inline syntax is supported:

```javascript
const main = new Unit(Manager)();

main.add({
  // web worker thread
  // as function
  // will be loaded and resolved on demand
  one: () => import("worker-loader!./units/one.js"),
  // or as promise
  // will be resolved and loaded on demand
  one: import("worker-loader!./units/two"),

  // shared worker thread
  two: () => import("sharedworker-loader!./units/six"),
  // or as promise
  two: import("sharedworker-loader!./units/ten"),

  // service worker
  // will be activated for you
  ten: () => import("service-worker-loader!./units/ten"),
  // or as promise
  ten: import("service-worker-loader!./units/ten")
});
```

## License

Copyright © 2019-2020 G. Schurovski

Licensed under the [Apache-2.0](./../LICENSE) license.
