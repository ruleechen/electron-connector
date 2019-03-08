const sdk = require('./sdk');

//---------------------------------------------------------------------

sdk.on('heartbeat', ({
  resolve,
  payload,
}) => {
  console.log('heartbeat', payload);
  resolve();
});

sdk.ipcServer.start();
