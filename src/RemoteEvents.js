const EventEmitter = require('events');

class RemoteEvents extends EventEmitter {
  constructor({
    logger = console,
  } = {}) {
    super();
    this._logger = logger;
    this._hasEventListener = {};
    // subscriptions
    this.on('removeListener', (eventName) => {
      this.reconcileHooks({
        eventName,
        isRemove: true,
      });
    });
    this.on('newListener', (eventName) => {
      this.reconcileHooks({
        eventName,
        isRemove: false,
      });
    });
  }

  reconcileHooks({
    eventName,
    isRemove,
  }) {
    let hasListener = true;
    if (isRemove) {
      hasListener = (this.listenerCount(eventName) > 0);
    }
    if (this._hasEventListener[eventName] !== hasListener) {
      this._hasEventListener[eventName] = hasListener;
      this._eval({
        func: hasListener ? 'addListener' : 'removeListener',
        args: [eventName],
      }).then((res) => {
        this._logger.log('reconcileHooks', res);
      }).catch((err) => {
        this._logger.error('reconcileHooks', err);
      });
    }
  }

  _eval({
    func,
    args,
  }) {
    this._logger.log(func, args);
    throw new Error('"_eval" should be implemented on sub classes');
  }
}

module.exports = RemoteEvents;
