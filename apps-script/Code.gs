/**
 * Kesher-4U — מוקד שירות ותקלות
 * שרת Google Apps Script. הנתונים נשמרים בגיליון Google Sheets ב־Drive של בעל המערכת.
 *
 * גיליונות:
 *   קריאות          שורה לכל קריאה (עמודות קריאות + עמודות טכניות מוסתרות)
 *   מדווחים         שורה לכל מדווח
 *   יומן שינויים    שורה לכל פעולה: יצירה / עדכון / מחיקה (לא נמחק לעולם)
 *
 * הפעלה ראשונה: בוחרים את הפונקציה setup ולוחצים Run (ראו README).
 */

var SHEETS = { tickets: 'קריאות', customers: 'מדווחים', audit: 'יומן שינויים' };
var COLS = {
  tickets: ['מס׳ קריאה', 'נושא', 'תת־נושא', 'מתחם', 'מבנה', 'פירוט מיקום', 'מועד אירוע', 'בוקר/ערב',
            'תיאור קצר', 'פירוט', 'סטטוס', 'דחיפות', 'נציג מטפל', 'מדווח', 'התקבל דרך',
            'נפתחה', 'עודכנה', 'יעד', 'נסגרה', 'זמן טיפול (שעות)', 'יומן טיפול'],
  customers: ['שם', 'טלפון', 'יחידה / מחלקה', 'מייל', 'הערות'],
};
var DATE_COLS = { tickets: ['מועד אירוע', 'נפתחה', 'עודכנה', 'יעד', 'נסגרה'], customers: [] };
var AUDIT_COLS = ['מועד', 'פעולה', 'סוג', 'מס׳ קריאה', 'מזהה', 'בוצע ע״י', 'סטטוס', 'נתונים (JSON)'];
var TECH = ['id', 'updated', 'deleted', 'json'];          // עמודות טכניות — מוסתרות, לא לערוך ידנית
var ST = ['חדשה', 'בטיפול', 'ממתינה למדווח', 'סגורה'];
var PR = ['נמוכה', 'רגילה', 'גבוהה', 'דחופה'];
var CH = ['טלפון', 'מכשיר קשר', 'מייל', 'וואטסאפ', 'פנייה אישית', 'דיווח עצמי באתר'];
var REPORT_LIMIT = 40;            // מקסימום דיווחים מהדף הציבורי ב־10 דקות (הגנה מהצפה)
var TZ = 'Asia/Jerusalem';
var BACKUP_FOLDER = 'Kesher-4U גיבויים';
var BACKUP_KEEP_DAYS = 90;
var OVERLAP_MS = 5000;

/* ------------------------------------------------------------------ */
/* Web app                                                             */
/* ------------------------------------------------------------------ */
function doGet() {
  var t;
  try { t = HtmlService.createTemplateFromFile('Index'); }
  catch (e) { return HtmlService.createHtmlOutput('<p dir="rtl" style="font:18px sans-serif">שרת Kesher-4U פעיל ✓ — האתר עצמו נמצא בכתובת של Render.</p>').setTitle('Kesher-4U'); }
  t.cfg = JSON.stringify({ TOP: TOP, SITES: SITES, SLOT: SLOT, OUT: OUT }).replace(/</g, '\\u003c');
  return t.evaluate()
    .setTitle('Kesher-4U · מוקד שירות')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

// API לאתר שמתארח ב־Render (Static Site): POST עם {fn, args}
function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents);
    var fns = { apiConfig: apiConfig, apiSync: apiSync, apiPut: apiPut, apiDel: apiDel, apiReport: apiReport };
    if (!fns.hasOwnProperty(req.fn)) throw new Error('unknown function');
    out = { ok: true, result: fns[req.fn].apply(null, Array.isArray(req.args) ? req.args : []) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

// הרשימות (נושאים, מתחמים) — לא כוללות נתונים אישיים
function apiConfig() { return { TOP: TOP, SITES: SITES, SLOT: SLOT, OUT: OUT }; }

/* ------------------------------------------------------------------ */
/* Setup (run once from the editor)                                    */
/* ------------------------------------------------------------------ */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    var id = props.getProperty('SHEET_ID');
    if (!id) throw new Error('הסקריפט צריך להיות מחובר לגיליון: פתחו את הגיליון → תוספים (Extensions) → Apps Script, והדביקו שם את הקוד.');
    ss = SpreadsheetApp.openById(id);
  }
  props.setProperty('SHEET_ID', ss.getId());
  ss.setSpreadsheetTimeZone(TZ);
  ['tickets', 'customers'].forEach(function (col) { ensureSheet_(ss, col); });
  ensureAudit_(ss);
  // מוחקים את הגיליון הריק שנוצר עם הקובץ
  ss.getSheets().forEach(function (sh) {
    var n = sh.getName();
    if (n !== SHEETS.tickets && n !== SHEETS.customers && n !== SHEETS.audit && sh.getLastRow() === 0 && ss.getSheets().length > 3) ss.deleteSheet(sh);
  });
  // גיבוי לילי
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'dailyBackup'; });
  if (!has) ScriptApp.newTrigger('dailyBackup').timeBased().everyDays(1).atHour(2).inTimezone(TZ).create();
  bump_();
  Logger.log('מוכן. גיליון הנתונים: ' + ss.getUrl());
  Logger.log(props.getProperty('APP_PASSWORD') ? 'סיסמת כניסה: מוגדרת' : 'חובה להגדיר סיסמה: Project Settings → Script properties → APP_PASSWORD. עד אז האתר לא יציג נתונים.');
}

