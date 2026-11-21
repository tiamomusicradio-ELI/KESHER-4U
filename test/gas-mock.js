// Minimal in-memory mock of the Apps Script services used by Code.gs (for local tests only)
const vm = require('vm'), fs = require('fs'), path = require('path');
function store(v) { if (typeof v === 'string') { if (v.startsWith('=')) throw new Error('FORMULA WRITTEN: ' + v); return v.startsWith("'") ? v.slice(1) : v; } return v; }
class Range {
  constructor(sh, r, c, nr = 1, nc = 1) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) { const v = (this.sh.data[this.r - 1 + i] || [])[this.c - 1 + j]; row.push(v === undefined ? '' : v); } o.push(row); } return o; }
  getValue() { return this.getValues()[0][0]; }
  setValues(v) { if (v.length !== this.nr || v[0].length !== this.nc) throw new Error('size mismatch'); v.forEach((row, i) => row.forEach((x, j) => { const R = this.r - 1 + i; (this.sh.data[R] ||= [])[this.c - 1 + j] = store(x); })); return this; }
  setValue(x) { return this.setValues([[x]]); }
}
['setNumberFormat', 'setFontWeight', 'setBackground', 'setFontColor', 'setFontLine'].forEach(m => Range.prototype[m] = function () { return this; });
class Sheet {
  constructor(name) { this.name = name; this.data = []; }
  getName() { return this.name; }
  getLastRow() { let n = 0; this.data.forEach((r, i) => { if (r && r.some(v => v !== '' && v !== undefined)) n = i + 1; }); return n; }
  getMaxRows() { return 1000; }
  appendRow(v) { const r = this.getLastRow() + 1; new Range(this, r, 1, 1, v.length).setValues([v]); }
  getRange(r, c, nr, nc) { if (r < 1 || c < 1 || nr === 0) throw new Error('bad range'); return new Range(this, r, c, nr, nc); }
  setFrozenRows() {} setRightToLeft() {} hideColumns() {}
  protect() { return { setDescription() { return this; }, setWarningOnly() {} }; }
}
function makeContext() {
  const sheets = [new Sheet('Sheet1')], props = {}, cache = {};
  const ss = { getSheetByName: n => sheets.find(s => s.name === n) || null, insertSheet: n => { const s = new Sheet(n); sheets.push(s); return s; },
    getSheets: () => sheets.slice(), deleteSheet: s => sheets.splice(sheets.indexOf(s), 1), getId: () => 'SHEET123', getUrl: () => 'https://docs.google.com/spreadsheets/d/SHEET123', setSpreadsheetTimeZone() {} };
  const ctx = {
    console, JSON, Date, Math, Number, String, Array, Object, Error,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss, flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = String(v); } }) },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased() { return this; }, everyDays() { return this; }, atHour() { return this; }, inTimezone() { return this; }, create() {} }) },
    Logger: { log: m => console.log('[Logger]', m) },
    Utilities: { formatDate: (d) => d.toISOString().slice(0, 16).replace('T', ' ') },
    Session: { getActiveUser: () => ({ getEmail: () => '' }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ body: s, setMimeType() { return this; } }) },
  };
  vm.createContext(ctx);
  const dir = path.join(__dirname, '..', 'apps-script');
  vm.runInContext(fs.readFileSync(path.join(dir, 'Config.gs'), 'utf8'), ctx, { filename: 'Config.gs' });
  vm.runInContext(fs.readFileSync(path.join(dir, 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });
  ctx.__ss = ss; ctx.__props = props;
  return ctx;
}
module.exports = { makeContext };
