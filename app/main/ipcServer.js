const os = require('os');
const electron = require("electron");
const IpcEmitter = require('./ipc');
const scriptTpls = require('./scriptTpls');

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

  /* eval ****************************************************/

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
      const ret = fn.apply(win, args);
      Promise.resolve(ret).then((result) => {
        callback({
          windowId,
          func,
          result,
        });
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
      const ret = fn.apply(win.webContents, args);
      Promise.resolve(ret).then((result) => {
        callback({
          windowId,
          func,
          result,
        });
      });
    }
  });

  /* query ****************************************************/

  const queryContexts = {};

  electron.ipcMain.on('perf', (event, {
    _ec_action,
    _ec_query_id,
    _ec_callback_id,
    _ec_result,
  }) => {
    if (
      _ec_action === '_ec_query'
      && _ec_query_id && _ec_callback_id
    ) {
      const query = queryContexts[_ec_query_id];
      if (query) {
        delete queryContexts[_ec_query_id];
        clearTimeout(query.timeoutId);
        query.callback(_ec_result);
      }
      event.sender.send(_ec_callback_id, {
        success: true,
      });
    }
  });

  ipc.on('runQuery', ({
    callback,
    payload: {
      windowId,
      queryScript,
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
        scriptTpls.tpl_sendback(),
        scriptTpls.tpl_query(queryId, queryScript),
      ];
      win.webContents.executeJavaScript(scripts.join(os.EOL));
    }
  });

  ipc.start();
}

module.exports = {
  init,
};
