const electron = require('electron');
const settings = require('./settings');
const { IpcServer, IpcClient } = require('../lib/ipc');
const initIpc = require('./initIpc');
const brand = require('../brand');

electron.app.on('ready', () => {
  const logger = console;

  const localServerPort = (
    settings.appSettings.get('msteamsLocalServerPort') ||
    brand.localServerPort
  );

  const remoteServerPort = (
    settings.appSettings.get('msteamsRemoteServerPort') ||
    brand.remoteServerPort
  );

  const ipcServer = new IpcServer({
    networkPort: localServerPort,
    logger,
  });

  const ipcClient = new IpcClient({
    networkPort: remoteServerPort,
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
