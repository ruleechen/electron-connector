const fs = require('fs');
const http = require('http');

module.exports = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    http.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          resolve();
        });
      });
    }).on('error', (err) => {
      fs.unlink(dest);
      reject(err);
    });
  });
};
