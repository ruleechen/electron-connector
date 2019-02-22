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

// (required) the target asar
const archive = 'C:/Users/xxxx/AppData/Local/Microsoft/Teams/current/resources/app.asar';
// (required) your codebase (file or folder) for injecting
const injectionSrc = path.resolve(__dirname, './injection');
// (optional) your temp folder for building
const buildDir = path.resolve(__dirname, '../build');

const injector = new AsarInjector({
  archive,
  buildDir,
});

injector
  .inject(injectionSrc)
  .then((res) => {
    console.log(res);
  }).catch((err) => {
    console.error(err);
  });
```
