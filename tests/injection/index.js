const { app, BrowserWindow } = require("electron");

app.on('ready', () => {
  setInterval(() => {
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach((win) => {
      if (!win || win.isDestroyed()) {
        return;
      }
      if (win.webContents) {
        if (!win.webContents._devToolsOpened) {
          win.webContents._devToolsOpened = true;
          win.webContents.openDevTools({
            mode: 'detach',
          });
        }
      }
    });
  }, 1024);
});