function ensureSheet_(ss, col) {
  var name = SHEETS[col], sh = ss.getSheetByName(name);
  var head = COLS[col].concat(TECH);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#10202a').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  sh.setRightToLeft(true);
  sh.hideColumns(COLS[col].length + 1, TECH.length);
  DATE_COLS[col].forEach(function (c) {
    sh.getRange(2, COLS[col].indexOf(c) + 1, sh.getMaxRows() - 1, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  });
  return sh;
}

function ensureAudit_(ss) {
  var sh = ss.getSheetByName(SHEETS.audit);
  if (!sh) sh = ss.insertSheet(SHEETS.audit);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, AUDIT_COLS.length).setValues([AUDIT_COLS]).setFontWeight('bold').setBackground('#10202a').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange(2, 1, sh.getMaxRows() - 1, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
    var p = sh.protect().setDescription('יומן שינויים — רק לקריאה');
    p.setWarningOnly(true);
  }
  sh.setRightToLeft(true);
  return sh;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}
function sheet_(col) {
  var ss = ss_(), sh = ss.getSheetByName(SHEETS[col]);
  return sh || ensureSheet_(ss, col);
}
function authOk_(token) {           // בלי סיסמה מוגדרת — אין גישה לנתונים בכלל
  var p = PropertiesService.getScriptProperties().getProperty('APP_PASSWORD');
  return !!p && typeof token === 'string' && token === p;
}
function denied_() {
  return { auth: false, setup: !PropertiesService.getScriptProperties().getProperty('APP_PASSWORD') };
}
function txt_(v) {                       // טקסט נשמר כטקסט (בלי נוסחאות, בלי איבוד 0 מוביל)
  if (v === null || v === undefined || v === '') return '';
  return "'" + String(v);
}
function date_(ms) { return ms ? new Date(Number(ms)) : ''; }
function fmt_(ms) { return ms ? Utilities.formatDate(new Date(Number(ms)), TZ, 'dd/MM/yyyy HH:mm') : ''; }
function topicName_(k) {
  for (var i = 0; i < TOP.length; i++) if (TOP[i].k === k) return TOP[i].n;
  return k || '';
}
function actor_(a) {
  var s = String(a || '').slice(0, 80);
  if (!s) { try { s = Session.getActiveUser().getEmail(); } catch (e) {} }
  return s;
}
function bump_() {
  var v = String(Date.now());
  PropertiesService.getScriptProperties().setProperty('VER', v);
  CacheService.getScriptCache().put('ver', v, 21600);
}
function ver_() {
  var v = CacheService.getScriptCache().get('ver');
  if (!v) { v = PropertiesService.getScriptProperties().getProperty('VER') || '0'; CacheService.getScriptCache().put('ver', v, 21600); }
  return Number(v);
}
function readable_(col, d) {
  if (col === 'customers') return [txt_(d.name), txt_(d.phone), txt_(d.company), txt_(d.email), txt_(d.notes)];
  var log = (d.log || []).map(function (l) { return fmt_(l.at) + ' · ' + (l.by || '') + ': ' + (l.text || ''); }).join('\n');
  return [
    Number(d.num) || '', txt_(topicName_(d.topic)), txt_(d.sub), txt_(d.site), txt_(d.bldg), txt_(d.location),
    date_(d.eventAt), txt_(d.slot), txt_(d.title), txt_(d.desc),
    txt_(ST[d.status] !== undefined ? ST[d.status] : ''), txt_(PR[d.priority] !== undefined ? PR[d.priority] : ''),
    txt_(d.assignee), txt_(d.custName), txt_(CH[d.channel] !== undefined ? CH[d.channel] : ''),
    date_(d.created), date_(d.updated), date_(d.due), date_(d.closed),
    d.closed && d.created ? Math.round((d.closed - d.created) / 36e5 * 10) / 10 : '',
    txt_(log.slice(0, 45000)),
  ];
}
function findRow_(sh, col, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var idCol = COLS[col].length + 1;
  var ids = sh.getRange(2, idCol, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return 0;
}
function audit_(action, col, id, actor, d) {
  var labels = { create: 'יצירה', update: 'עדכון', delete: 'מחיקה' };
  ss_().getSheetByName(SHEETS.audit).appendRow([
    new Date(), labels[action] || action, col === 'tickets' ? 'קריאה' : 'מדווח', Number(d.num) || '', txt_(id), txt_(actor),
    txt_(col === 'tickets' && ST[d.status] !== undefined ? ST[d.status] : ''), txt_(JSON.stringify(d).slice(0, 49000)),
  ]);
}
function check_(col, id) {
  if (!SHEETS.hasOwnProperty(col) || col === 'audit') throw new Error('סוג רשומה לא תקין');
  if (typeof id !== 'string' || !/^[\w.~:@+-]{1,128}$/.test(id)) throw new Error('מזהה לא תקין');
}

/* ------------------------------------------------------------------ */
/* API — called from the page with google.script.run                   */
/* ------------------------------------------------------------------ */
function apiSync(token, since) {
  if (!authOk_(token)) return denied_();
  var now = Date.now();
  since = Number(since) || 0;
  if (since && ver_() < since - OVERLAP_MS) return { now: now, docs: [] };   // אין שינויים — בלי לקרוא את הגיליון
  var docs = [];
  ['tickets', 'customers'].forEach(function (col) {
    var sh = sheet_(col), last = sh.getLastRow();
    if (last < 2) return;
    var base = COLS[col].length + 1;
    var rows = sh.getRange(2, base, last - 1, TECH.length).getValues();
    rows.forEach(function (r) {
      var id = String(r[0]), upd = Number(r[1]) || 0, del = r[2] === true || r[2] === 'TRUE';
      if (!id) return;
      if (since ? upd > since - OVERLAP_MS : !del) {
        var data;
        if (!del) { try { data = JSON.parse(r[3]); } catch (e) { return; } }
        docs.push({ col: col, id: id, deleted: del, data: data });
      }
    });
  });
  var res = { now: now, docs: docs };
  if (!since) res.sheetUrl = ss_().getUrl();
  return res;
}

function apiPut(token, col, id, data, actor) {
  if (!authOk_(token)) return denied_();
  check_(col, id);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('נתונים לא תקינים');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { put_(col, id, data, actor_(actor)); SpreadsheetApp.flush(); bump_(); }
  finally { lock.releaseLock(); }
  return { ok: true };
}

// כתיבה לגיליון + יומן שינויים. נקרא רק כשהנעילה מוחזקת.
function put_(col, id, data, actor) {
  delete data.id;
  var json = JSON.stringify(data);
  if (json.length > 49000) throw new Error('הרשומה ארוכה מדי');
  var sh = sheet_(col), row = findRow_(sh, col, id), t = Date.now();
  var values = readable_(col, data).concat([txt_(id), t, false, txt_(json)]);
  if (row) {
    var wasDeleted = sh.getRange(row, COLS[col].length + 3).getValue() === true;
    sh.getRange(row, 1, 1, values.length).setValues([values]).setFontLine('none').setFontColor(null);
    audit_(wasDeleted ? 'create' : 'update', col, id, actor, data);
  } else {
    sh.appendRow(values);
    audit_('create', col, id, actor, data);
  }
}

/* ------------------------------------------------------------------ */
/* Public reporting page: create-only, no password, strict validation  */
/* ------------------------------------------------------------------ */
function apiReport(token, r) {
  if (!PropertiesService.getScriptProperties().getProperty('APP_PASSWORD')) throw new Error('המערכת עוד לא הוגדרה');
  if (!r || typeof r !== 'object') throw new Error('נתונים לא תקינים');
  var str = function (v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max); };
  var T = null;
  for (var i = 0; i < TOP.length; i++) if (TOP[i].k === r.topic) T = TOP[i];
  if (!T) throw new Error('נושא לא תקין');
  var sub = str(r.sub, 120);
  if (T.s.indexOf(sub) < 0) throw new Error('תת־נושא לא תקין');
  var site = str(r.site, 40), bldg = str(r.bldg, 80);
  if (site && !SITES.hasOwnProperty(site)) throw new Error('מתחם לא תקין');
  if (bldg && (!site || SITES[site].indexOf(bldg) < 0)) throw new Error('מבנה לא תקין');
  var ev = !!T.ev, out = ev && sub === OUT;
  if (!ev && (!site || !bldg)) throw new Error('חסר מיקום');
  if (out && !site) throw new Error('חסר מתחם');
  var eventAt = 0, slot = '';
  if (ev) {
    slot = str(r.slot, 10);
    if (!SLOT.hasOwnProperty(slot) || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.evDate))) throw new Error('חסר מועד האירוע');
    var p = String(r.evDate).split('-');
    eventAt = Utilities.parseDate(p[0] + '-' + p[1] + '-' + p[2] + ' ' + ('0' + SLOT[slot]).slice(-2) + ':00', TZ, 'yyyy-MM-dd HH:mm').getTime();
    if (eventAt < Date.now() - 864e5) throw new Error('תאריך האירוע עבר');
  }
  var name = str(r.rName, 80), phone = str(r.rPhone, 30), unit = str(r.rUnit, 80);
  if (!name || phone.replace(/\D/g, '').length < 9) throw new Error('חסרים פרטי מדווח');
  var pri = Number(r.priority); if (!(pri >= 0 && pri <= 3)) pri = 1; pri = Math.floor(pri);

  // הגנה מהצפה: מונה גלובלי לחלון של 10 דקות
  var cache = CacheService.getScriptCache(), win = 'rl' + Math.floor(Date.now() / 6e5);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var cnt = Number(cache.get(win) || 0);
    if (cnt >= REPORT_LIMIT) throw new Error('עומס — נסו שוב בעוד כמה דקות');
    cache.put(win, String(cnt + 1), 900);

    // מדווח: לפי טלפון, אחרת חדש
    var csh = sheet_('customers'), cid = '', dig = phone.replace(/\D/g, '');
    var last = csh.getLastRow();
    if (last >= 2) {
      var rows = csh.getRange(2, COLS.customers.length + 1, last - 1, TECH.length).getValues();
      for (var j = 0; j < rows.length && !cid; j++) {
        if (rows[j][2] === true) continue;
        try { var cd = JSON.parse(rows[j][3]); if (String(cd.phone || '').replace(/\D/g, '') === dig) cid = String(rows[j][0]); } catch (e) {}
      }
    }
    var now = Date.now();
    if (!cid) { cid = 'c' + now.toString(36) + Math.random().toString(36).slice(2, 6); put_('customers', cid, { name: name, phone: phone, company: unit, email: '', notes: '', created: now }, name); }

    // מספר קריאה רץ
    var tsh = sheet_('tickets'), tl = tsh.getLastRow(), num = 1000;
    if (tl >= 2) tsh.getRange(2, 1, tl - 1, 1).getValues().forEach(function (x) { var n = Number(x[0]); if (n > num) num = n; });
    num += 1;
    var id = 't' + now.toString(36) + Math.random().toString(36).slice(2, 6);
    put_('tickets', id, {
      num: num, topic: T.k, sub: sub, title: str(r.title, 120) || (ev ? T.n + ' · ' + sub : sub),
      site: site, bldg: ev && !out ? '' : bldg, location: str(r.location, 200), eventAt: eventAt, slot: slot,
      custId: cid, custName: name, channel: 5, priority: pri, status: 0, assignee: '', desc: str(r.desc, 3000),
      created: now, updated: now, due: ev ? eventAt : now + [168, 72, 24, 4][pri] * 36e5, closed: 0,
      log: [{ at: now, by: name, sys: 1, text: 'הקריאה נפתחה בדף הדיווח' }],
    }, name + ' (דף הדיווח)');
    SpreadsheetApp.flush();
    bump_();
  } finally { lock.releaseLock(); }
  return { ok: true, num: num };
}

