const trimPlus = require('../lib/trimPlus');
const ipcChannels = require('./ipcChannels');

function tpl_executeJavaScript(scriptContent) {
  return `
    new Promise((resolve, reject) => {
      try {
        ${scriptContent}
        resolve('executed');
      } catch (ex) {
        reject(ex);
      }
    })
  `;
}

function tpl_getIpcRenderer() {
  return `
    function _ec_getIpcRenderer() {
      let result;
      // for common electron app
      if (window.require) {
        try {
          const electron = window.require('electron');
          if (electron) {
            result = electron.ipcRenderer;
          }
        } catch (ex) {
          // ignore ex
        }
      }
      // for MS Teams specified
      if (!result) {
        result = window.electronSafeIpc;
      }
      // ret
      return result;
    }
  `;
}

function tpl_getIpcChannel() {
  const channels = ipcChannels.join(',');
  return `
    function _ec_getIpcChannel() {
      return new Promise((resolve, reject) => {
        if (window._ec_channel) {
          resolve(window._ec_channel);
          return;
        }
        const channels = '${channels}'.split(',');
        Promise.race(
          channels.map((channel) => (
            _ec_sendBack({
              channel,
              payload: {
                _ec_action: '_ec_test_channel',
                _ec_test_channel: channel,
              },
            })
          ))
        )
        .then((res) => {
          window._ec_channel = res.channel;
          resolve(res.channel);
        })
        .catch(reject);
      });
    }
  `;
}

function tpl_sendback() {
  return `
    function _ec_sendBack({
      channel,
      payload = {},
      resolve: resolveFn = res => res,
      timeout = 10 * 1000,
    }) {
      const ipcRenderer = _ec_getIpcRenderer();
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
        const channelPromise = channel
          ? Promise.resolve(channel)
          : _ec_getIpcChannel();
        channelPromise.then((ipcChannel) => {
          ipcRenderer.send(ipcChannel, {
            ...payload,
            _ec_callback_id: callbackId,
          });
        }).catch(reject);
      });
    };
  `;
}

function tpl_query(queryId, queryScript) {
  const query = trimPlus(queryScript.trim(), ';');
  return `
    (function() {
      const query = (${query});
      Promise.resolve(query).then((data) => (
        _ec_sendBack({
          payload: {
            _ec_action: '_ec_query',
            _ec_query_id: '${queryId}',
            _ec_query_result: data,
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

module.exports = {
  tpl_executeJavaScript,
  tpl_getIpcRenderer,
  tpl_getIpcChannel,
  tpl_sendback,
  tpl_query,
};
