const electron = require('electron');
const IpcEmitter = require('./ipc');

function init({
  networkPort,
}) {
  const ipc = new IpcEmitter({
    networkPort,
  });

  setInterval(() => {
    ipc.send({
      action: 'heartbeat',
      timestamp: Date.now(),
    }).catch((error) => {
      console.error(error);
    });
  }, 5 * 1024);

  electron.ipcMain.on('perf', (event, {
    callbackId,
    ...payload
  }) => {
    if (callbackId) {
      ipc.send({
        ...payload,
      }).then((res) => {
        event.sender.send(callbackId, res || {
          success: true,
        });
      }).catch((err) => {
        let error = err;
        if (err instanceof Error) {
          error = err.toString();
        }
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
