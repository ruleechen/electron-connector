const connector = require('./connector');

const mainWindowIndex = 0;

connector.getWindows()
  .then((wins) => (
    wins[mainWindowIndex].webContents.executeScript('alert("hello everyone!")')
  ))
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    console.error(err);
  });