function apiDel(token, col, id, actor) {
  if (!authOk_(token)) return denied_();
  check_(col, id);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_(col), row = findRow_(sh, col, id);
    if (!row) return { ok: true };
    var base = COLS[col].length;
    var tech = sh.getRange(row, base + 1, 1, TECH.length).getValues()[0];
    if (tech[2] === true) return { ok: true };
    var data = {};
    try { data = JSON.parse(tech[3]); } catch (e) {}
    sh.getRange(row, base + 2, 1, 2).setValues([[Date.now(), true]]);
    if (col === 'tickets') sh.getRange(row, COLS.tickets.indexOf('סטטוס') + 1).setValue('נמחקה');
    sh.getRange(row, 1, 1, base).setFontLine('line-through').setFontColor('#8a8a8a');
    audit_('delete', col, id, actor_(actor), data);
    SpreadsheetApp.flush();
    bump_();
  } finally { lock.releaseLock(); }
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Nightly backup: a dated copy of the spreadsheet in Drive            */
/* ------------------------------------------------------------------ */
function dailyBackup() {
  var src = DriveApp.getFileById(ss_().getId());
  // תיקיית הגיבויים נוצרת ליד הגיליון (למשל בתוך KESHER 4U)
  var parents = src.getParents(), home = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var it = home.getFoldersByName(BACKUP_FOLDER);
  var folder = it.hasNext() ? it.next() : home.createFolder(BACKUP_FOLDER);
  src.makeCopy('Kesher-4U גיבוי ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), folder);
  var cutoff = Date.now() - BACKUP_KEEP_DAYS * 864e5, files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    if (f.getDateCreated().getTime() < cutoff) f.setTrashed(true);
  }
}
