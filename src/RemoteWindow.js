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

  evalWindow({
    func,
    args = [],
  }) {
    return this._ipcClient.send({
      action: 'evalWindow',
      windowId: this._windowId,
      func,
      args,
    });
  }

  evalWebContent({
    func,
    args = [],
  }) {
    return this._ipcClient.send({
      action: 'evalWebContent',
      windowId: this._windowId,
      func,
      args,
    });
  }

  show() {
    return this.evalWindow({
      func: 'show',
    });
  }

  hide() {
    return this.evalWindow({
      func: 'hide',
    });
  }

  focus() {
    return this.evalWindow({
      func: 'focus',
    });
  }

  close() {
    return this.evalWindow({
      func: 'close',
    });
  }

  getBounds() {
    return this.evalWindow({
      func: 'getBounds',
    })
  }

  inspect(mode = 'detach') {
    return this.evalWebContent({
      func: 'openDevTools',
      args: [{ mode }],
    });
  }

  insertCSS(cssContent) {
    return this.evalWebContent({
      func: 'insertCSS',
      args: [cssContent],
    });
  }

  executeScript(scriptContent) {
    return this.evalWebContent({
      func: 'executeJavaScript',
      args: [scriptContent],
    });
  }

  runQuery(queryScript) {
    return this._ipcClient.send({
      action: 'runQuery',
      windowId: this._windowId,
      queryScript,
    });
  }
}

module.exports = RemoteWindow;
