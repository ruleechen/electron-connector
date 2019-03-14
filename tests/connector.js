const { RemoteSDK } = require('../index');
const brand = require('./brand');

const connector = RemoteSDK.connect({
  localNetworkPort: brand.networkPort + 1,
  remoteNetworkPort: brand.networkPort,
});

module.exports = connector;
