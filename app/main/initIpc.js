const os = require('os');
const electron = require('electron');
const scriptTpls = require('./scriptTpls');
const ipcChannels = require('./ipcChannels');

function initIpc({
  ipcServer,
  ipcClient,
  logger,
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
            windowId: win.id,
            windowTitle: win.getTitle(),
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
          logger.error(error);
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
    let applyArgs = args;
    if (func === 'executeJavaScript') {
      const scriptContent = args[0];
      // workaround issue: https://github.com/electron/electron/issues/9102
      applyArgs = [scriptTpls.tpl_executeJavaScript(scriptContent)];
    } else {
      const isNewEvent = (
        func === 'on' ||
        func === 'addListener'
      );
      const isRemoveEvent = (
        func === 'off' ||
        func === 'removeListener'
      );
      if (isNewEvent || isRemoveEvent) {
        const eventName = args[0];
        const handler = getRemoteEventsHandler(host, eventName, contexts);
        applyArgs = [eventName, handler];
        // prevent duplicated event handler
        if (isNewEvent) {
          const listeners = host.listeners(eventName);
          if (listeners.indexOf(handler) !== -1) {
            host.removeListener(eventName, handler);
          }
        }
      }
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

  function findWindow(windowId, reject) {
    const window = electron.BrowserWindow.fromId(windowId);
    if (!window) {
      reject(new Error(`Can not find window '${windowId}'`));
      return;
    }
    if (window.isDestroyed()) {
      reject(new Error(`Window '${windowId}' is destroyed`));
      return;
    }
    return window;
  }

  function findWebContents(webContentsId, reject) {
    const contents = electron.webContents.fromId(webContentsId);
    if (!contents) {
      reject(new Error(`Can not find webContents '${webContentsId}'`));
      return;
    }
    if (contents.isDestroyed()) {
      reject(new Error(`webContents '${webContentsId}' is destroyed`));
      return;
    }
    return contents;
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
    const window = findWindow(windowId, reject);
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
    const contents = findWebContents(webContentsId, reject);
    if (contents) {
      evalHostFunc(resolve, reject, contents, func, args, { webContentsId });
    }
  });

  /* query ****************************************************/

  const queryContexts = {};
  const ipcEventHandler = (event, {
    _ec_action,
    _ec_query_id,
    _ec_query_result,
    _ec_test_channel,
    _ec_callback_id,
    ...payload
  }) => {
    // ec test
    if (
      _ec_action === '_ec_test_channel' &&
      _ec_test_channel &&
      _ec_callback_id
    ) {
      event.sender.send(_ec_callback_id, {
        success: true,
        channel: _ec_test_channel,
      });
    }
    // ec query
    else if (
      _ec_action === '_ec_query' &&
      _ec_query_id &&
      _ec_callback_id
    ) {
      const query = queryContexts[_ec_query_id];
      if (query) {
        delete queryContexts[_ec_query_id];
        clearTimeout(query.timeoutId);
        query.resolve(_ec_query_result);
      }
      event.sender.send(_ec_callback_id, {
        success: true,
        queryId: _ec_query_id,
        queryRes: _ec_query_result,
      });
    }
    // common used
    else if (
      _ec_callback_id &&
      !_ec_query_id
    ) {
      ipcClient.send({
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
  };

  ipcChannels.forEach((channel) => {
    electron.ipcMain.on(channel, ipcEventHandler);
  });

  ipcServer.on('runQuery', ({
    resolve,
    reject,
    payload: {
      webContentsId,
      queryScript,
    },
  }) => {
    const contents = findWebContents(webContentsId, reject);
    if (contents) {
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
        scriptTpls.tpl_getIpcRenderer(),
        scriptTpls.tpl_getIpcChannel(),
        scriptTpls.tpl_sendback(),
        scriptTpls.tpl_query(queryId, queryScript),
      ];
      contents.executeJavaScript(scripts.join(os.EOL));
    }
  });

  setInterval(() => {
    ipcClient.send({
      action: 'heartbeat',
      timestamp: Date.now(),
    }).catch((error) => {
      logger.error(error);
    });
  }, 5 * 1024);
}

module.exports = initIpc;
