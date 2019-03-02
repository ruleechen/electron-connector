const os = require('os');
const uuid = require('uuid');
const electron = require("electron");
const IpcEmitter = require('./ipc');

const _ec_sendBack = `
function _ec_sendBack({
  channel = 'perf',
  payload = {},
  resolve: resolveFn = res => res,
  timeout = 15 * 1000,
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
      callbackId,
      ...payload,
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

  ipc.startListener();

  ipc.on('getWindows', (callback) => {
    const windowIds = [];
    electron.BrowserWindow.getAllWindows().forEach((win) => {
      if (!win || win.isDestroyed()) {
        return;
      }
      if (!win._ec_uuid) {
        win._ec_uuid = uuid.v4();
      }
      windowIds.push(win._ec_uuid);
    });
    callback(windowIds);
  });

  function findWindow(callback, windowId) {
    const win = electron.BrowserWindow.getAllWindows().find(x => (
      x._ec_uuid === windowId
    ));
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

  ipc.on('inspect', (callback, { windowId, mode }) => {
    const win = findWindow(callback, windowId);
    if (win) {
      win.webContents.openDevTools({
        mode: mode || 'detach',
      });
      callback({
        windowId,
      });
    }
  });

  ipc.on('executeJavaScript', (callback, { windowId, scriptContent }) => {
    const win = findWindow(callback, windowId);
    if (win) {
      const scripts = [
        _ec_sendBack,
        scriptContent,
      ];
      win.webContents.executeJavaScript(scripts.join(os.EOL)).then(() => {
        callback({
          windowId,
        });
      });
    }
  });

  ipc.on('insertCSS', (callback, { windowId, cssContent }) => {
    const win = findWindow(callback, windowId);
    if (win) {
      win.webContents.insertCSS(cssContent).then(() => {
        callback({
          windowId,
        });
      });
    }
  });
}

module.exports = {
  init,
};
