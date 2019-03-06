const trimPlus = require('../lib/trimPlus');

function tpl_sendback() {
  return `
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
          _ec_callback_id: callbackId,
        });
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
            _ec_result: data,
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
  tpl_sendback,
  tpl_query,
};
