// Copies data/*.csv into js/data.js (the backup the page uses if the CSV files can't be read).
// Run: npm run sync-backup
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let js = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');
for (const k of ['prices', 'zips', 'settings', 'promos']) {
  const csv = fs.readFileSync(path.join(root, 'data', k + '.csv'), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n').trim().replace(/`/g, "'");
  const re = new RegExp('(    ' + k + ': `)[\\s\\S]*?(`,)');
  if (!re.test(js)) throw new Error('Could not find ' + k + ' in js/data.js');
  js = js.replace(re, (m, a, b) => a + '\n' + csv + '\n' + b);
}
fs.writeFileSync(path.join(root, 'js/data.js'), js);
console.log('js/data.js updated from data/*.csv');
