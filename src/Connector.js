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
      buildEnv: 'dev',
      buildEnvs: [
        'dev',
        'test',
        'prod',
      ],
    };
  }

  get appPath() {
    return path.resolve(__dirname, '../app');
  }

  get brandInfoPath() {
    return path.resolve(this.appPath, './brand.json')
  }

  get brandInfo() {
    return this._brandInfo;
  }

  install() {
    const cmd = `cd '${this.appPath}' && yarn install`;
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
    if (!Array.isArray(brandInfo.buildEnvs)) {
      throw new Error('buildEnvs is incorrect');
    }
    if (!brandInfo.buildEnv) {
      throw new Error('buildEnv is required');
    }
    this._brandInfo = brandInfo;
    // clear
    fse.ensureDirSync(this.appPath);
    del.sync([this.brandInfoPath]);
    // build
    fse.writeFileSync(
      this.brandInfoPath,
      JSON.stringify(this._brandInfo, null, 2)
    );
  }
}

module.exports = Connector;
