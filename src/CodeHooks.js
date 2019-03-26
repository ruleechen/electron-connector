const fse = require('fs-extra');
const ndir = require('node-dir');

const preloadFlag = `process.once('loaded'`;
const preloadScript = `
  try {
    const _ec_electron = require('electron');
    process.once('loaded', function() {
      try {
        if (typeof (window) !== 'undefined') {
          window._ec_electron = _ec_electron;
          window._ec_ipcRenderer = _ec_electron.ipcRenderer;
        }
      } catch (ex) {
        // ignore
      }
      try {
        if (typeof (global) !== 'undefined') {
          global._ec_electron = _ec_electron;
          global._ec_ipcRenderer = _ec_electron.ipcRenderer;
        }
      } catch (ex) {
        // ignore
      }
    });
  } catch (ex) {
    // ignore
  }
`;

function hookPreload(dirname) {
  return new Promise((resolve) => {
    const injectFiles = [];
    ndir.readFiles(dirname, {
      match: /.js$/,
      exclude: ['node_modules']
    }, (err, content, fileName, next) => {
      if (content) {
        const flagIndex = content.indexOf(preloadFlag);
        if (flagIndex > -1) {
          const fileContent = (
            content.substr(0, flagIndex) +
            preloadScript +
            content.substr(flagIndex)
          );
          injectFiles.push({
            fileName,
            fileContent,
          });
        }
      }
      next();
    }, () => {
      injectFiles.forEach(({
        fileName,
        fileContent,
      }) => {
        // By default, dest is overwritten
        fse.writeFileSync(fileName, fileContent);
      });
      // done
      resolve();
    });
  });
}

module.exports = {
  hookPreload,
};
