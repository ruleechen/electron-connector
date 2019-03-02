const EventEmitter = require('events');
const ipc = require('node-ipc');
const log = require('../logger');
const brand = require('../../brand');

class IpcServer extends EventEmitter {
  constructor({
    networkPort,
  }) {
    this._ipcId = `${brand.brandCode}-${networkPort}`;
    Object.assign(ipc.config, {
      id: this._ipcId,
      retry: 1500,
      networkPort,
      silent: true,
    });
  }

  startListener() {
    ipc.serve(() => {
      ipc.server.on('command-line', ({ commandLine }, socket) => {
        log.info(`[ipc] server received ${JSON.stringify(commandLine)}`);
        // const menuArgs = getSfbMenuArguments(commandLine);
        // this._emitCommand(menuArgs);
        ipc.server.emit(socket, 'message', {
          success: true,
        });
      });
      ipc.server.on('error', (error) => {
        log.error(`[ipc] ${error}`);
      });
    });
    ipc.server.start();
    log.info('[ipc] server started');
  }

  sendNotification({ commandLine }) {
    log.info('[ipc] start sending notification');
    ipc.connectTo(this._ipcId, () => {
      const server = ipc.of[this._ipcId];
      server.on('connect', () => {
        server.emit('command-line', {
          commandLine,
        });
        server.on('message', (data) => {
          ipc.disconnect(this._ipcId);
          log.info(`[ipc] notification sent ${JSON.stringify(data)}`);
        });
        server.on('error', (error) => {
          ipc.disconnect(this._ipcId);
          log.error(`[ipc] ${error}`);
        });
      });
    });
  }

  destroy() {
    this.removeAllListeners();
    if (ipc.server) {
      ipc.server.stop();
      log.info('[ipc] server stopped');
    }
  }

  get interProcessCommunicationId() {
    return this._ipcId;
  }
}

