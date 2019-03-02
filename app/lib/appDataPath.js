/*
The expected result is:
OS X - '/Users/user/Library/Application Support'
Windows 8 - 'C:\Users\user\AppData\Roaming'
Windows XP - 'C:\Documents and Settings\user\Application Data'
Linux - '/home/user/.local/share'
*/

const path = require('path');

module.exports = function () {
  return process.env.APPDATA || path.resolve(
    process.env.HOME,
    process.platform === 'darwin'
      ? './Library/Application Support'
      : './.local/share'
  );
};
