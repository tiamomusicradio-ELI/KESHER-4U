// בדיקת תחביר ורשימות — רץ אוטומטית ב־GitHub בכל שינוי
const fs = require('fs'), path = require('path'), vm = require('vm');
const r = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
new vm.Script(r('apps-script/Config.gs'), { filename: 'Config.gs' });
new vm.Script(r('apps-script/Code.gs'), { filename: 'Code.gs' });
new vm.Script(r('web/settings.js'), { filename: 'settings.js' });
[...r('web/index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m, i) => new vm.Script(m[1], { filename: 'index.html#' + i }));
const ctx = {}; vm.runInNewContext(r('apps-script/Config.gs') + ';this.TOP=TOP;this.SITES=SITES;', ctx);
const keys = new Set();
for (const t of ctx.TOP) {
  if (!/^[a-z]+$/.test(t.k) || keys.has(t.k)) throw new Error('מזהה נושא לא תקין או כפול: ' + t.k);
  keys.add(t.k);
  if (new Set(t.s).size !== t.s.length) throw new Error('תת־נושא כפול: ' + t.n);
}
for (const [s, b] of Object.entries(ctx.SITES)) if (!b.length) throw new Error('מתחם ללא מבנים: ' + s);
const gas = r('apps-script/Index.html').replace(/<script>var API_URL='';var CFG=<\?!= cfg \?>[^<]*<\/script>/, '<script src="settings.js"></script>');
if (gas !== r('web/index.html')) throw new Error('apps-script/Index.html לא מעודכן — הריצו: node scripts/build-gas.js');
console.log(`OK — ${ctx.TOP.length} נושאים, ${Object.keys(ctx.SITES).length} מתחמים, ${Object.values(ctx.SITES).flat().length} מבנים`);
