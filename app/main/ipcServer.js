const os = require('os');
const electron = require("electron");
const IpcEmitter = require('./ipc');

const _ec_sendBack = `
function _ec_sendBack({
  channel = 'perf',
  payload = {},
  resolve: resolveFn = res => res,
  timeout = 5 * 1000,
}) {
  const ipcRenderer = window.electronSafeIpc;
  return new Promise((resolve, reject) => {
    let timeoutId;
    const callbackId = Math.random().toString().substr(2);
    ipcRenderer.once(callbackId, (event, {
      error,
      success,
      ...options
    }) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (error || success === false) {
        reject(error);
        return;
      }
      resolve(
        resolveFn({
          ...options,
        })
      );
    });
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        ipcRenderer.emit(callbackId, null, {
          error: '[' + payload.action + '] timeout ' + timeout + 'ms',
          success: false,
        });
      }, timeout);
    }
    ipcRenderer.send(channel, {
      ...payload,
      callbackId,
    });
  });
};
`;

function init({
  networkPort,
}) {
  const ipc = new IpcEmitter({
    networkPort,
  });

  ipc.on('getWindows', ({
    callback,
  }) => {
    const windowIds = [];
    electron.BrowserWindow.getAllWindows().forEach((win) => {
      if (win && !win.isDestroyed()) {
        windowIds.push(win.id);
      }
    });
    callback({
      windowIds,
    });
  });

  function findWindow(callback, windowId) {
    const win = electron.BrowserWindow.fromId(windowId);
    if (!win) {
      callback(new Error(`Can not find window '${windowId}'`));
      return;
    }
    if (win.isDestroyed()) {
      callback(new Error(`Window '${windowId}' is destroyed`));
      return;
    }
    return win;
  }

  ipc.on('inspect', ({
    callback,
    payload: {
      windowId,
      mode = 'detach',
    },
  }) => {
    const win = findWindow(callback, windowId);
    if (win) {
      win.webContents.openDevTools({
        mode,
      });
      callback({
        windowId,
        devTools: mode,
      });
    }
  });

  ipc.on('executeJavaScript', ({
    callback,
    payload: {
      windowId,
      scriptContent,
    },
  }) => {
    const win = findWindow(callback, windowId);
    if (win) {
      const scripts = [
        _ec_sendBack,
        scriptContent,
      ];
      win.webContents.executeJavaScript(scripts.join(os.EOL)).then(() => {
        callback({
          windowId,
          executed: true,
        });
      });
    }
  });

  ipc.on('insertCSS', ({
    callback,
    payload: {
      windowId,
      cssContent,
    },
  }) => {
    const win = findWindow(callback, windowId);
    if (win) {
      win.webContents.insertCSS(cssContent).then(() => {
        callback({
          windowId,
          inserted: true,
        });
      });
    }
  });

  ipc.start();
}

module.exports = {
  init,
};
