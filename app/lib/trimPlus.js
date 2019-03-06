// https://stackoverflow.com/questions/36390853/how-to-remove-specific-character-surrounding-a-string

function trimPlus(s, mask) {
  while (~mask.indexOf(s[0])) {
    s = s.slice(1);
  }
  while (~mask.indexOf(s[s.length - 1])) {
    s = s.slice(0, -1);
  }
  return s;
}

module.exports = trimPlus;
