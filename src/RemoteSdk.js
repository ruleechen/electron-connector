const { IpcServer, IpcClient } = require('./ipc');
const RemoteWindow = require('./RemoteWindow');
const RemoteWebContents = require('./RemoteWebContents');

class RemoteSdk {
  constructor({
    localNetworkPort,
    remoteNetworkPort,
    silent = true,
    remoteWindowImpl = RemoteWindow,
    remoteWebContentsImpl = RemoteWebContents,
    logger = console,
  }) {
    if (RemoteSdk.validateInteger(localNetworkPort)) {
      throw new Error(`localNetworkPort is required a integer`);
    }
    if (RemoteSdk.validateInteger(remoteNetworkPort)) {
      throw new Error(`remoteNetworkPort is required a integer`);
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
    this._logger = logger;

    // for receiving data from host
    this._ipcServer = new IpcServer({
      networkPort: localNetworkPort,
      silent,
      logger,
    });

    // for sending request to host
    this._ipcClient = new IpcClient({
      networkPort: remoteNetworkPort,
      silent,
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

  get ipcClient() {
    return this._ipcClient;
  }

  get ipcServer() {
    return this._ipcServer;
  }

  getRawWindows() {
    return this.ipcClient.send({
      action: 'getWindows',
    });
  }

  getWindows() {
    const RemoteWindowImpl = this._remoteWindowImpl;
    const RemoteWebContentsImpl = this._remoteWebContentsImpl;
    return this.getRawWindows().then((wins) => {
      this._currentWindows = wins.map((win) => new RemoteWindowImpl({
        id: win.windowId,
        title: win.windowTitle,
        ipcServer: this.ipcServer,
        ipcClient: this.ipcClient,
        webContents: new RemoteWebContentsImpl({
          id: win.webContentsId,
          title: win.webContentsTitle,
          ipcServer: this.ipcServer,
          ipcClient: this.ipcClient,
        }),
      }));
      this._logger.log(wins);
      return this._currentWindows;
    });
  }

  _handleRemoteEvents({
    windowId,
    webContentsId,
    eventName,
    eventArgs = [],
  }) {
    let host;
    if (windowId || windowId === 0) {
      host = (this._currentWindows || []).find(x => x.id === windowId);
    }
    if (webContentsId || webContentsId === 0) {
      host = (this._currentWindows || []).find(x => x.webContents.id === webContentsId);
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

module.exports = RemoteSdk;
