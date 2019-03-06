const electron = require('electron');
const brand = require('../brand');
const ipcServer = require('./ipcServer');
const ipcClient = require('./ipcClient');

electron.app.on('ready', () => {
  try {
    ipcServer.init({
      networkPort: brand.localNetworkPort,
    });
  } catch (ex) {
    console.error(`[ipcServer] init failed: ${ex}`);
  }

  try {
    ipcClient.init({
      networkPort: brand.remoteNetworkPort,
    });
  } catch (ex) {
    console.error(`[ipcClient] init failed: ${ex}`);
  }
});
