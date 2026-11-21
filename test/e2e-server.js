// שרת בדיקה: מגיש את web/ ומדמה את ה־Web app של Apps Script ב־/rpc
const http = require('http'), fs = require('fs'), path = require('path');
const { makeContext } = require('./gas-mock');
const g = makeContext(); g.setup(); g.__props.APP_PASSWORD = 'pw';
http.createServer((req, res) => {
  if (req.url === '/rpc' && req.method === 'POST') {
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      const out = g.doPost({ postData: { contents: b } });
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(out.body);
    }); return;
  }
  let u = req.url.split('?')[0]; if (u.endsWith('/')) u += 'index.html';
  const f = path.join(__dirname, '..', 'web', u);
  if (req.url.startsWith('/settings.js')) { res.end("var API_URL='/rpc';var CFG=null,TOP,SITES,SLOT,OUT;"); return; }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : f.endsWith('.png') ? 'image/png' : f.endsWith('.webmanifest') ? 'application/manifest+json' : 'application/javascript' }); res.end(d); } });
}).listen(3400, () => console.log('e2e on 3400'));
