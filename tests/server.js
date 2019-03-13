const sdk = require('./sdk');

sdk.ipcServer.on('heartbeat', ({
  resolve,
  payload,
}) => {
  console.log('heartbeat', payload);
  resolve();
});

sdk.getWindows()
  .then((wins) => {
    wins.forEach((win) => {
      win.on('close', () => {
        console.log(`[${win.title}] window closed`);
      });
    });
  })
  .catch((err) => {
    console.error(err);
  });

sdk.ipcServer.start();
