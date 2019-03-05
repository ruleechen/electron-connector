const os = require('os');
const electron = require("electron");
const IpcEmitter = require('./ipc');

const _ec_sendBack = `
function _ec_sendBack({
  channel = 'perf',
  payload = {},
  resolve: resolveFn = res => res,
  timeout = 10 * 1000,
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

function _ec_query_tpl(queryId) {
  return `
    (function() {
      const query = _ec_query();
      Promise.resolve(query).then((data) => (
        _ec_sendBack({
          payload: {
            ...data,
            action: '_ec_query',
            queryId: '${queryId}',
          },
        })
      )).then((res) => {
        console.log(res);
      }).catch((err) => {
        console.error(err);
      });
    })();
  `;
}

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

  const queryContexts = {};

  electron.ipcMain.on('perf', (event, {
    action,
    queryId,
    callbackId,
    ...payload
  }) => {
    if (
      action === '_ec_query'
      && queryId && callbackId
    ) {
      const query = queryContexts[queryId];
      if (query) {
        delete queryContexts[queryId];
        clearTimeout(query.timeoutId);
        query.callback(payload);
      }
      event.sender.send(callbackId, {
        success: true,
      });
    }
  });

  ipc.on('scriptQuery', ({
    callback,
    payload: {
      windowId,
      scriptContent,
    },
  }) => {
    const win = findWindow(callback, windowId);
    if (win) {
      // timeout
      const queryId = Math.random().toString().substr(2);
      const timeoutId = setTimeout(() => {
        delete queryContexts[queryId];
        callback(new Error('timeout'));
      }, 10 * 1024);
      // context cache
      queryContexts[queryId] = {
        callback,
        timeoutId,
      };
      // execute script
      const scripts = [
        _ec_sendBack,
        scriptContent,
        _ec_query_tpl(queryId),
      ];
      win.webContents.executeJavaScript(scripts.join(os.EOL));
    }
  });

  ipc.start();
}

module.exports = {
  init,
};
