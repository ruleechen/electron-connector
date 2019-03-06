const EventEmitter = require('events');
const { IPC } = require('node-ipc');

class IpcEmitter extends EventEmitter {
  constructor({
    networkPort,
    silent = false,
    sendTimeout = 5 * 1000,
    logger = console,
  }) {
    super();
    this._sendTimeout = sendTimeout;
    this._eventName = 'commandline';
    this._logger = logger;
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
      this._acquireConnection().then((connection) => {
        const randomId = Math.random().toString().substr(2);
        const callbackId = `${action}_${randomId}`;
        this._callbackIds[callbackId] = true;
        connection.emit(this._eventName, {
          ...payload,
          action,
          _ec_callback_id: callbackId,
        });
        connection.once(callbackId, (result) => {
          this._onSent(callbackId);
          if (timeoutId !== true) {
            clearTimeout(timeoutId);
            if (result && (result.error || result.success === false)) {
              reject(result);
            } else {
              resolve(result);
            }
          }
        });
        connection.on('error', (error) => {
          this._onSent(callbackId);
          if (timeoutId !== true) {
            clearTimeout(timeoutId);
            reject(error);
          }
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

  _acquireConnection() {
    if (this._currentConnection) {
      clearTimeout(this._idleTimtoutId);
      return Promise.resolve(this._currentConnection);
    }
    if (this._connectionPromise) {
      return Promise.resolve(this._connectionPromise);
    }
    this._connectionPromise = new Promise((resolve) => {
      this._ipc.connectTo(this._ipcId, () => {
        const connection = this._ipc.of[this._ipcId];
        connection.on('connect', () => {
          this._currentConnection = connection;
          this._connectionPromise = null;
          resolve(connection);
        });
        connection.on('disconnect', () => {
          this._currentConnection = null;
        });
      });
    });
    return this._connectionPromise;
  }

  _onSent(callbackId) {
    delete this._callbackIds[callbackId];
    if (!Object.keys(this._callbackIds).length) {
      this._idleTimtoutId = setTimeout(() => {
        this._ipc.disconnect(this._ipcId);
        this._currentConnection = null;
      }, 1024);
    }
  }

  _initServer() {
    this._ipc.serve(() => {
      this._ipc.server.on(this._eventName, ({
        action,
        _ec_callback_id,
        ...payload
      }, socket) => {
        const callback = (result) => {
          try {
            let res = result;
            if (res instanceof Error) {
              res = {
                action,
                error: res.toString(),
                success: false,
              };
            }
            this._ipc.server.emit(socket, _ec_callback_id, res);
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
      this._logger.info('[ipc server] started');
      this._ipc.server.on('error', (error) => {
        this._logger.error(`[ipc server] ${error}`);
      });
    }
  }

  destroy() {
    if (this._ipc.server) {
      this._ipc.server.stop();
      this._logger.info('[ipc server] stopped');
    }
  }

  get interProcessCommunicationId() {
    return this._ipcId;
  }
}

module.exports = IpcEmitter;
