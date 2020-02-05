# Units Manager

_A javascript library to split your code with web workers_

## How to bundle

Use bundler with code-splitting support.

> Note, the library is not transpiled, so do not ignore it while transpiling your bundles and chunks.

With _webpack_, for example, you may use:

- _worker-loader_ plugin to bundle worker scripts,
- _sharedworker-loader_ plugin to bundle shared worker scripts.

Inline syntax is supported:

```javascript
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
  ten: import("sharedworker-loader!./units/ten")
});
```

## License

Copyright © 2019-2020 G. Schurovski

Licensed under the [Apache-2.0](./../LICENSE) license.
