import * as THREE from 'three';
import { U } from './render/materials.js';
import { Painter } from './render/post.js';
import { SunShadows } from './render/shadows.js';
import { cameraAt, todAt, styleAt, DURATION, animTime } from './timeline.js';
import { buildWorld } from './world/world.js';

const params = new URLSearchParams(location.search);
const MODE = params.get('mode') || 'demo'; // demo | still | render
const W = +(params.get('w') || 0), H = +(params.get('h') || 0);
const QUALITY = params.get('q') || (MODE === 'demo' ? 'demo' : 'high');

THREE.ColorManagement.enabled = true;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: MODE !== 'demo', powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.autoClear = true;
renderer.sortObjects = true;

const log = (...a) => { console.log(...a); if (MODE !== 'demo') fetch('/log', { method: 'POST', body: a.join(' ') }).catch(() => {}); };

const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.08, 22000);
const scene = new THREE.Scene();
const painter = new Painter(renderer);
const shadows = new SunShadows(renderer, QUALITY === 'demo' ? 2048 : 4096);

let world = null;
let mainRT = null, refl = null;
let size = new THREE.Vector2();

function setSize(w, h) {
  if (size.x === w && size.y === h) return;
  size.set(w, h);
  renderer.setSize(w, h, false);
  if (MODE === 'demo') { canvas.style.width = '100%'; canvas.style.height = '100%'; }
  else { canvas.style.width = Math.round(w / 4) + 'px'; canvas.style.height = Math.round(h / 4) + 'px'; }
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (mainRT) mainRT.dispose();
  mainRT = new THREE.WebGLRenderTarget(w, h, { count: 2, type: THREE.HalfFloatType, samples: QUALITY === 'demo' ? 0 : 4, depthBuffer: true });
  mainRT.textures[1].type = THREE.FloatType;
  mainRT.textures[1].minFilter = mainRT.textures[1].magFilter = THREE.NearestFilter;
  mainRT.textures[0].minFilter = mainRT.textures[0].magFilter = THREE.LinearFilter;
  painter.setSize(w, h);
  if (world && world.water) world.water.setSize(Math.ceil(w / 2), Math.ceil(h / 2));
}

function applyTod(o) {
  U.uSunDir.value.copy(o.sunDir);
  U.uSunColor.value.copy(o.sun).multiplyScalar(o.sunI);
  U.uShadowTint.value.copy(o.shadowTint);
  U.uAmbTop.value.copy(o.ambTop); U.uAmbBottom.value.copy(o.ambBottom);
  U.uSkyZenith.value.copy(o.zen); U.uSkyMid.value.copy(o.mid); U.uSkyHorizon.value.copy(o.hor);
  U.uSunGlow.value.copy(o.sunGlow); U.uHorizonGlow.value.copy(o.hGlow); U.uHorizonGlowAmt.value = o.hGlowAmt;
  U.uAntiSun.value.copy(o.anti); U.uAntiSunAmt.value = o.antiAmt; U.uSunDisk.value = o.disk;
  U.uCloudLit.value.copy(o.cLit); U.uCloudShade.value.copy(o.cShade); U.uCloudRim.value.copy(o.cRim); U.uCloudCover.value = o.cover;
  U.uStars.value = o.stars; U.uFogDensity.value = o.fog; U.uFogTint.value.copy(o.fogTint);
  U.uAmbStrength.value = o.amb; U.uFogMax.value = o.fogMax;
  U.uGrassLit.value.copy(o.gLit); U.uGrassShade.value.copy(o.gShade); U.uWarmth.value = o.warmth;
}

