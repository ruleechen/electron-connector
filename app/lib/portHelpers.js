const net = require('net');

function isPortTaken(port) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer()
      .once('error', (err) => {
        if (err.code != 'EADDRINUSE') {
          reject(err);
          return;
        }
        resolve(true);
      })
      .once('listening', () => {
        tester.once('close', () => {
          resolve(false);
        }).close();
      })
      .listen(port);
  });
}

function portAvailable(startPort) {
  return isPortTaken(startPort).then((taken) => {
    if (taken) {
      return portAvailable(startPort + 1);
    } else {
      return Promise.resolve(startPort);
    }
  }).catch(() => {
    return portAvailable(startPort + 1);
  });
}

module.exports = {
  isPortTaken,
  portAvailable,
};
