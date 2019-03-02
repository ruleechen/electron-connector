const electron = require('electron');
const log = require('./logger');
const brand = require('../brand');
const ipcInbound = require('./ipcInbound');
const ipcOutbound = require('./ipcOutbound');

electron.app.on('ready', () => {
  log.info('[injection] start');

  try {
    ipcInbound.init({
      networkPort: brand.networkPort,
    });
  } catch (ex) {
    log.error(`[ipcInbound] init failed: ${ex}`);
  }

  try {
    ipcOutbound.init({
      networkPort: brand.networkPort + 1,
    });
  } catch (ex) {
    log.error(`[ipcOutbound] init failed: ${ex}`);
  }
});
