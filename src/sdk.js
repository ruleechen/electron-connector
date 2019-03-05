const IpcEmitter = require('./ipc');

class IpcSdk {
  constructor({
    localPort,
    remotePort,
    silent = true,
  }) {
    if (IpcSdk.validateInteger(localPort)) {
      throw new Error(`localPort is required a integer`);
    }
    if (IpcSdk.validateInteger(remotePort)) {
      throw new Error(`remotePort is required a integer`);
    }
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
    return this._ipcClient.send({
      action: 'getWindows',
    });
  }

  inspectWindow(windowId) {
    return this._ipcClient.send({
      action: 'inspect',
      windowId,
    });
  }

  executeJavaScript({ windowId, scriptContent }) {
    return this._ipcClient.send({
      action: 'executeJavaScript',
      windowId,
      scriptContent,
    });
  }

  insertCSS({ windowId, cssContent }) {
    return this._ipcClient.send({
      action: 'insertCSS',
      windowId,
      cssContent,
    });
  }

  scriptQuery({ windowId, scriptContent }) {
    return this._ipcClient.send({
      action: 'scriptQuery',
      windowId,
      scriptContent,
    });
  }

  static get queryFuncName() {
    // sample:
    // Promise is supported
    /*
    function _ec_query() {
      return {
        isMainWindow: (location.pathname === '/_'),
      };
    }
    */
    return '_ec_query';
  }
}

module.exports = IpcSdk;
