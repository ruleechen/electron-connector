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
          error: 'timeout ' + timeout + 'ms',
          success: false,
        });
      }, timeout);
    }
    ipcRenderer.send(channel, {
      ...payload,
      _callback_id: callbackId,
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
            _action: '_ec_query',
            _query_id: '${queryId}',
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
    const wins = [];
    electron.BrowserWindow.getAllWindows().forEach((win) => {
      if (win && !win.isDestroyed()) {
        wins.push({
          id: win.id,
          title: win.getTitle(),
          bounds: win.getBounds(),
        });
      }
    });
    callback(wins);
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

  ipc.on('evalWindow', ({
    callback,
    payload: {
      windowId,
      func,
      args = [],
    },
  }) => {
    const win = findWindow(callback, windowId);
    if (win) {
      const fn = win[func];
      if (typeof (fn) !== 'function') {
        callback(new Error(`Notfound function '${func}'`));
        return;
      }
      const result = fn.apply(win, args);
      callback({
        windowId,
        func,
        result,
      });
    }
  });

  ipc.on('evalWebContent', ({
    callback,
    payload: {
      windowId,
      func,
      args = [],
    },
  }) => {
    const win = findWindow(callback, windowId);
    if (win) {
      const fn = win.webContents[func];
      if (typeof (fn) !== 'function') {
        callback(new Error(`Notfound function '${func}'`));
        return;
      }
      const result = fn.apply(win.webContents, args);
      callback({
        windowId,
        func,
        result,
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
    _action,
    _query_id,
    _callback_id,
    ...payload
  }) => {
    if (
      _action === '_ec_query'
      && _query_id && _callback_id
    ) {
      const query = queryContexts[_query_id];
      if (query) {
        delete queryContexts[_query_id];
        clearTimeout(query.timeoutId);
        query.callback(payload);
      }
      event.sender.send(_callback_id, {
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
