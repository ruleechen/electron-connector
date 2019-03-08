const { RemoteEvents } = require('../index');

class TestEvents extends RemoteEvents {
  constructor({
    logger = console,
  } = {}) {
    super({
      logger,
    });
    this._logger = logger;
  }

  _eval({
    func,
    args,
  }) {
    this._logger.log(func, args);
    return Promise.resolve();
  }
}

var obj = new TestEvents();
const handler1 = () => { console.log('handler1'); };
const handler2 = () => { console.log('handler2'); };
// obj.on('myevent1', handler1);
obj.on('myevent', handler1);
obj.on('myevent', handler2);
// obj.on('myevent', handler2);
// obj.removeAllListeners('myevent');
obj.off('myevent', handler1);
obj.off('myevent', handler2);
