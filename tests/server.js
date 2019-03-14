const connector = require('./connector');

connector.ipcServer.on('heartbeat', ({
  resolve,
  payload,
}) => {
  console.log('heartbeat', payload);
  resolve();
});

connector.getWindows()
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

connector.ipcServer.start();
