const EventEmitter = require('events');
const uuid = require('uuid');
const { IPC } = require('node-ipc');

class IpcEmitter extends EventEmitter {
  constructor({
    networkPort,
    silent = false,
    sendTimeout = 5 * 1000,
  }) {
    super();
    this._sendTimeout = sendTimeout;
    this._eventName = 'commandline';
    // config ipc
    this._ipc = new IPC();
    this._ipcId = `ec-${networkPort}`;
    Object.assign(this._ipc.config, {
      id: this._ipcId,
      networkPort,
      silent,
    });
    // caches
    this._callbackIds = {};
  }

  send({
    action,
    ...payload
  }) {
    clearTimeout(this._idleTimtoutId);
    return new Promise((resolve, reject) => {
      if (!action) {
        reject(new Error('action is required'));
        return;
      }
      let timeoutId;
      this._ipc.connectTo(this._ipcId, () => {
        const server = this._ipc.of[this._ipcId];
        server.on('connect', () => {
          const callbackId = `${action}_${uuid.v4()}`;
          this._callbackIds[callbackId] = true;
          server.emit(this._eventName, {
            ...payload,
            action,
            _callback_id: callbackId,
          });
          server.on(callbackId, (data) => {
            this._onSent(callbackId);
            if (timeoutId !== true) {
              clearTimeout(timeoutId);
              if (data && (data.error || data.success === false)) {
                reject(data);
              } else {
                resolve(data);
              }
            }
          });
          server.on('error', (error) => {
            this._onSent(callbackId);
            if (timeoutId !== true) {
              clearTimeout(timeoutId);
              reject(error);
            }
          });
        });
      });
      timeoutId = setTimeout(() => {
        timeoutId = true;
        reject({
          error: 'timeout',
          success: false,
        });
      }, this._sendTimeout);
    });
  }

  _onSent(callbackId) {
    delete this._callbackIds[callbackId];
    if (!Object.keys(this._callbackIds).length) {
      this._idleTimtoutId = setTimeout(() => {
        this._ipc.disconnect(this._ipcId);
      }, 1024);
    }
  }

  _initServer() {
    this._ipc.serve(() => {
      this._ipc.server.on(this._eventName, ({
        action,
        _callback_id,
        ...payload
      }, socket) => {
        const callback = (data) => {
          try {
            let res = data;
            if (res instanceof Error) {
              res = {
                action,
                error: res.toString(),
                success: false,
              };
            }
            this._ipc.server.emit(socket, _callback_id, res);
          } catch (ex) {
            // ignore
          }
        };
        try {
          this.emit(action, {
            payload,
            callback,
          });
        } catch (err) {
          callback({
            action,
            error: err && err.toString(),
            success: false,
          });
        }
      });
    });
  }

  start() {
    this._initServer();
    if (this._ipc.server) {
      this._ipc.server.start();
      console.info('[ipc server] started');
      this._ipc.server.on('error', (error) => {
        console.error(`[ipc server] ${error}`);
      });
    }
  }

  destroy() {
    if (this._ipc.server) {
      this._ipc.server.stop();
      console.info('[ipc server] stopped');
    }
  }

  get interProcessCommunicationId() {
    return this._ipcId;
  }
}

module.exports = IpcEmitter;
