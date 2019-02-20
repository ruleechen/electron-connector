const AsarInjector = require('../src/AsarInjector');

const archive = 'C:/Users/rulee.chen/AppData/Local/Microsoft/Teams/current/resources/app.asar';

const injector = new AsarInjector({
  archive,
});

injector.inject();
