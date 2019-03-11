const electron = require('electron');
const settings = require('./settings');
const { IpcServer, IpcClient } = require('./ipc');
const initIpc = require('./initIpc');
const brand = require('../brand');

electron.app.on('ready', () => {
  const logger = console;

  const localNetworkPort = (
    settings.appSettings.get('msteamsLocalNetworkPort') ||
    brand.localNetworkPort
  );

  const remoteNetworkPort = (
    settings.appSettings.get('msteamsRemoteNetworkPort') ||
    brand.remoteNetworkPort
  );

  const ipcServer = new IpcServer({
    networkPort: localNetworkPort,
    logger,
  });

  const ipcClient = new IpcClient({
    networkPort: remoteNetworkPort,
    logger,
  });

  try {
    initIpc({
      ipcServer,
      ipcClient,
      logger,
    });
    ipcServer.start();
  } catch (ex) {
    logger.error('[ipc] init failed', ex);
  }
});
