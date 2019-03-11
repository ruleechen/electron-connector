const { RemoteSdk } = require('../index');
const brand = require('./brand');

const sdk = new RemoteSdk({
  localNetworkPort: brand.networkPort + 1,
  remoteNetworkPort: brand.networkPort,
});

module.exports = sdk;
