// Drive headless Chrome (real GPU via ANGLE/D3D11) to render stills or a frame sequence straight into ffmpeg.
// usage:
//   node render/render.mjs stills --times 0,8,20 --w 1920 --h 1080 --out out/stills [--tag name]
//   node render/render.mjs seq --from 0 --to 40 --fps 30 --w 3840 --h 2160 --out out/video.mp4 [--crf 12] [--pngEvery 0]
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { startServer } from './server.mjs';

const argv = process.argv.slice(2);
const cmd = argv[0];
const opt = {};
for (let i = 1; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1];
const W = +(opt.w || 1920), H = +(opt.h || 1080);
const PORT = +(opt.port || 8790);
const q = opt.q || 'high';
fs.mkdirSync(path.dirname(path.resolve(opt.out || 'out/x')), { recursive: true });

function ffmpegPng(file, buf = globalThis.__lastBuf) {
  return new Promise((res, rej) => {
    const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', '-', '-vf', 'vflip', file]);
    p.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg png ' + c)));
    p.stdin.on('error', () => {});
    p.stdin.end(buf);
  });
}

let ff = null; let frameCount = 0;
const pending = new Map(); let nextIdx = null; let pumping = false;
async function pump() {
  if (pumping) return; pumping = true;
  while (nextIdx !== null && pending.has(nextIdx)) {
    const { buf, r } = pending.get(nextIdx); pending.delete(nextIdx);
    if (!ff.stdin.write(buf)) await new Promise(res => ff.stdin.once('drain', res));
    nextIdx++; r();
  }
  pumping = false;
}
const pngEvery = +(opt.pngEvery || 0);
const pngDir = opt.pngDir || null;

async function onFrame(buf, q) {
  if (buf.length !== W * H * 4) throw new Error(`bad frame size ${buf.length} vs ${W * H * 4}`);
  if (cmd === 'stills') {
    const dir = path.resolve(opt.out || 'out/stills'); fs.mkdirSync(dir, { recursive: true });
    const name = `${opt.tag ? opt.tag + '_' : ''}t${(+q.t).toFixed(2).padStart(6, '0')}.png`;
    globalThis.__lastBuf = buf;
    await ffmpegPng(path.join(dir, name));
    console.log('wrote', path.join(dir, name));
  } else {
    // write strictly in frame order (uploads may arrive out of order)
    const idx = +q.i;
    await new Promise(r => { pending.set(idx, { buf, r }); pump(); });
    frameCount++;
    if (pngEvery && pngDir && (+q.i % pngEvery === 0)) {
      fs.mkdirSync(pngDir, { recursive: true });
      ffmpegPng(path.join(pngDir, `f${String(q.i).padStart(5, '0')}.png`), Buffer.from(buf)).catch(() => {});
    }
  }
}

let h264fd = null;
async function onH264(buf) { fs.writeSync(h264fd, buf); }
async function onFrameWC(buf, q) {
  if (!pngDir) return;
  fs.mkdirSync(pngDir, { recursive: true });
  await ffmpegPng(path.join(pngDir, `f${String(q.i).padStart(5, '0')}.png`), buf);
}
const server = await startServer({ port: PORT, onFrame: cmd === 'wc' ? onFrameWC : onFrame, onH264, onLog: m => console.log('[page]', m) });
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 86400000,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-watchdog', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--force-gpu-mem-available-mb=8192', '--js-flags=--max-old-space-size=8192', '--window-size=1280,800'],
});
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (m.type() === 'error' || m.type() === 'warning' || /ERROR|THREE/.test(t)) console.log('[console]', m.type(), t.slice(0, 2000)); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.setViewport({ width: 1280, height: 800 });
const t0 = Date.now();
await page.goto(`http://localhost:${PORT}/index.html?mode=still&w=${W}&h=${H}&q=${q}&fps=${opt.fps || 60}&shutter=${opt.shutter ?? 180}${opt.extra ? '&' + opt.extra : ''}`, { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__ready === true', { timeout: 600000 });
console.log(`ready after ${((Date.now() - t0) / 1000).toFixed(1)}s`);

if (cmd === 'stills') {
  const times = (opt.times || '0').split(',').map(Number);
  for (const t of times) {
    const r = await page.evaluate((t) => window.__renderAndPost(t, 0, 's'), t);
    console.log(`t=${t} render ${r.render.toFixed(0)}ms post ${r.post.toFixed(0)}ms`);
  }
} else if (cmd === 'seq') {
  const fps = +(opt.fps || 30), from = +(opt.from || 0), to = +(opt.to || 40);
  const crf = opt.crf || '12';
  const out = path.resolve(opt.out || 'out/seq.mp4');
  const vcodec = opt.codec === 'png' ? ['-c:v', 'png']
    : opt.codec === 'inter' ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', opt.crf || '8', '-pix_fmt', 'yuv420p']
    : opt.codec === 'amf' ? ['-c:v', 'h264_amf', '-quality', 'quality', '-rc', 'cqp', '-qp_i', '12', '-qp_p', '14', '-qp_b', '16', '-profile:v', 'high', '-pix_fmt', 'yuv420p']
    : ['-c:v', 'libx264', '-preset', opt.preset || 'slow', '-crf', crf, '-pix_fmt', opt.pix || 'yuv420p', '-tune', 'film', '-x264-params', 'aq-mode=3'];
  ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(fps), '-i', '-',
    '-vf', 'vflip', ...vcodec, '-threads', opt.threads || '6', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n0 = Math.round(from * fps), n1 = Math.round(to * fps);
  nextIdx = n0;
  const secs = await page.evaluate((n0, n1, fps) => window.__renderRange(n0, n1, fps, 'seq', 3), n0, n1, fps);
  console.log(`range done in ${(secs / 60).toFixed(1)} min`);
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('video written', out, frameCount, 'frames');
}
if (cmd === 'wc') {
  const fps = +(opt.fps || 60), from = +(opt.from || 0), to = +(opt.to || 40);
  const out = path.resolve(opt.out || 'out/wc.mp4');
  const raw = out.replace(/\.mp4$/, '.h264');
  h264fd = fs.openSync(raw, 'w');
  const n0 = Math.round(from * fps), n1 = Math.round(to * fps);
  const r = await page.evaluate((n0, n1, fps, q, pe) => window.__renderRangeWC(n0, n1, fps, q, pe), n0, n1, fps, +(opt.qp || 14), +(opt.pngEvery || 0));
  fs.closeSync(h264fd);
  console.log(`range done in ${(r.secs / 60).toFixed(1)} min, ${r.segs} segments`);
  const { spawnSync } = await import('node:child_process');
  const m = spawnSync('ffmpeg', ['-y', '-v', 'error', '-r', String(fps), '-f', 'h264', '-i', raw, '-c', 'copy', '-video_track_timescale', String(fps * 1000), out], { stdio: 'inherit' });
  console.log(m.status === 0 ? `video written ${out}` : 'MUX FAILED');
}
await browser.close();
server.close();
process.exit(0);
