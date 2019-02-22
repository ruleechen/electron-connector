const path = require('path');
const { AsarInjector } = require('../');

const archive = 'C:/Users/rulee.chen/AppData/Local/Microsoft/Teams/current/resources/app.asar';
const buildDir = path.resolve(__dirname, '../build');
const injectionSrc = path.resolve(__dirname, './injection');

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
