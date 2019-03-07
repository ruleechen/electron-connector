const { IpcSdk } = require('../');
const brand = require('./brand');

const sdk = new IpcSdk({
  localPort: brand.networkPort + 1,
  remotePort: brand.networkPort,
});

module.exports = sdk;
