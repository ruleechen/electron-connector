try {
  const _ec_electron = require('electron');
  process.once('loaded', function () {
    try {
      if (typeof (window) !== 'undefined') {
        window._ec_electron = _ec_electron;
        window._ec_ipcRenderer = _ec_electron.ipcRenderer;
      }
    } catch (ex) {
      console.error('[preload]', ex);
    }
    try {
      if (typeof (global) !== 'undefined') {
        global._ec_electron = _ec_electron;
        global._ec_ipcRenderer = _ec_electron.ipcRenderer;
      }
    } catch (ex) {
      console.error('[preload]', ex);
    }
  });
} catch (ex) {
  console.error('[preload]', ex);
}
