const electron = require('electron');
const IpcEmitter = require('./ipc');

function init({
  networkPort,
}) {
  const ipc = new IpcEmitter({
    networkPort,
  });

  // heartbeat
  setInterval(() => {
    ipc.sendCommand({
      action: 'heartbeat',
      ecnow: Date.now(),
    }).catch((error) => {
      console.error(error);
    });
  }, 1024);

  electron.ipcMain.on('perf', (event, {
    callbackId,
    ...payload
  }) => {
    if (callbackId) {
      ipc.sendCommand({
        ...payload,
      }).then((res) => {
        event.sender.send(callbackId, res);
      }).catch((error) => {
        event.sender.send(callbackId, {
          success: false,
          error,
        });
      });
    }
  });
}

module.exports = {
  init,
};
