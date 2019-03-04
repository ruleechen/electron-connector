const ipc = require('node-ipc');

class IpcEmitter {
  constructor({
    networkPort,
    silent = false,
    timeout = 5 * 1000,
  }) {
    this._timeout = timeout;
    this._ipcId = `ec-${networkPort}`;
    Object.assign(ipc.config, {
      id: this._ipcId,
      networkPort,
      silent,
    });
  }

  send({
    action,
    ...payload
  }) {
    return new Promise((resolve, reject) => {
      let timeoutId;
      ipc.connectTo(this._ipcId, () => {
        const server = ipc.of[this._ipcId];
        server.on('connect', () => {
          if (timeoutId !== true) {
            clearTimeout(timeoutId);
            server.emit(action, {
              ...payload,
            });
            server.on(`${action}_cb`, (data) => {
              ipc.disconnect(this._ipcId);
              if (data && (data.error || data.success === false)) {
                reject(data);
              } else {
                resolve(data);
              }
            });
            server.on('error', (error) => {
              ipc.disconnect(this._ipcId);
              reject(error);
            });
          }
        });
      });
      timeoutId = setTimeout(() => {
        timeoutId = true;
        reject({
          error: 'timeout',
          success: false,
        });
      }, this._timeout);
    });
  }

  on(action, handler) {
    ipc.serve(() => {
      ipc.server.on(action, (payload, socket) => {
        const callback = (res) => {
          try {
            ipc.server.emit(socket, `${action}_cb`, res || {
              success: true,
            });
          } catch (ex) {
            // ignore
          }
        };
        try {
          handler({
            payload,
            callback,
          });
        } catch (err) {
          callback({
            error: err && err.toString(),
            success: false,
          });
        }
      });
    });
  }

  start() {
    if (ipc.server) {
      ipc.server.start();
      console.info('[ipc] server started');
      ipc.server.on('error', (error) => {
        console.error(`[ipc server] ${error}`);
      });
    }
  }

  destroy() {
    if (ipc.server) {
      ipc.server.stop();
      console.info('[ipc server] stopped');
    }
  }

  get interProcessCommunicationId() {
    return this._ipcId;
  }
}

module.exports = IpcEmitter;
