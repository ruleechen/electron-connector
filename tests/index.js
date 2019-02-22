const path = require('path');
const { AsarInjector } = require('../');

const archive = 'C:/Users/rulee.chen/AppData/Local/Microsoft/Teams/current/resources/app.asar';
const buildDir = path.resolve(__dirname, '../build/asar');

const injector = new AsarInjector({
  archive,
  buildDir,
});

injector
  .inject()
  .then(() => {
    console.log('Injected');
  }).catch((err) => {
    console.error(err);
  });
