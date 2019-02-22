# electron-connector

A nodejs tool for injecting your electron logic into 3rd-party electron application.

## Install
```bash
$ yarn add electron-connector
```

## Programing
```js
const path = require('path');
const { AsarInjector } = require('electron-connector');

const archive = 'C:/Program Files/xxx/resources/app.asar';
const buildDir = path.resolve(__dirname, '../build/asar');

const injector = new AsarInjector({
  archive,
  buildDir, // your temp folder for building
  injectionDir: '...', // your codebase folder for injecting
});

injector
  .inject()
  .then(() => {
    console.log('Injected');
  }).catch((err) => {
    console.error(err);
  });
```
