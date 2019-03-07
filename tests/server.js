const sdk = require('./sdk');

//---------------------------------------------------------------------

sdk.on('heartbeat', ({
  resolve,
  payload,
}) => {
  console.log('heartbeat --------------------');
  console.log(payload);
  resolve();
});

sdk.ipcServer.start();
