const path = require('path');
const asar = require('asar');
const del = require('del');
const fse = require('fs-extra');

const backupNamePostfix = '_rcbak';
const proxyFileName = 'ecproxy.js';
const injectionDirName = 'ecinjection';

const defaultBuildDir = path.resolve(__dirname, '../build');
const defaultProxyFile = path.resolve(__dirname, './proxy.js');
const defaultInjectionDir = path.resolve(__dirname, './injection');
const defaultAsarUnpack = '**/node_modules/**/*.+(dll|node)';

class AsarInjector {
  constructor({
    archive,
    buildDir = defaultBuildDir,
    proxyFile = defaultProxyFile,
    injectionDir = defaultInjectionDir,
    asarUnpack = defaultAsarUnpack,
  }) {
    if (!fse.existsSync(archive)) {
      throw new Error('Can not found asar archive');
    }
    const isBak = AsarInjector.isBackupFile(archive);
    this._asarSrc = AsarInjector.getAsarDest(archive, isBak);
    this._asarBakSrc = AsarInjector.getAsarBakDest(archive, isBak);
    this._appBuildDir = AsarInjector.getAppDir(archive, buildDir);
    this._proxyFile = proxyFile;
    this._injectionDir = injectionDir;
    this._asarUnpack = asarUnpack;
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

  inject() {
    // recover if needed
    this.recover();
    // extract
    del.sync([this._appBuildDir], { force: true });
    asar.extractAll(this._asarSrc, this._appBuildDir);
    // detect injected
    const packageJsonFile = path.resolve(this._appBuildDir, './package.json');
    const packageJson = require(packageJsonFile);
    if (packageJson.main === proxyFileName) {
      throw new Error('Error as already injected');
    }
    // write proxy file
    let proxyContent = fse.readFileSync(this._proxyFile, { encoding: 'utf8' });
    proxyContent = proxyContent.replace('{mainfile}', packageJson.main);
    proxyContent = proxyContent.replace('{injection}', injectionDirName);
    fse.writeFileSync(path.resolve(this._appBuildDir, `./${proxyFileName}`), proxyContent);
    // write injection dir
    const injectionDest = path.resolve(this._appBuildDir, `./${injectionDirName}`);
    fse.copySync(this._injectionDir, injectionDest, { recursive: true, overwrite: true });
    // update main
    packageJson.main = proxyFileName;
    fse.writeFileSync(packageJsonFile, JSON.stringify(packageJson, null, 2), { overwrite: true });
    // backup if needed
    this.backup();
    // pack asar
    return new Promise((resolve, reject) => {
      del.sync([this._asarSrc], { force: true });
      asar.createPackageWithOptions(this._appBuildDir, this._asarSrc, {
        // https://github.com/electron/asar/blob/2ec15c1c4537842bdd488a5006bfdee13808fafc/lib/asar.js
        // https://www.npmjs.com/package/minimatch
        unpack: this._asarUnpack,
      }, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve('Injected');
      });
    });
  }
}

module.exports = AsarInjector;
