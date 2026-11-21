// מייצר את apps-script/Index.html מתוך web/index.html (אותו ממשק, מוגש ישירות מ־Apps Script).
// הרצה: node scripts/build-gas.js — אחרי כל שינוי ב־web/index.html
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'web', 'index.html'), 'utf8');
const tag = '<script src="settings.js"></script>';
if (!html.includes(tag)) throw new Error('settings.js tag not found');
if (html.replace(tag, '').includes('<?')) throw new Error('"<?" is reserved by Apps Script templates');
html = html.replace(tag, "<script>var API_URL='';var CFG=<?!= cfg ?>;var TOP=CFG.TOP,SITES=CFG.SITES,SLOT=CFG.SLOT,OUT=CFG.OUT;</script>");
fs.writeFileSync(path.join(root, 'apps-script', 'Index.html'), html);
console.log('apps-script/Index.html updated');
