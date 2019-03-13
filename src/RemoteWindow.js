const RemoteEvents = require('./RemoteEvents');

class RemoteWindow extends RemoteEvents {
  constructor({
    id,
    title,
    ipcServer,
    ipcClient,
    webContents,
    logger = console,
  }) {
    super({
      logger,
    });
    this._id = id;
    this._title = title;
    this._ipcServer = ipcServer;
    this._ipcClient = ipcClient;
    this._webContents = webContents;
  }

  get id() {
    return this._id;
  }

  get title() {
    return this._title;
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
    });
  }
}

module.exports = RemoteWindow;
