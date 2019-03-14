const RemoteWindow = require('./RemoteWindow');
const RemoteWebContents = require('./RemoteWebContents');
const RemoteConnector = require('./RemoteConnector');

let _logger = console;
let _remoteWindowImpl = RemoteWindow;
let _remoteWebContentsImpl = RemoteWebContents;

class RemoteSDK {
  static logger(impl) {
    if (impl) {
      _logger = impl;
    }
    return _logger;
  }

  static remoteWindowImpl(impl) {
    if (impl) {
      _remoteWindowImpl = impl;
    }
    return _remoteWindowImpl;
  }

  static remoteWebContentsImpl(impl) {
    if (impl) {
      _remoteWebContentsImpl = impl;
    }
    return _remoteWebContentsImpl;
  }

  static connect({
    localNetworkPort,
    remoteNetworkPort,
    silent = true,
  }) {
    return new RemoteConnector({
      localNetworkPort,
      remoteNetworkPort,
      silent,
      logger: RemoteSDK.logger(),
      remoteWindowImpl: RemoteSDK.remoteWindowImpl(),
      remoteWebContentsImpl: RemoteSDK.remoteWebContentsImpl(),
    });
  }
}

module.exports = RemoteSDK;
