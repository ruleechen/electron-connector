const fs = require('fs');
const uuid = require('uuid');
const { app, BrowserWindow, ipcMain } = require("electron");
const { portAvailable } = require('../lib/portHelpers');
const log = require('./logger');
const { appSettings } = require('./settings');

app.on('ready', () => {
  setInterval(() => {
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach((win) => {
      if (!win || win.isDestroyed()) {
        return;
      }

      if (!win._ec_uuid) {
        win._ec_uuid = uuid.v4();
      }

      if (win.webContents && !win.webContents.__reg_js_one_time) {
        win.webContents.__reg_js_one_time = true;
        win.webContents.executeJavaScript(`
          const __ec_apis = {};

          __ec_apis.appendHtml = function(el, html) {
            const temp = document.createElement('div');
            temp.style.display = 'none';
            temp.innerHTML = html;
            while (temp.firstChild) {
              el.appendChild(temp.firstChild);
            }
          };

          __ec_apis.sendRequest = function({
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

          __ec_apis.detectMainWindow = function(windowId) {
            const isMainWindow = (window.location.pathname === '/_');
            __ec_apis.sendRequest({
              payload: {
                windowId,
                isMainWindow,
              },
            }).then((res) => {
              console.log(res);
            }).catch((err) => {
              console.error(err);
            });
          };
        `);
      }

      if (win.webContents) {
        win.webContents.executeJavaScript(`
          __ec_apis.detectMainWindow('${win._ec_uuid}');
        `);
      }
    });
  }, 1024 * 10);

  function injectPhoneIframe(win) {
    const html = [
      '<div id="viewport" style="position: absolute; bottom: 20px; right: 20px; width: 300px; height: 500px;">',
      '</div>',
    ];

    win.webContents.executeJavaScript(`
      function appendHtml(el, html) {
        const temp = document.createElement('div');
        temp.style.display = 'none';
        temp.innerHTML = html;
        while (temp.firstChild) {
          el.appendChild(temp.firstChild);
        }
      }
      appendHtml(document.body, '${html.join('')}');
    `);

    const destFile = '/tech/msteams-connector/src/index.js';
    const scriptContent = fs.readFileSync(destFile, { encoding: 'utf8' });
    win.webContents.executeJavaScript(scriptContent);
  }

  ipcMain.on('perf', (event, {
    callbackId,
    windowId,
    isMainWindow,
  }) => {
    if (callbackId) {
      event.sender.send(callbackId, {
        windowId,
      });
      if (!event.sender._devTools_Opened && isMainWindow) {
        event.sender._devTools_Opened = true;
        event.sender.openDevTools({
          mode: 'detach',
        });
      }
      if (
        isMainWindow &&
        !event.sender._ec_menu_reged
      ) {
        const mainWindow = BrowserWindow.getAllWindows().find(x => (
          x && x.webContents === event.sender && !x.isDestroyed()
        ));
        if (mainWindow) {
          injectPhoneIframe(mainWindow);
          event.sender._ec_menu_reged = true;
        }
      }
    }
  });

  const portStart = 8081;
  portAvailable(portStart).then((port) => {
    appSettings.set('msteamsPort', port);
  });

  log.info('[injection] started');
});
