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
    });

    // for sending request to host
    this._ipcClient = new IpcClient({
      networkPort: remoteNetworkPort,
      silent,
    });

    // handler remote events
    this.ipcServer.on('_ec_remote_events', ({
      resolve,
      reject,
      payload,
    }) => {
      try {
        this._logger.log('_ec_remote_events', payload);
        this._remoteEventsHandler(payload);
        resolve();
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

  getWindows() {
    const RemoteWindowImpl = this._remoteWindowImpl;
    const RemoteWebContentsImpl = this._remoteWebContentsImpl;
    return this.ipcClient.send({
      action: 'getWindows',
    }).then((wins) => {
      this._logger.log(wins);
      return wins;
    }).then((wins) => (
      wins.map((win) => new RemoteWindowImpl({
        ipcClient: this.ipcClient,
        windowId: win.id,
        webContents: new RemoteWebContentsImpl({
          ipcClient: this.ipcClient,
          webContentsId: win.webContentsId,
        }),
      }))
    )).then((remoteWindows) => (
      this._currentWindows = remoteWindows
    ));
  }

  _remoteEventsHandler({
    windowId,
    webContentsId,
    eventName,
    eventArgs = [],
  }) {
    let host;
    if (windowId || windowId === 0) {
      host = (this._currentWindows || []).filter(x => x.id === windowId);
    }
    if (webContentsId || webContentsId === 0) {
      host = (this._currentWindows || []).filter(x => x.webContents.id === webContentsId);
    }
    if (host) {
      const applyArgs = [eventName, ...eventArgs];
      host.emit.apply(host, applyArgs);
    }
  }

  destroy() {
    this.ipcClient.destroy();
    this.ipcServer.destroy();
  }
}

module.exports = RemoteSdk;
