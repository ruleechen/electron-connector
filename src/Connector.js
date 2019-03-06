const path = require('path');
const del = require('del');
const fse = require('fs-extra');
const cp = require('child_process');

class Connector {
  constructor(brand) {
    this.brading(brand);
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
    localNetworkPort = 13110,
    remoteNetworkPort = 13111,
  } = {}) {
    // merge
    const brandInfo = Object.assign(this._brandInfo || {}, {
      applicationId,
      localNetworkPort,
      remoteNetworkPort,
    });
    // verify
    if (!brandInfo.applicationId) {
      throw new Error('applicationId is required');
    }
    if (!brandInfo.localNetworkPort) {
      throw new Error('localNetworkPort is required');
    }
    if (!brandInfo.remoteNetworkPort) {
      throw new Error('remoteNetworkPort is required');
    }
    // set
    this._brandInfo = brandInfo;
  }

  install() {
    // install
    const cmd = `cd ${this.src} && yarn install`;
    cp.execSync(cmd, { stdio: 'inherit' });
    console.log('[Connector] yarn installed');
    // clear
    fse.ensureDirSync(this.src);
    del.sync([this.brandDest]);
    // build
    fse.writeFileSync(
      this.brandDest,
      JSON.stringify(this._brandInfo, null, 2)
    );
    console.log('[Connector] brand saved');
  }
}

module.exports = Connector;
