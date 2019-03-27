const path = require('path');
const electron = require('electron');

function initPreload({
  logger,
}) {
  function prependPreload(session) {
    const preload = path.resolve(__dirname, './preload.js');
    const preloads = session.getPreloads();
    if (!preloads.includes(preload)) {
      preloads.unshift(preload);
      session.setPreloads(preloads);
      logger.log('[preload] prepended');
    }
  }

  electron.app.on('session-created', (ev, session) => {
    if (session) {
      prependPreload(session);
    }
  });

  prependPreload(electron.session.defaultSession);
}

module.exports = initPreload;
