const path = require('path');
const Store = require('electron-store');
const dataPath = require('../lib/dataPath');
const brand = require('../brand');

let _appSettings;
module.exports = {
  get appSettings() {
    if (!_appSettings) {
      const settingsPath = path.resolve(dataPath(), `./${brand.applicationId}/settings`);
      _appSettings = new Store({
        cwd: settingsPath,
        name: 'app',
      });
    }
    return _appSettings;
  }
};
