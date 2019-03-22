const EventEmitter = require('events');
const { IPC } = require('node-ipc');

class IpcBase extends EventEmitter {
  constructor({
    networkPort,
    silent = false,
    logger = console,
  }) {
    super();
    this._logger = logger;
    this._defaultChannel = 'default-channel';
    // inter process communication id
    this._innerIpcId = `ec-${networkPort}`;
    this._innerIpc = new IPC();
    Object.assign(this._innerIpc.config, {
      id: this._innerIpcId,
      networkPort,
      silent,
      logger: this.logger.log.bind(this.logger),
    });
  }

  get logger() {
    return this._logger;
  }

  get defaultChannel() {
    return this._defaultChannel;
  }

  get innerIpcId() {
    return this._innerIpcId;
  }

  get innerIpc() {
    return this._innerIpc;
  }
}

/*****************************************************************************/
class IpcServer extends IpcBase {
  constructor({
    networkPort,
    silent,
    logger,
  }) {
    super({
      networkPort,
      silent,
      logger,
    });
    // caches
    this._requests = {};
  }

  _initServer() {
    this.innerIpc.serve(() => {
      this.innerIpc.server.on(this.defaultChannel, ({
        action,
        _ec_request_id,
        ...payload
      }, socket) => {
        new Promise((resolve, reject) => {
          this._requests[_ec_request_id] = {
            resolve,
            reject,
          };
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
          delete this._requests[_ec_request_id];
          this.innerIpc.server.emit(socket, _ec_request_id, result || {
            action,
            success: true,
          });
        }).catch((error) => {
          delete this._requests[_ec_request_id];
          let err = error;
          if (err instanceof Error) {
            err = {
              action,
              success: false,
              error: err.toString(),
            };
          }
          this.innerIpc.server.emit(socket, _ec_request_id, err);
        });
      });
      this.innerIpc.server.on('error', (error) => {
        this.logger.error('[ipc server]', error);
      });
    });
  }

  _terminateRequests() {
    Object.keys(this._requests).forEach((requestId) => {
      const request = this._requests[requestId];
      request.reject({
        error: 'terminated',
        success: false,
      });
    });
  }

  start() {
    this._initServer();
    if (this.innerIpc.server) {
      this.innerIpc.server.start();
      this.logger.info('[ipc server] started');
    }
  }

  destroy() {
    this._terminateRequests();
    if (this.innerIpc.server) {
      this.innerIpc.server.stop();
      this.logger.info('[ipc server] stopped');
    }
  }
}

/*****************************************************************************/
class IpcClient extends IpcBase {
  constructor({
    networkPort,
    silent,
    logger,
    sendTimeout = 15 * 1024,
    idleTimtout = 1 * 1024,
  }) {
    super({
      networkPort,
      silent,
      logger,
    });
    // parameters
    this._sendTimeout = sendTimeout;
    this._idleTimtout = idleTimtout;
    // caches
    this._requests = {};
    this._idleTimtoutId = null;
    this._currentConnection = null;
    this._connectionPromise = null;
  }

  send({
    action,
    ...payload
  }) {
    if (!action) {
      throw new Error('action is required');
    }
    clearTimeout(this._idleTimtoutId);
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
              action,
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
        connection.emit(this.defaultChannel, {
          ...payload,
          action,
          _ec_request_id: requestId,
        });
      })
    ));
  }

  _acquireConnection() {
    if (this._currentConnection) {
      return Promise.resolve(this._currentConnection);
    }
    if (this._connectionPromise) {
      return Promise.resolve(this._connectionPromise);
    }
    this._connectionPromise = new Promise((resolve) => {
      this.innerIpc.connectTo(this.innerIpcId, () => {
        const connection = this.innerIpc.of[this.innerIpcId];
        connection.on('connect', () => {
          this._currentConnection = connection;
          this._connectionPromise = null;
          resolve(connection);
        });
        connection.on('disconnect', () => {
          this._currentConnection = null;
        });
        connection.on('error', (error) => {
          this.logger.error('[ipc client]', error);
        });
      });
    });
    return this._connectionPromise;
  }

  _completeRequest(requestId) {
    const deleted = delete this._requests[requestId];
    if (!Object.keys(this._requests).length) {
      this._idleTimtoutId = setTimeout(() => {
        this.innerIpc.disconnect(this.innerIpcId);
        this._currentConnection = null;
      }, this._idleTimtout);
    }
    return deleted;
  }

  _terminateRequests() {
    this.innerIpc.disconnect(this.innerIpcId);
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

  destroy() {
    this._terminateRequests();
  }
}

module.exports = {
  IpcServer,
  IpcClient,
};
