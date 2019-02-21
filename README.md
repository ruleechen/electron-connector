# electron-connector

A nodejs tool for injecting your electron logic into 3rd-party electron application.

## Install
```bash
$ yarn add electron-connector
```

## Integrate
```js
const { AsarInjector } = require('electron-connector');

const archive = 'C:/Program Files (x86)/xxx/resources/app.asar';

const injector = new AsarInjector({
  archive,
  buildDir: '...', // your temp folder for building
  injectionDir: '...', // your codebase folder for injecting
});

injector.inject();
```
