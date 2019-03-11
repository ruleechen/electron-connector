const os = require('os');
const path = require('path');
const asar = require('asar');
const del = require('del');
const fse = require('fs-extra');
const Connector = require('./Connector');

const backupNamePostfix = '_ecbak';
const appBuildDirName = 'ec-asar';
const proxyFileTemplate = path.resolve(__dirname, './proxy.js');

const defaultAsarUnpack = '**/node_modules/**/*.+(dll|node)';
const defaultProxyNameDest = 'ec-proxy.js';

class AsarInjector {
  constructor({
    archive,
    buildDir = os.tmpdir(),
    asarUnpack = defaultAsarUnpack,
    proxyNameDest = defaultProxyNameDest,
  }) {
    if (!fse.existsSync(archive)) {
      throw new Error('Can not found asar archive');
    }
    const isBak = AsarInjector.isBackupFile(archive);
    this._asarSrc = AsarInjector.getAsarDest(archive, isBak);
    this._asarBakSrc = AsarInjector.getAsarBakDest(archive, isBak);
    this._appBuildDir = AsarInjector.getAppDir(archive, path.resolve(buildDir, `./${appBuildDirName}`));
    this._asarUnpack = asarUnpack;
    this._proxyNameDest = proxyNameDest;
  }

  static isBackupFile(archive) {
    const ext = path.extname(archive);
    const baseName = path.basename(archive, ext);
    return baseName.endsWith(backupNamePostfix);
  }

  static getAppDir(archive, baseDir) {
    const ext = path.extname(archive);
    let baseName = path.basename(archive, ext);
    if (baseName.endsWith(backupNamePostfix)) {
      baseName = baseName.substring(0, baseName.length - backupNamePostfix.length);
    }
    const appDir = path.resolve(baseDir, baseName);
    return appDir;
  }

  static getAsarDest(archive, isBak) {
    if (!isBak) {
      return archive;
    }
    const ext = path.extname(archive);
    const appDir = AsarInjector.getAppDir(archive, path.dirname(archive));
    return `${appDir}${ext}`;
  }

  static getAsarBakDest(archive, isBak) {
    if (isBak) {
      return archive;
    }
    const ext = path.extname(archive);
    const appDir = AsarInjector.getAppDir(archive, path.dirname(archive));
    return `${appDir}${backupNamePostfix}${ext}`;
  }

  backup() {
    if (!fse.existsSync(this._asarBakSrc)) {
      // By default, dest is overwritten
      fse.copyFileSync(this._asarSrc, this._asarBakSrc);
    }
  }

  recover() {
    if (fse.existsSync(this._asarBakSrc)) {
      // By default, dest is overwritten
      fse.copyFileSync(this._asarBakSrc, this._asarSrc);
    }
  }

  inject(injectionSrc) {
    return new Promise((resolve, reject) => {
      // recover if backup available
      this.recover();

      // extract asar
      del.sync([this._appBuildDir], { force: true });
      asar.extractAll(this._asarSrc, this._appBuildDir);

      // detect proxy entry
      const packageJsonFile = path.resolve(this._appBuildDir, './package.json');
      const packageJson = require(packageJsonFile);
      if (packageJson.main === this._proxyNameDest) {
        reject(new Error(`Proxy entry already exists '${packageJson.main}'`));
        return;
      }

      // proxy content 1
      let proxyContent = fse.readFileSync(proxyFileTemplate, { encoding: 'utf8' });
      proxyContent = proxyContent.replace('{mainfile}', packageJson.main);

      // proxy content 2
      const injectionBaseName = `ec_${path.basename(injectionSrc)}`;
      const injectionLine = `require('./${injectionBaseName}');`
      if (proxyContent.toLowerCase().indexOf(injectionLine.toLowerCase()) === -1) {
        proxyContent += `${injectionLine}${os.EOL}`;
      }

      // detect proxy file dest
      const proxyFileDest = path.resolve(this._appBuildDir, `./${this._proxyNameDest}`);
      if (fse.existsSync(proxyFileDest)) {
        reject(new Error(`Proxy file already exists '${this._proxyNameDest}'`));
        return;
      }

      // detect injection dest
      const injectionDest = path.resolve(this._appBuildDir, `./${injectionBaseName}`);
      if (fse.pathExistsSync(injectionDest)) {
        reject(new Error(`Injection source already exists '${injectionBaseName}'`));
        return;
      }

      // apply (proxy + injection)
      fse.writeFileSync(proxyFileDest, proxyContent);
      fse.copySync(injectionSrc, injectionDest, { recursive: true, overwrite: true });

      // update main
      packageJson.main = this._proxyNameDest;
      fse.writeFileSync(packageJsonFile, JSON.stringify(packageJson, null, 2), { overwrite: true });

      // backup if needed
      this.backup();

      // pack asar
      del.sync([this._asarSrc], { force: true });
      asar.createPackageWithOptions(this._appBuildDir, this._asarSrc, {
        // https://github.com/electron/asar/blob/2ec15c1c4537842bdd488a5006bfdee13808fafc/lib/asar.js
        // https://www.npmjs.com/package/minimatch
        unpack: this._asarUnpack,
      }, (err) => {
        if (err) {
          this.recover();
          reject(err);
          return;
        }
        resolve({
          asar: this._asarSrc,
          build: this._appBuildDir,
          injected: injectionSrc,
        });
      });
    });
  }

  injectConnector(connector) {
    if (!(connector instanceof Connector)) {
      throw new Error('connector type incorrect');
    }
    connector.install();
    return this.inject(connector.src);
  }
}

module.exports = AsarInjector;
