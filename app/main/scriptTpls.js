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
          _callback_id: callbackId,
        });
      });
    };
  `;
}

function tpl_query(queryId) {
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

module.exports = {
  tpl_sendback,
  tpl_query,
};
