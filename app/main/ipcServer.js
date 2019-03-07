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
    resolve,
  }) => {
    const wins = [];
    electron.BrowserWindow
      .getAllWindows()
      .forEach((win) => {
        if (win && !win.isDestroyed()) {
          wins.push({
            id: win.id,
            title: win.getTitle(),
            bounds: win.getBounds(),
          });
        }
      });
    resolve(wins);
  });

  /* eval ****************************************************/

  function findWindow(reject, windowId) {
    const win = electron.BrowserWindow.fromId(windowId);
    if (!win) {
      reject(new Error(`Can not find window '${windowId}'`));
      return;
    }
    if (win.isDestroyed()) {
      reject(new Error(`Window '${windowId}' is destroyed`));
      return;
    }
    return win;
  }

  ipc.on('evalWindow', ({
    resolve,
    reject,
    payload: {
      windowId,
      func,
      args = [],
    },
  }) => {
    const win = findWindow(reject, windowId);
    if (win) {
      const fn = win[func];
      if (typeof (fn) !== 'function') {
        reject(new Error(`Notfound function '${func}'`));
        return;
      }
      const ret = fn.apply(win, args);
      Promise.resolve(ret)
        .catch(reject)
        .then((result) => {
          resolve({
            windowId,
            func,
            result,
          });
        });
    }
  });

  ipc.on('evalWebContent', ({
    resolve,
    reject,
    payload: {
      windowId,
      func,
      args = [],
    },
  }) => {
    const win = findWindow(reject, windowId);
    if (win) {
      const fn = win.webContents[func];
      if (typeof (fn) !== 'function') {
        reject(new Error(`Notfound function '${func}'`));
        return;
      }
      const ret = fn.apply(win.webContents, args);
      Promise.resolve(ret)
        .catch(reject)
        .then((result) => {
          resolve({
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
        query.resolve(_ec_result);
      }
      event.sender.send(_ec_callback_id, {
        success: true,
      });
    }
  });

  ipc.on('runQuery', ({
    resolve,
    reject,
    payload: {
      windowId,
      queryScript,
    },
  }) => {
    const win = findWindow(resolve, windowId);
    if (win) {
      // timeout
      const queryId = Math.random().toString().substr(2);
      const timeoutId = setTimeout(() => {
        delete queryContexts[queryId];
        reject(new Error('timeout'));
      }, 10 * 1024);
      // context cache
      queryContexts[queryId] = {
        resolve,
        reject,
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
