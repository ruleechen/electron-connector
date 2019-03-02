const log = require('electron-log');
const brand = require('../brand');
const diagnostics = require('./diagnostics');

const logLevel = (
  diagnostics.isDevRun
  || diagnostics.isInspect
  || diagnostics.env !== 'prod'
) ? 'debug' : 'info';

// https://github.com/megahertz/electron-log/blob/HEAD/doc/file.md
log.transports.console.level = logLevel;
log.transports.file.level = logLevel;
log.transports.file.fileName = 'injection.log';
log.transports.file.appName = brand.brandAppId;

module.exports = log;