const tmpV = new THREE.Vector3();
const blurCam = new THREE.PerspectiveCamera();
let SHUTTER = { fps: +(params.get('fps') || 60), angle: +(params.get('shutter') || 180) };
window.__setShutter = (fps, angle) => { SHUTTER = { fps, angle }; };
function vpAt(tv, out) {
  blurCam.aspect = camera.aspect; cameraAt(animTime(tv), blurCam);
  blurCam.updateMatrixWorld(); blurCam.updateProjectionMatrix();
  return out.multiplyMatrices(blurCam.projectionMatrix, blurCam.matrixWorldInverse);
}
function renderAt(tv, frame = 0) {
  const t = animTime(tv);
  U.uTime.value = t;
  cameraAt(t, camera);
  const tod = todAt(t);
  applyTod(tod);
  const style = styleAt(t);
  if (world) world.update(t, camera, tod);
  shadows.update(scene, camera, U.uSunDir.value);
  if (world && world.water) world.water.renderReflection(renderer, scene, camera);
  renderer.setRenderTarget(mainRT);
  renderer.setClearColor(0x000000, 1);
  renderer.clear(true, true, true);
  renderer.render(scene, camera);
  // sun on screen
  tmpV.copy(U.uSunDir.value).multiplyScalar(10000).add(camera.position).project(camera);
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
  const inFront = fwd.dot(U.uSunDir.value);
  const sunUv = new THREE.Vector2(tmpV.x * 0.5 + 0.5, tmpV.y * 0.5 + 0.5);
  const off = Math.max(Math.abs(tmpV.x), Math.abs(tmpV.y));
  const sunVisible = THREE.MathUtils.clamp(inFront * 3, 0, 1) * THREE.MathUtils.clamp(2.2 - off, 0, 1) * THREE.MathUtils.smoothstep(tod.el, -4, 1);
  style.fade = THREE.MathUtils.smoothstep(tv, DURATION - 0.9, DURATION) * 0.92;
  { const d = U.uSunDir.value; const yy = Math.max(d.y, 0) + 0.09; style.sunP = new THREE.Vector2(d.x / yy * 260, d.z / yy * 260); }
  let blur = null;
  if (SHUTTER.angle > 0 && MODE !== 'demo') {
    const half = (SHUTTER.angle / 360) / SHUTTER.fps / 2;
    const invVP = new THREE.Matrix4().multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse);
    blur = { invVP, camPos: camera.position.clone(), vpA: vpAt(tv - half, new THREE.Matrix4()), vpB: vpAt(tv + half, new THREE.Matrix4()), amount: 1 };
  }
  painter.render(mainRT, style, { sunUv, sunVisible, frame, time: t, tiles: QUALITY === 'demo' ? 1 : 4, blur });
  if (world && world.overlay) {
    world.ffMat.uniforms.tAux.value = mainRT.textures[1];
    world.ffMat.uniforms.uFadeMul.value = (1 - (style.fade || 0)) * style.exposure;
    renderer.setRenderTarget(null);
    const ac = renderer.autoClear; renderer.autoClear = false;
    renderer.render(world.overlay, camera);
    renderer.autoClear = ac;
  }
}

