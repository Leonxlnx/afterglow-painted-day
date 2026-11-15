// Final pipeline: 4K60 video render -> soundtrack mix -> mux master -> X-ready 1080p60 + 4K upload versions + poster.
// usage: node render/final.mjs [--fps 60] [--from 0] [--to 40] [--skipRender 1]
import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2); const opt = {};
for (let i = 0; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1];
const fps = opt.fps || '60';
const OUT = path.resolve('out/final');
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => { const m = `[${new Date().toLocaleTimeString()}] ` + a.join(' '); console.log(m); fs.appendFileSync(path.join(OUT, 'final.log'), m + '\n'); };
const run = (cmd, args) => {
  log('$', cmd, args.join(' ').slice(0, 300));
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) { log('FAILED', cmd, r.status); process.exit(1); }
};

const video = path.join(OUT, `video_4k${fps}.mp4`);
if (!opt.skipRender) {
  run('node', ['render/render.mjs', 'seq', '--from', opt.from || '0', '--to', opt.to || '40', '--fps', fps, '--w', '3840', '--h', '2160',
    '--out', video, '--crf', '11', '--preset', 'slow', '--threads', '6', '--shutter', opt.shutter || '180',
    '--pngEvery', String(+fps * 2), '--pngDir', path.join(OUT, 'frames')]);
}
const wav = path.join(OUT, 'soundtrack.wav');
run('python', ['render/mix_audio.py', wav]);
const master = path.join(OUT, `afterglow_master_4k${fps}.mp4`);
run('ffmpeg', ['-y', '-v', 'error', '-i', video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000',
  '-movflags', '+faststart', '-shortest', master]);
// X upload versions
run('ffmpeg', ['-y', '-v', 'error', '-i', master, '-vf', 'scale=3840:2160:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-maxrate', '60M', '-bufsize', '120M',
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '5.2', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', path.join(OUT, `afterglow_X_4k${fps}.mp4`)]);
run('ffmpeg', ['-y', '-v', 'error', '-i', master, '-vf', 'scale=1920:1080:flags=lanczos,unsharp=5:5:0.35', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-maxrate', '24M', '-bufsize', '48M',
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', path.join(OUT, `afterglow_X_1080p${fps}.mp4`)]);
log('done');
