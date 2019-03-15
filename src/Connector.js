const path = require('path');
const del = require('del');
const fse = require('fs-extra');
const cp = require('child_process');

class Connector {
  constructor(brand) {
    this.brading(brand);
    this._logger = console;
  }

  get src() {
    return path.resolve(__dirname, '../app');
  }

  get brandDest() {
    return path.resolve(this.src, './brand.json')
  }

  get brandInfo() {
    return this._brandInfo;
  }

  brading({
    applicationId = 'com.electronconnector.default',
    localServerPort = 13110,
    remoteServerPort = 13111,
  } = {}) {
    // merge
    const brandInfo = Object.assign(this._brandInfo || {}, {
      applicationId,
      localServerPort,
      remoteServerPort,
    });
    // verify
    if (!brandInfo.applicationId) {
      throw new Error('applicationId is required');
    }
    if (!brandInfo.localServerPort) {
      throw new Error('localServerPort is required');
    }
    if (!brandInfo.remoteServerPort) {
      throw new Error('remoteServerPort is required');
    }
    // set
    this._brandInfo = brandInfo;
  }

  install() {
    // install
    const cmd = `cd ${this.src} && yarn install`;
    cp.execSync(cmd, { stdio: 'inherit' });
    this._logger.log('[Connector] yarn installed');
    // clear
    fse.ensureDirSync(this.src);
    del.sync([this.brandDest], { force: true });
    // build
    fse.writeFileSync(
      this.brandDest,
      JSON.stringify(this._brandInfo, null, 2)
    );
    this._logger.log('[Connector] brand saved');
  }
}

module.exports = Connector;
