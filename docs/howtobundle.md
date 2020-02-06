# Units Manager

_A javascript library to split your code with web workers_

## How to bundle

Use bundler with code-splitting support.

> Note, the library is not transpiled, so do not ignore it while transpiling your bundles and chunks.

With [webpack](https://webpack.js.org/), for example, you may use:

- [worker-loader](https://www.npmjs.com/package/worker-loader) to bundle worker scripts,
- [sharedworker-loader](https://www.npmjs.com/package/sharedworker-loader) to bundle shared worker scripts,
- [service-worker-loader](https://www.npmjs.com/package/service-worker-loader) to bundle service worker scripts.

Inline syntax is supported:

```javascript
import registerServiceWorker from "service-worker-loader!./units/sw";

const main = UnitMain();

main.add({
  // web worker thread
  // as function
  // will be loaded and resolved on demand
  one: () => import("worker-loader!./units/one.js"),
  // other web worker thread
  // as promise
  // will be resolved on demand
  two: import("worker-loader!./units/two"),
  // other shared worker thread
  six: () => import("sharedworker-loader!./units/six"),
  // or as promise
  ten: import("sharedworker-loader!./units/ten"),
  // as service worker
  sw: async () => {
    const reg = await registerServiceWorker({ scope: "/" });
    // do something...
    if (reg.active) return window.navigator.serviceWorker;
  }
});
```

## License

Copyright © 2019-2020 G. Schurovski

Licensed under the [Apache-2.0](./../LICENSE) license.
