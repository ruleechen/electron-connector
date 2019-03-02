const path = require('path');
const Store = require('electron-store');
const appDataPath = require('../lib/appDataPath');
const brand = require('../brand');

let _appSettings;
module.exports = {
  get appSettings() {
    if (!_appSettings) {
      const settingsPath = path.resolve(appDataPath(), `./${brand.brandAppId}/settings`);
      _appSettings = new Store({
        cwd: settingsPath,
        name: 'app',
      });
    }
    return _appSettings;
  }
};
