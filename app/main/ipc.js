const EventEmitter = require('events');
const ipc = require('node-ipc');

class IpcEmitter extends EventEmitter {
  constructor({
    networkPort,
    silent = true,
    timeout = 5 * 1000,
  }) {
    super();
    this._timeout = timeout;
    this._ipcId = `ec-${networkPort}`;
    Object.assign(ipc.config, {
      id: this._ipcId,
      networkPort,
      silent,
    });
  }

  emitCommand({
    action,
    ...payload
  }) {
    return new Promise((resolve, reject) => {
      let timeoutId;
      this.emit(action, (res) => {
        if (timeoutId !== true) {
          clearTimeout(timeoutId);
          if (res instanceof Error) {
            reject(res);
          } else {
            resolve(res);
          }
        }
      }, payload);
      timeoutId = setTimeout(() => {
        timeoutId = true;
        reject('timeout');
      }, this._timeout);
    });
  }

  startListener() {
    ipc.serve(() => {
      ipc.server.on('command-line', (commandLine, socket) => {
        this.emitCommand(commandLine).then((res) => {
          ipc.server.emit(socket, 'message', res || {
            success: true,
          });
        }).catch((err) => {
          ipc.server.emit(socket, 'message', {
            error: err && err.toString(),
            success: false,
          });
        });
      });
      ipc.server.on('error', (error) => {
        console.error(`[ipc] ${error}`);
      });
    });
    ipc.server.start();
    console.info('[ipc] server started');
  }

  sendCommand({
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
            server.emit('command-line', {
              action,
              ...payload,
            });
            server.on('message', (data) => {
              ipc.disconnect(this._ipcId);
              resolve(data);
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

  destroy() {
    this.removeAllListeners();
    if (ipc.server) {
      ipc.server.stop();
      console.info('[ipc] server stopped');
    }
  }

  get interProcessCommunicationId() {
    return this._ipcId;
  }
}

module.exports = IpcEmitter;
