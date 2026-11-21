// בונה את שלושת הדפים מתוך מקור אחד: src/app.html
//   web/index.html        דף הדיווח לציבור (בלי סיסמה, בלי נתונים)
//   web/tech/index.html   ממשק הצוות (סיסמה)
//   apps-script/Index.html  ממשק הצוות כשנפתח ישירות מ־Apps Script
// הרצה: node scripts/build.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src', 'app.html'), 'utf8');
if (!src.includes('<!--SETTINGS-->') || !src.includes('<!--TITLE-->')) throw new Error('placeholders missing');
if (src.includes('<?')) throw new Error('"<?" is reserved by Apps Script templates');
const out = {
  'web/index.html': src.replace('<!--TITLE-->', 'Kesher-4U · דיווח תקלה')
    .replace('<!--SETTINGS-->', '<script src="settings.js"></script><script>window.K4U_MODE=\'public\'</script>'),
  'web/tech/index.html': src.replace('<!--TITLE-->', 'Kesher-4U · ממשק צוות')
    .replace('<!--SETTINGS-->', '<script src="../settings.js"></script>'),
  'apps-script/Index.html': src.replace('<!--TITLE-->', 'Kesher-4U · ממשק צוות')
    .replace('<!--SETTINGS-->', "<script>var API_URL='';var CFG=<?!= cfg ?>;var TOP=CFG.TOP,SITES=CFG.SITES,SLOT=CFG.SLOT,OUT=CFG.OUT;</script>"),
};
module.exports = out;
if (require.main === module) {
  for (const [f, html] of Object.entries(out)) { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), html); }
  console.log('built:', Object.keys(out).join(', '));
}
