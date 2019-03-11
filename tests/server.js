const sdk = require('./sdk');

sdk.ipcServer.on('heartbeat', ({
  resolve,
  payload,
}) => {
  console.log('heartbeat', payload);
  resolve();
});

sdk.ipcServer.start();
