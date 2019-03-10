const os = require('os');
const electron = require("electron");
const scriptTpls = require('./scriptTpls');

function init({
  ipcClient,
  ipcServer,
}) {
  ipcServer.on('getWindows', ({
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
            webContentsId: (win.webContents && win.webContents.id),
            webContentsTitle: (win.webContents && win.webContents.getTitle()),
          });
        }
      });
    resolve(wins);
  });

  /* eval ****************************************************/

  function getRemoteEventsHandler(host, eventName, contexts) {
    const eventHandlers = host._ec_event_handlers || {};
    host._ec_event_handlers = eventHandlers;
    let handler = eventHandlers[eventName];
    if (!handler) {
      handler = eventHandlers[eventName] = function (ev, ...args) {
        ipcClient.send({
          action: '_ec_remote_events',
          eventName,
          eventArgs: args,
          ...contexts,
        }).catch((error) => {
          console.error(error);
        });
      };
    }
    return handler;
  }

  function evalHostFunc(resolve, reject, host, func, args, contexts) {
    if (!(func in host)) {
      reject(new Error(`Notfound '${func}'`));
      return;
    }
    const isNewEvent = (
      func === 'on' ||
      func === 'addListener'
    );
    const isRemoveEvent = (
      func === 'off' ||
      func === 'removeListener'
    );
    let applyArgs = args;
    if (isNewEvent || isRemoveEvent) {
      const eventName = args[0];
      const handler = getRemoteEventsHandler(host, eventName, contexts);
      // prevent duplicated event handler
      if (isNewEvent) {
        const listeners = host.listeners(eventName);
        if (listeners.indexOf(handler) !== -1) {
          host.removeListener(eventName, handler);
        }
      }
      applyArgs = [eventName, handler];
    }
    let ret = host[func];
    if (typeof (ret) === 'function') {
      ret = ret.apply(host, applyArgs);
      // TypeError: Converting circular structure to JSON
      if (ret === host) {
        ret = null;
      }
    }
    Promise.resolve(ret)
      .catch(reject)
      .then((result) => {
        resolve({
          func,
          result,
          ...contexts,
        });
      });
  }

  ipcServer.on('evalWindow', ({
    resolve,
    reject,
    payload: {
      windowId,
      func,
      args = [],
    },
  }) => {
    const window = electron.BrowserWindow.fromId(windowId);
    if (!window) {
      reject(new Error(`Can not find window '${windowId}'`));
      return;
    }
    if (window.isDestroyed()) {
      reject(new Error(`Window '${windowId}' is destroyed`));
      return;
    }
    if (window) {
      evalHostFunc(resolve, reject, window, func, args, { windowId });
    }
  });

  ipcServer.on('evalWebContents', ({
    resolve,
    reject,
    payload: {
      webContentsId,
      func,
      args = [],
    },
  }) => {
    const contents = electron.webContents.fromId(webContentsId);
    if (!contents) {
      reject(new Error(`Can not find webContents '${webContentsId}'`));
      return;
    }
    if (contents.isDestroyed()) {
      reject(new Error(`webContents '${webContentsId}' is destroyed`));
      return;
    }
    if (contents) {
      evalHostFunc(resolve, reject, contents, func, args, { webContentsId });
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

  ipcServer.on('runQuery', ({
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

  ipcServer.start();
}

module.exports = init;
