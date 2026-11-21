// יוצר את docs/lists.md מתוך apps-script/Config.gs — הרצה: node scripts/gen-docs.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const cfg = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Config.gs'), 'utf8');
const c = {}; vm.runInNewContext(cfg + ';this.TOP=TOP;this.SITES=SITES;this.SLOT=SLOT;', c);
let md = '# רשימות המערכת\n\n> הקובץ נוצר אוטומטית מתוך `apps-script/Config.gs` (`node scripts/gen-docs.js`). לשינוי — ערכו את `config.js`.\n\n## סוגי קריאות\n\n';
for (const t of c.TOP) {
  md += `### ${t.n}${t.sz ? ` (${t.sz})` : ''}\n\nמזהה: \`${t.k}\`${t.ev ? ' · **נושא אירוע** — תת־הנושא הוא מקום האירוע; חובה תאריך ובוקר/ערב' : ''}\n\n`;
  md += t.s.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n\n';
}
md += '## מיקומי תקלה\n\n| מתחם | מבנים |\n|---|---|\n';
for (const [s, b] of Object.entries(c.SITES)) md += `| ${s} | ${b.join(' · ')} |\n`;
md += `\n## שעות אירוע\n\n${Object.entries(c.SLOT).map(([k, v]) => `- ${k}: ${String(v).padStart(2, '0')}:00`).join('\n')}\n`;
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'lists.md'), md);
console.log('docs/lists.md updated');
