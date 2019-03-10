const electron = require('electron');
const brand = require('../brand');
const IpcEmitter = require('./ipc');
const initIpcServer = require('./ipcServer');
const initIpcClient = require('./ipcClient');

electron.app.on('ready', () => {
  const ipcClient = new IpcEmitter({
    networkPort: brand.remoteNetworkPort,
  });

  const ipcServer = new IpcEmitter({
    networkPort: brand.localNetworkPort,
  });

  try {
    initIpcServer({
      ipcClient,
      ipcServer,
    });
  } catch (ex) {
    console.error(`[ipcServer] init failed: ${ex}`);
  }

  try {
    initIpcClient({
      ipcClient,
      ipcServer,
    });
  } catch (ex) {
    console.error(`[ipcClient] init failed: ${ex}`);
  }
});
