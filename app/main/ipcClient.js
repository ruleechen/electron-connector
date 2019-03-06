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
    _ec_query_id,
    _ec_callback_id,
    ...payload
  }) => {
    if (_ec_callback_id && !_ec_query_id) {
      ipc.send({
        ...payload,
      }).then((res) => {
        event.sender.send(_ec_callback_id, res || {
          success: true,
        });
      }).catch((err) => {
        let error = err;
        if (err instanceof Error) {
          error = err.toString();
        }
        event.sender.send(_ec_callback_id, {
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
