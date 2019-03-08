const RemoteEvents = require('./RemoteEvents');

class RemoteWebContents extends RemoteEvents {
  constructor({
    ipcClient,
    webContentsId,
    logger = console,
  }) {
    super({
      logger,
    });
    this._ipcClient = ipcClient;
    this._webContentsId = webContentsId;
  }

  get id() {
    return this._webContentsId;
  }

  _eval({
    func,
    args = [],
  }) {
    return this._ipcClient.send({
      action: 'evalWebContents',
      webContentsId: this.id,
      func,
      args,
    });
  }

  getTitle() {
    return this._eval({
      func: 'getTitle',
    });
  }

  isFocused() {
    return this._eval({
      func: 'isFocused',
    });
  }


  inspect(mode = 'detach') {
    return this._eval({
      func: 'openDevTools',
      args: [{ mode }], // right, bottom, undocked, detach
    });
  }

  insertCSS(cssContent) {
    return this._eval({
      func: 'insertCSS',
      args: [cssContent],
    });
  }

  executeScript(scriptContent) {
    return this._eval({
      func: 'executeJavaScript',
      args: [scriptContent],
    });
  }

  runQuery(queryScript) {
    return this._ipcClient.send({
      action: 'runQuery',
      windowId: this.id,
      queryScript,
    });
  }
}

module.exports = RemoteWebContents;
