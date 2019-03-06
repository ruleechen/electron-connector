const EventEmitter = require('events');

class RemoteWindow extends EventEmitter {
  constructor({
    ipcClient,
    windowId,
  }) {
    super();
    this._ipcClient = ipcClient;
    this._windowId = windowId;
  }

  get id() {
    return this._sdk;
  }

  show() {
    return this._ipcClient.send({
      action: 'evalWindow',
      windowId: this._windowId,
      func: 'show',
    });
  }

  hide() {
    return this._ipcClient.send({
      action: 'evalWindow',
      windowId: this._windowId,
      func: 'hide',
    });
  }

  focus() {
    return this._ipcClient.send({
      action: 'evalWindow',
      windowId: this._windowId,
      func: 'focus',
    });
  }

  close() {
    return this._ipcClient.send({
      action: 'evalWindow',
      windowId: this._windowId,
      func: 'close',
    });
  }

  inspect(mode = 'detach') {
    return this._ipcClient.send({
      action: 'evalWebContent',
      windowId: this._windowId,
      func: 'openDevTools',
      args: [{ mode }],
    });
  }

  executeScript(scriptContent) {
    return this._ipcClient.send({
      action: 'executeJavaScript',
      windowId: this._windowId,
      scriptContent,
    });
  }

  insertCSS(cssContent) {
    return this._ipcClient.send({
      action: 'insertCSS',
      windowId: this._windowId,
      cssContent,
    });
  }

  query(scriptContent) {
    return this._ipcClient.send({
      action: 'scriptQuery',
      windowId: this._windowId,
      scriptContent,
    });
  }
}

module.exports = RemoteWindow;
