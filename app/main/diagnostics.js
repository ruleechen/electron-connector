const { appSettings } = require('./settings');
const brandInfo = require('../brand');

class Diagnostics {
  constructor({
    brand,
  }) {
    this._brand = brand;
  }

  break() {
    // eslint-disable-next-line no-debugger, no-restricted-syntax
    debugger;
  }

  get isDevRun() {
    return process.argv.includes('--rc-dev-run'); // || isDev;
  }

  get isInspect() {
    return appSettings.get('inspect') === true;
  }

  get inspectPort() {
    return appSettings.get('inspectPort');
  }

  get env() {
    const env = appSettings.get('env');
    if (this._brand.buildEnvs.includes(env)) { // validate
      return env;
    }
    return this._brand.buildEnv;
  }
}

module.exports = new Diagnostics({
  brand: brandInfo,
});
