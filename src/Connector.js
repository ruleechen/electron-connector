const path = require('path');
const del = require('del');
const fse = require('fs-extra');
const cp = require('child_process');

class Connector {
  constructor({
    brand = Connector.defaultBrand,
  }) {
    this.brading(brand);
  }

  static get defaultBrand() {
    return {
      brandCode: 'ec',
      brandAppId: 'com.electronconnector.default',
      networkPort: 13110,
      buildEnv: 'dev',
      buildEnvs: [
        'dev',
        'test',
        'prod',
      ],
    };
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

  install() {
    const cmd = `cd '${this.src}' && yarn install`;
    cp.execSync(cmd, { stdio: 'inherit' });
  }

  brading(brand) {
    // merge
    const brandInfo = Object.assign(this._brandInfo || {}, brand);
    // verify
    if (!brandInfo.brandCode) {
      throw new Error('brandCode is required');
    }
    if (!brandInfo.brandAppId) {
      throw new Error('brandAppId is required');
    }
    if (!brandInfo.networkPort) {
      throw new Error('networkPort is required');
    }
    if (!Array.isArray(brandInfo.buildEnvs)) {
      throw new Error('buildEnvs is incorrect');
    }
    if (!brandInfo.buildEnv) {
      throw new Error('buildEnv is required');
    }
    this._brandInfo = brandInfo;
    // clear
    fse.ensureDirSync(this.src);
    del.sync([this.brandDest]);
    // build
    fse.writeFileSync(
      this.brandDest,
      JSON.stringify(this._brandInfo, null, 2)
    );
  }
}

module.exports = Connector;
