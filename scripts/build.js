// בונה את שלושת הדפים מתוך מקור אחד: src/app.html
//   web/index.html        דף הדיווח לציבור (בלי סיסמה, בלי נתונים)
//   web/tech/index.html   ממשק הצוות (סיסמה)
//   apps-script/Index.html  ממשק הצוות כשנפתח ישירות מ־Apps Script
// הרצה: node scripts/build.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src', 'app.html'), 'utf8');
if (!src.includes('<!--SETTINGS-->') || !src.includes('<!--TITLE-->') || !src.includes('<!--HEAD-->')) throw new Error('placeholders missing');
if (src.includes('<?')) throw new Error('"<?" is reserved by Apps Script templates');
// אייקון לטלפון + התקנה למסך הבית (PWA)
const HEAD = (pre, title) => [
  '<link rel="manifest" href="manifest.webmanifest">',
  `<link rel="icon" type="image/png" href="${pre}icons/favicon-64.png">`,
  `<link rel="apple-touch-icon" href="${pre}icons/apple-touch-icon.png">`,
  '<meta name="theme-color" content="#10202a">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  `<meta name="apple-mobile-web-app-title" content="${title}">`,
].join('\n');
const out = {
  'web/index.html': src.replace('<!--TITLE-->', 'Kesher-4U · דיווח תקלה').replace('<!--HEAD-->', HEAD('', 'דיווח תקלה'))
    .replace('<!--SETTINGS-->', '<script src="settings.js"></script><script>window.K4U_MODE=\'public\'</script>'),
  'web/tech/index.html': src.replace('<!--TITLE-->', 'Kesher-4U · ממשק צוות').replace('<!--HEAD-->', HEAD('../', 'K4U צוות'))
    .replace('<!--SETTINGS-->', '<script src="../settings.js"></script>'),
  'apps-script/Index.html': src.replace('<!--TITLE-->', 'Kesher-4U · ממשק צוות').replace('<!--HEAD-->', '')
    .replace('<!--SETTINGS-->', "<script>var API_URL='';var CFG=<?!= cfg ?>;var TOP=CFG.TOP,SITES=CFG.SITES,SLOT=CFG.SLOT,OUT=CFG.OUT;</script>"),
};
module.exports = out;
if (require.main === module) {
  for (const [f, html] of Object.entries(out)) { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), html); }
  console.log('built:', Object.keys(out).join(', '));
}
