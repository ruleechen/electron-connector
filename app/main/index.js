const electron = require('electron');
const brand = require('../brand');
const ipcServer = require('./ipcServer');
const ipcClient = require('./ipcClient');

electron.app.on('ready', () => {
  try {
    ipcServer.init({
      networkPort: brand.networkPort,
    });
  } catch (ex) {
    console.error(`[ipcServer] init failed: ${ex}`);
  }

  try {
    ipcClient.init({
      networkPort: brand.networkPort + 1,
    });
  } catch (ex) {
    console.error(`[ipcClient] init failed: ${ex}`);
  }
});
