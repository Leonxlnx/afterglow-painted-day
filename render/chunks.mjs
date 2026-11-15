// Render the film in chunks (re-renderable independently), then concat + mux + X versions.
// usage: node render/chunks.mjs render <chunkIndex...>   (chunks of 10 s at 4K60 by default)
//        node render/chunks.mjs assemble
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const FPS = +(process.env.FPS || 60), W = +(process.env.W || 3840), H = +(process.env.H || 2160);
const CH = [[0, 10], [10, 20], [20, 30], [30, 40]];
const OUT = path.resolve(process.env.OUTDIR || 'out/final');
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => { const m = `[${new Date().toLocaleTimeString()}] ` + a.join(' '); console.log(m); fs.appendFileSync(path.join(OUT, 'chunks.log'), m + '\n'); };
const run = (cmd, args) => { log('$', cmd, args.join(' ').slice(0, 260)); const r = spawnSync(cmd, args, { stdio: 'inherit' }); if (r.status !== 0) { log('FAILED', r.status); process.exit(1); } };
const chunkFile = i => path.join(OUT, `chunk_${i}_${W}x${H}_${FPS}.mp4`);

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'render') {
  for (const i of rest.map(Number)) {
    const [a, b] = CH[i];
    run('node', ['render/render.mjs', 'wc', '--from', String(a), '--to', String(b), '--fps', String(FPS), '--w', String(W), '--h', String(H),
      '--out', chunkFile(i), '--qp', process.env.QP || '14', '--shutter', '180', '--port', String(8790 + i),
      '--pngEvery', String(FPS), '--pngDir', path.join(OUT, 'frames')]);
    log('chunk', i, 'done');
  }
} else if (cmd === 'assemble') {
  const list = path.join(OUT, 'concat.txt');
  fs.writeFileSync(list, CH.map((_, i) => `file '${chunkFile(i).replace(/\\/g, '/')}'`).join('\n'));
  const video = path.join(OUT, `video_${W}x${H}_${FPS}.mp4`);
  run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-video_track_timescale', String(FPS * 1000), video]);
  const wav = path.join(OUT, 'soundtrack.wav');
  run(process.env.PYTHON || 'python', ['render/mix_audio.py', wav]);
  const tag = H >= 2160 ? '4k' : `${H}p`;
  const master = path.join(OUT, `afterglow_master_${tag}${FPS}.mp4`);
  run('ffmpeg', ['-y', '-v', 'error', '-i', video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-movflags', '+faststart', '-shortest', master]);
  if (H >= 2160) {
    run('ffmpeg', ['-y', '-v', 'error', '-i', master, '-c:v', 'h264_amf', '-quality', 'quality', '-rc', 'vbr_peak', '-b:v', '48M', '-maxrate', '64M', '-bufsize', '96M',
      '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', path.join(OUT, `afterglow_X_4k${FPS}.mp4`)]);
    run('ffmpeg', ['-y', '-v', 'error', '-i', master, '-vf', 'scale=1920:1080:flags=lanczos,unsharp=5:5:0.3', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-maxrate', '24M', '-bufsize', '48M',
      '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', path.join(OUT, `afterglow_X_1080p${FPS}.mp4`)]);
  }
  log('assembled', master);
}
