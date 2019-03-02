const EventEmitter = require('events');
const ipc = require('node-ipc');

class IpcEmitter extends EventEmitter {
  constructor({
    networkPort,
  }) {
    super();
    this._ipcId = `ec-${networkPort}`;
    Object.assign(ipc.config, {
      id: this._ipcId,
      retry: 1500,
      networkPort,
      silent: true,
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
        reject('timeout');
        timeoutId = true;
      }, 15 * 1000);
    });
  }

  startListener() {
    ipc.serve(() => {
      ipc.server.on('command-line', ({ commandLine }, socket) => {
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

  sendCommand({ commandLine }) {
    return new Promise((resolve, reject) => {
      ipc.connectTo(this._ipcId, () => {
        const server = ipc.of[this._ipcId];
        server.on('connect', () => {
          server.emit('command-line', {
            commandLine,
          });
          server.on('message', (data) => {
            ipc.disconnect(this._ipcId);
            resolve(data);
          });
          server.on('error', (error) => {
            ipc.disconnect(this._ipcId);
            reject(error);
          });
        });
      });
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
