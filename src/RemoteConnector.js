const { IpcServer, IpcClient } = require('../app/lib/ipc');
const RemoteWindow = require('./RemoteWindow');
const RemoteWebContents = require('./RemoteWebContents');

class RemoteConnector {
  constructor({
    localServerPort,
    remoteServerPort,
    ipcSilent = false,
    remoteWindowImpl = RemoteWindow,
    remoteWebContentsImpl = RemoteWebContents,
    logger = console,
  }) {
    if (RemoteConnector.validateInteger(localServerPort)) {
      throw new Error(`localServerPort is required a integer`);
    }
    if (RemoteConnector.validateInteger(remoteServerPort)) {
      throw new Error(`remoteServerPort is required a integer`);
    }
    if (!remoteWindowImpl) {
      throw new Error(`remoteWindowImpl is required`);
    }
    if (!remoteWebContentsImpl) {
      throw new Error(`remoteWebContentsImpl is required`);
    }
    if (
      remoteWindowImpl !== RemoteWindow &&
      !(remoteWindowImpl.prototype instanceof RemoteWindow)
    ) {
      throw new Error('RemoteWindowImpl extends from RemoteWindow is required');
    }
    if (
      remoteWebContentsImpl !== RemoteWebContents &&
      !(remoteWebContentsImpl.prototype instanceof RemoteWebContents)
    ) {
      throw new Error('remoteWebContentsImpl extends from RemoteWebContents is required');
    }
    this._remoteWindowImpl = remoteWindowImpl;
    this._remoteWebContentsImpl = remoteWebContentsImpl;
    this._latestWindows = [];
    this._logger = logger;

    // for receiving data from host
    this._ipcServer = new IpcServer({
      networkPort: localServerPort,
      silent: ipcSilent,
      logger,
    });

    // for sending request to host
    this._ipcClient = new IpcClient({
      networkPort: remoteServerPort,
      silent: ipcSilent,
      logger,
    });

    // handler remote events
    this.ipcServer.on('_ec_remote_events', ({
      resolve,
      reject,
      payload,
    }) => {
      try {
        this._handleRemoteEvents(payload)
          .then(resolve)
          .catch(reject);
      } catch (ex) {
        reject(ex);
      }
    });
  }

  static validateInteger(num) {
    return (
      /^\d+$/.test(num) &&
      typeof (num) !== 'number'
    );
  }

  get logger() {
    return this._logger;
  }

  get ipcClient() {
    return this._ipcClient;
  }

  get ipcServer() {
    return this._ipcServer;
  }

  get latestWindows() {
    return this._latestWindows;
  }

  getRawWindows() {
    return this.ipcClient.send({
      action: 'getWindows',
    }).then((wins) => {
      this.logger.log(wins);
      return wins;
    });
  }

  getWindows() {
    const RemoteWindowImpl = this._remoteWindowImpl;
    const RemoteWebContentsImpl = this._remoteWebContentsImpl;
    return this.getRawWindows().then((wins) => (
      this._latestWindows = wins.map((win) => new RemoteWindowImpl({
        id: win.windowId,
        title: win.windowTitle,
        ipcServer: this.ipcServer,
        ipcClient: this.ipcClient,
        logger: this.logger,
        webContents: new RemoteWebContentsImpl({
          id: win.webContentsId,
          title: win.webContentsTitle,
          ipcServer: this.ipcServer,
          ipcClient: this.ipcClient,
          logger: this.logger,
        }),
      }))
    ));
  }

  _handleRemoteEvents({
    windowId,
    webContentsId,
    eventName,
    eventArgs = [],
  }) {
    let host;
    if (windowId || windowId === 0) {
      host = this.latestWindows.find(x => x.id === windowId);
    }
    if (webContentsId || webContentsId === 0) {
      host = this.latestWindows.find(x => x.webContents.id === webContentsId);
    }
    if (host) {
      const applyArgs = [eventName, ...eventArgs];
      host.emit.apply(host, applyArgs);
      return Promise.resolve({ emited: true });
    }
    return Promise.reject(new Error('Event target notfound'));
  }

  destroy() {
    this.ipcClient.destroy();
    this.ipcServer.destroy();
  }
}

module.exports = RemoteConnector;
