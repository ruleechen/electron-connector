const { RemoteSDK } = require('../index');
const brand = require('./brand');

const connector = RemoteSDK.connect({
  localServerPort: brand.networkPort + 1,
  remoteServerPort: brand.networkPort,
});

module.exports = connector;
