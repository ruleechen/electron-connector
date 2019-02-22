const electron = require("electron");

electron.app.on('ready', () => {
    setInterval(() => {
        const allWindows = electron.BrowserWindow.getAllWindows();
        allWindows.forEach((win) => {
            if (!win || win.isDestroyed()) {
                return;
            }
            if (win.webContents) {
                if (!win.webContents.__ddd) {
                    win.webContents.__ddd = true;
                    win.webContents.openDevTools({
                        mode: 'detach',
                    });
                }
                win.webContents.executeJavaScript(`
                    var rcBtn = document.querySelector('#rc-btn');
                    if (!rcBtn) {
                        var btnWrappers = document.querySelectorAll('.start-call-buttons-wrapper');
                        if (btnWrappers.length === 1) {
                            var rcBtn = document.createElement('div');
                            rcBtn.setAttribute('id', 'rc-btn');
                            rcBtn.innerHTML = '<button type="button" class="ts-sym app-title-bar-button icons-call inset-border inset-border-round calling-sharing-panel-dialog">RCV</button>';
                            rcBtn.addEventListener('click', function() {
                                alert('start RCV');
                            });
                            var btnWrapper = btnWrappers[0];
                            if (btnWrapper.firstChild) {
                                btnWrapper.insertBefore(rcBtn, btnWrapper.firstChild);
                            } else {
                                btnWrapper.appendChild(rcBtn);
                            }
                        }
                    }
                `);
            }
        });
    }, 1024);
});
