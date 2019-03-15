const { AsarInjector, Connector } = require('../index');
const path = require('path');
const brand = require('./brand');

// (required) the target asar
const archive = 'C:/Users/rulee.chen/AppData/Local/Microsoft/Teams/current/resources/app.asar';
// const archive = '/Applications/Microsoft Teams.app/Contents/Resources/app.asar';
// (optional) your temp folder for building
const buildDir = path.resolve(__dirname, '../build');

const injector = new AsarInjector({
  archive,
  buildDir,
});

const connector = new Connector({
  applicationId: brand.brandAppId,
  localServerPort: brand.networkPort,
  remoteServerPort: brand.networkPort + 1,
});

injector
  .injectConnector(connector)
  .then((res) => {
    console.log(res);
  }).catch((err) => {
    console.error(err);
  });
