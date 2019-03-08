const RemoteEvents = require('./RemoteEvents');

class RemoteWindow extends RemoteEvents {
  constructor({
    ipcClient,
    windowId,
    webContents,
    logger = console,
  }) {
    super({
      logger,
    });
    this._ipcClient = ipcClient;
    this._windowId = windowId;
    this._webContents = webContents;
  }

  get id() {
    return this._windowId;
  }

  get webContents() {
    return this._webContents;
  }

  _eval({
    func,
    args = [],
  }) {
    return this._ipcClient.send({
      action: 'evalWindow',
      windowId: this.id,
      func,
      args,
    });
  }

  show() {
    return this._eval({
      func: 'show',
    });
  }

  hide() {
    return this._eval({
      func: 'hide',
    });
  }

  focus() {
    return this._eval({
      func: 'focus',
    });
  }

  close() {
    return this._eval({
      func: 'close',
    });
  }

  getBounds() {
    return this._eval({
      func: 'getBounds',
    })
  }
}

module.exports = RemoteWindow;
