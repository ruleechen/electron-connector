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

const archive = 'C:/Users/xxxx/AppData/Local/Microsoft/Teams/current/resources/app.asar'; // (required) the target asar
const injectionSrc = path.resolve(__dirname, './injection'); // (required) your codebase (file or folder) for injecting
const buildDir = path.resolve(__dirname, '../build'); // (optional) your temp folder for building

const injector = new AsarInjector({
  archive,
  buildDir,
});

injector
  .inject(injectionSrc)
  .then(() => {
    console.log('Injected');
  }).catch((err) => {
    console.error(err);
  });

```
