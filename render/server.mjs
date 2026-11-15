// Static file server + frame sink. Frames POSTed as raw RGBA go to an ffmpeg process or PNG files.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.css': 'text/css', '.glsl': 'text/plain', '.bin': 'application/octet-stream' };

export function startServer({ port = 8787, onFrame = null, onLog = null, onH264 = null } = {}) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST' && url.pathname === '/frame') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const buf = Buffer.concat(chunks);
      try { if (onFrame) await onFrame(buf, Object.fromEntries(url.searchParams)); res.writeHead(200); res.end('ok'); }
      catch (e) { res.writeHead(500); res.end(String(e)); }
      return;
    }
    if (req.method === 'POST' && url.pathname === '/h264') {
      const chunks = []; for await (const c of req) chunks.push(c);
      try { if (onH264) await onH264(Buffer.concat(chunks), Object.fromEntries(url.searchParams)); res.writeHead(200); res.end('ok'); }
      catch (e) { res.writeHead(500); res.end(String(e)); }
      return;
    }
    if (req.method === 'POST' && url.pathname === '/log') {
      const chunks = []; for await (const c of req) chunks.push(c);
      const msg = Buffer.concat(chunks).toString();
      if (onLog) onLog(msg); else console.log('[page]', msg);
      res.writeHead(200); res.end('ok'); return;
    }
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(fp, (err, data) => {
      if (err) { res.writeHead(404); res.end('nf'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(port, () => r(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = +(process.env.PORT || 8787);
  startServer({ port }).then(() => console.log(`serving ${ROOT} on http://localhost:${port}`));
}
