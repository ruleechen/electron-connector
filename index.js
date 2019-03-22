const { IpcServer, IpcClient } = require('./app/lib/ipc');
const AsarInjector = require('./src/AsarInjector');
const Connector = require('./src/Connector');
const EmptyLogger = require('./src/EmptyLogger');
const RemoteEvents = require('./src/RemoteEvents');
const RemoteWindow = require('./src/RemoteWindow');
const RemoteWebContents = require('./src/RemoteWebContents');
const RemoteConnector = require('./src/RemoteConnector');
const RemoteSDK = require('./src/RemoteSDK');

module.exports = {
  IpcServer,
  IpcClient,
  AsarInjector,
  Connector,
  EmptyLogger,
  RemoteEvents,
  RemoteWindow,
  RemoteWebContents,
  RemoteConnector,
  RemoteSDK,
};