async function init() {
  const t0 = performance.now();
  const status = document.getElementById('status');
  const progress = (msg) => { if (status) status.textContent = msg; };
  world = await buildWorld({ scene, renderer, quality: QUALITY, log, progress });
  const loader = document.getElementById('loader');
  if (loader && MODE !== 'demo') loader.classList.add('done');
  progress('Ready');
  log(`world built in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  if (params.get('noclouds')) world.sky.clouds.visible = false;
  if (params.get('noislands') && world.islandsGroup) world.islandsGroup.visible = false;
  if (MODE === 'demo') {
    window.__scale = +(params.get('scale') || 0.7);
    const fit = () => setSize(Math.max(320, Math.round(innerWidth * window.__scale)), Math.max(180, Math.round(innerHeight * window.__scale)));
    window.__fit = fit;
    fit(); addEventListener('resize', fit);
    startDemoUI();
  } else {
    setSize(W || 1920, H || 1080);
  }
  window.__ready = true;
}

// ---------- capture API (used by render/render.mjs) ----------
window.__renderStill = async (t, frame = 0) => {
  renderAt(t, frame);
  const gl = renderer.getContext();
  const n = size.x * size.y * 4;
  if (!window.__px || window.__px.length !== n) window.__px = new Uint8Array(n);
  const px = window.__px;
  gl.readPixels(0, 0, size.x, size.y, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return px;
};
window.__renderAndPost = async (t, frame, tag = 'f') => {
  const t0 = performance.now();
  const px = await window.__renderStill(t, frame);
  const t1 = performance.now();
  await fetch(`/frame?i=${frame}&t=${t}&tag=${tag}&w=${size.x}&h=${size.y}`, { method: 'POST', body: px });
  return { render: t1 - t0, post: performance.now() - t1 };
};
window.__setSize = (w, h) => setSize(w, h);
// whole-range capture with in-browser hardware H.264 (WebCodecs): no raw pixel transfer at all
window.__renderRangeWC = async (n0, n1, fps, q = 14, pngEvery = 0) => {
  const parts = []; let pendingBytes = 0, seg = 0, upload = Promise.resolve(), encErr = null;
  const flushUpload = () => {
    if (!parts.length) return;
    const total = parts.reduce((a, b) => a + b.length, 0), all = new Uint8Array(total); let o = 0;
    for (const b of parts) { all.set(b, o); o += b.length; }
    parts.length = 0; pendingBytes = 0;
    const k = seg++;
    upload = upload.then(() => fetch(`/h264?seg=${k}`, { method: 'POST', body: all }));
  };
  const enc = new VideoEncoder({
    output: (ch) => { const b = new Uint8Array(ch.byteLength); ch.copyTo(b); parts.push(b); pendingBytes += b.length; if (pendingBytes > 16e6) flushUpload(); },
    error: (e) => { encErr = e.message; log('ENC ERROR ' + e.message); },
  });
  enc.configure({ codec: 'avc1.640034', width: size.x, height: size.y, framerate: fps, hardwareAcceleration: 'prefer-hardware',
    avc: { format: 'annexb' }, bitrateMode: 'quantizer', latencyMode: 'quality' });
  const gl = renderer.getContext();
  const tStart = performance.now(); let tLast = tStart;
  for (let i = n0; i < n1; i++) {
    if (encErr) throw new Error(encErr);
    const tv = i / fps;
    const a = performance.now();
    renderAt(tv, i);
    const f = new VideoFrame(canvas, { timestamp: Math.round((i - n0) * 1e6 / fps), duration: Math.round(1e6 / fps) });
    enc.encode(f, { keyFrame: (i - n0) % fps === 0, avc: { quantizer: q } });
    f.close();
    if (pngEvery && i % pngEvery === 0) {
      const n = size.x * size.y * 4;
      if (!window.__px || window.__px.length !== n) window.__px = new Uint8Array(n);
      gl.readPixels(0, 0, size.x, size.y, gl.RGBA, gl.UNSIGNED_BYTE, window.__px);
      upload = upload.then(() => fetch(`/frame?i=${i}&t=${tv}&tag=snap`, { method: 'POST', body: window.__px.slice() }));
    }
    while (enc.encodeQueueSize > 3) await new Promise(r => setTimeout(r, 2));
    const b = performance.now();
    if ((i - n0) % 20 === 0 || i === n1 - 1) {
      const now = performance.now(), done = i - n0 + 1, per = (now - tStart) / 1000 / done;
      log(`frame ${i}/${n1} t=${tv.toFixed(2)} render ${(b - a).toFixed(0)}ms | ${per.toFixed(2)}s/f, last20 ${((now - tLast) / 1000 / 20).toFixed(2)}s/f, eta ${((n1 - i - 1) * per / 60).toFixed(1)}min`);
      tLast = now;
    }
    await new Promise(r => setTimeout(r, 0));
  }
  await enc.flush();
  flushUpload();
  await upload;
  return { secs: (performance.now() - tStart) / 1000, segs: seg };
};
// whole-range capture inside the page: no per-frame CDP round trips, uploads pipelined (server re-orders)
window.__renderRange = async (n0, n1, fps, tag = 'seq', maxInflight = 3) => {
  const gl = renderer.getContext();
  const inflight = [];
  const tStart = performance.now(); let tLast = tStart;
  for (let i = n0; i < n1; i++) {
    const tv = i / fps;
    const a = performance.now();
    renderAt(tv, i);
    const n = size.x * size.y * 4;
    if (!window.__px || window.__px.length !== n) window.__px = new Uint8Array(n);
    gl.readPixels(0, 0, size.x, size.y, gl.RGBA, gl.UNSIGNED_BYTE, window.__px);
    const b = performance.now();
    inflight.push(fetch(`/frame?i=${i}&t=${tv}&tag=${tag}&w=${size.x}&h=${size.y}`, { method: 'POST', body: window.__px }));
    while (inflight.length >= maxInflight) await inflight.shift();
    if ((i - n0) % 10 === 0 || i === n1 - 1) {
      const now = performance.now(), done = i - n0 + 1, per = (now - tStart) / 1000 / done;
      log(`frame ${i}/${n1} t=${tv.toFixed(2)} render ${(b - a).toFixed(0)}ms | ${per.toFixed(2)}s/f, last10 ${((now - tLast) / 1000 / 10).toFixed(2)}s/f, eta ${((n1 - i - 1) * per / 60).toFixed(1)}min`);
      tLast = now;
    }
    await new Promise(r => setTimeout(r, 0));
  }
  await Promise.all(inflight);
  return (performance.now() - tStart) / 1000;
};

// ---------- demo UI ----------
function startDemoUI() {
  const ui = document.getElementById('ui');
  const bar = document.getElementById('bar'), play = document.getElementById('play'), time = document.getElementById('time');
  const audio = new Audio('./audio/soundtrack.m4a'); audio.preload = 'auto';
  let playing = false, t = +(params.get('t') || 0), last = performance.now(), ft = 0.033, adapt = 0;
  const setPlaying = (p) => {
    playing = p; play.textContent = playing ? '❚❚' : '▶';
    if (playing) { audio.currentTime = t; audio.play().catch(() => {}); } else audio.pause();
  };
  play.onclick = () => setPlaying(!playing);
  bar.oninput = () => { t = +bar.value / 1000 * DURATION; audio.currentTime = t; };
  addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); play.onclick(); } });
  const enter = document.getElementById('enter');
  if (enter) { enter.style.display = 'inline-block'; enter.onclick = () => { document.getElementById('loader').classList.add('done'); ui.style.display = 'flex'; setPlaying(true); }; }
  else { ui.style.display = 'flex'; setPlaying(true); }
  const loop = () => {
    const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (playing) {
      if (!audio.paused && audio.readyState >= 2) t = audio.currentTime; else t += dt;
      if (t >= DURATION - 0.02) { t = 0; audio.currentTime = 0; if (playing) audio.play().catch(() => {}); }
    }
    renderAt(t, Math.floor(t * 30));
    // dynamic resolution: keep the demo fluid on slower GPUs (unless ?scale= was given)
    if (!params.get('scale')) {
      ft = ft * 0.92 + dt * 0.08; adapt++;
      if (adapt > 45) {
        adapt = 0;
        if (ft > 0.055 && window.__scale > 0.38) { window.__scale = Math.max(0.38, window.__scale - 0.08); window.__fit(); }
        else if (ft < 0.026 && window.__scale < 1.0) { window.__scale = Math.min(1.0, window.__scale + 0.06); window.__fit(); }
      }
    }
    bar.value = Math.round(t / DURATION * 1000);
    time.textContent = t.toFixed(1) + 's';
    requestAnimationFrame(loop);
  };
  loop();
}

init().catch(e => { log('INIT ERROR ' + e.stack); throw e; });
