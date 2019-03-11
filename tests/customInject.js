const path = require('path');
const { AsarInjector } = require('../index');

// (required) the target asar
const archive = 'C:/Users/rulee.chen/AppData/Local/Microsoft/Teams/current/resources/app.asar';
// const archive = '/Applications/Microsoft Teams.app/Contents/Resources/app.asar';
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
