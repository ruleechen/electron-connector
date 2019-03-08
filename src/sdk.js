const IpcEmitter = require('./ipc');
const RemoteWindow = require('./RemoteWindow');

class IpcSdk {
  constructor({
    localPort,
    remotePort,
    silent = true,
    remoteWindowImpl = RemoteWindow,
  }) {
    if (IpcSdk.validateInteger(localPort)) {
      throw new Error(`localPort is required a integer`);
    }
    if (IpcSdk.validateInteger(remotePort)) {
      throw new Error(`remotePort is required a integer`);
    }
    if (!(RemoteWindowImpl instanceof RemoteWindow)) {
      throw new Error('RemoteWindowImpl extends from RemoteWindow is required');
    }
    this._remoteWindowImpl = remoteWindowImpl;
    // for sending request to host
    this._ipcClient = new IpcEmitter({
      networkPort: remotePort,
      silent,
    });
    // for receiving data from host
    this._ipcServer = new IpcEmitter({
      networkPort: localPort,
      silent,
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

  on(action, handler) {
    this._ipcServer.on(action, handler);
  }

  getWindows() {
    const RemoteWindowImpl = this._remoteWindowImpl;
    return this._ipcClient.send({
      action: 'getWindows',
    }).then((wins) => (
      wins.map((win) => new RemoteWindowImpl({
        ipcClient: this.ipcClient,
        windowId: win.id,
      }))
    ));
  }
}

module.exports = IpcSdk;
