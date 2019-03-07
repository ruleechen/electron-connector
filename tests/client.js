const fs = require('fs');
const path = require('path');
const sdk = require('./sdk');

//---------------------------------------------------------------------

const isMainWindowScript = `
function() {
  const isMainWindow = (location.pathname === '/_');
  return {
    isMainWindow,
  };
}()
`;

const insertHtmlScript = `
  function appendHtml(el, html) {
    const temp = document.createElement('div');
    temp.style.display = 'none';
    temp.innerHTML = html;
    while (temp.firstChild) {
      el.appendChild(temp.firstChild);
    }
  }
  appendHtml(document.body, '<div id="viewport" style="position: absolute; bottom: 20px; right: 20px; width: 300px; height: 500px;"></div>');
`;
const filePath = path.resolve(__dirname, './rcphone.js');
const phoneScript = fs.readFileSync(filePath, { encoding: 'utf8' });

sdk.getWindows()
  .then((wins) => (
    Promise.all([
      wins[0]
        .inspect()
        .then((res) => {
          console.log(res);
        }),

      wins[0]
        .runQuery(isMainWindowScript)
        .then((res) => {
          console.log(res);
        }),

      wins[0]
        .executeScript(insertHtmlScript)
        .then(() => (
          wins[0].executeScript(phoneScript)
        ))
        .then((res) => {
          console.log(res);
        }),
    ])
  ))
  .catch((err) => {
    console.error(err);
  });
