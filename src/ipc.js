const EventEmitter = require('events');
const { IPC } = require('node-ipc');

class IpcEmitter extends EventEmitter {
  constructor({
    networkPort,
    silent = false,
    sendTimeout = 15 * 1024,
    idleTimtout = 1 * 1024,
    logger = console,
  }) {
    super();
    // parameters
    this._sendTimeout = sendTimeout;
    this._idleTimtout = idleTimtout;
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
    this._requests = {};
  }

  get interProcessCommunicationId() {
    return this._ipcId;
  }

  send({
    action,
    ...payload
  }) {
    if (!action) {
      throw new Error('action is required');
    }
    return this._acquireConnection().then((connection) => (
      new Promise((resolve, reject) => {
        // request id
        const randomId = Math.random().toString().substr(2);
        const requestId = `${action}_${randomId}`;
        // timeout timer
        let timeoutId = setTimeout(() => {
          const completed = this._completeRequest(requestId);
          if (completed) {
            timeoutId = true;
            reject({
              error: 'timeout',
              success: false,
            });
          }
        }, this._sendTimeout);
        // set cache
        this._requests[requestId] = {
          resolve,
          reject,
          timeoutId,
        };
        // subscribe response
        connection.once(requestId, (result) => {
          const completed = this._completeRequest(requestId);
          if (completed && timeoutId !== true) {
            clearTimeout(timeoutId);
            if (result && (result.error || result.success === false)) {
              reject(result);
            } else {
              resolve(result);
            }
          }
        });
        // send request
        connection.emit(this._eventName, {
          ...payload,
          action,
          _ec_callback_id: requestId,
        });
      })
    ));
  }

  _acquireConnection() {
    clearTimeout(this._idleTimtoutId);
    if (this._currentConnection) {
      return Promise.resolve(this._currentConnection);
    }
    if (this._connectionPromise) {
      return Promise.resolve(this._connectionPromise);
    }
    this._connectionPromise = new Promise((resolve, reject) => {
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
        connection.on('error', (error) => {
          reject(error);
        });
      });
    });
    return this._connectionPromise;
  }

  _completeRequest(requestId) {
    const deleted = delete this._requests[requestId];
    if (!Object.keys(this._requests).length) {
      this._idleTimtoutId = setTimeout(() => {
        this._ipc.disconnect(this._ipcId);
        this._currentConnection = null;
      }, this._idleTimtout);
    }
    return deleted;
  }

  _terminateRequests() {
    this._ipc.disconnect(this._ipcId);
    Object.keys(this._requests).forEach((requestId) => {
      const request = this._requests[requestId];
      delete this._requests[requestId];
      clearTimeout(request.timeoutId);
      request.reject({
        error: 'terminated',
        success: false,
      });
    });
  }

  _initServer() {
    this._ipc.serve(() => {
      this._ipc.server.on(this._eventName, ({
        action,
        _ec_callback_id,
        ...payload
      }, socket) => {
        new Promise((resolve, reject) => {
          try {
            this.emit(action, {
              resolve,
              reject,
              payload,
            });
          } catch (err) {
            reject({
              action,
              error: err && err.toString(),
              success: false,
            });
          }
        }).then((result) => {
          this._ipc.server.emit(socket, _ec_callback_id, result || {
            action,
            success: true,
          });
        }).catch((error) => {
          let err = error;
          if (err instanceof Error) {
            err = {
              action,
              success: false,
              error: res.toString(),
            };
          }
          this._ipc.server.emit(socket, _ec_callback_id, err);
        });
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
    this._terminateRequests();
    if (this._ipc.server) {
      this._ipc.server.stop();
      this._logger.info('[ipc server] stopped');
    }
  }
}

module.exports = IpcEmitter;
