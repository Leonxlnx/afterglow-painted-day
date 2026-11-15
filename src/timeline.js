// Time-keyed camera, time-of-day palettes and painting style for the 40 s film.
import * as THREE from 'three';

export const DURATION = 40;
export const DROP_T = 18.0; // animation time of the music drop (reveal)
export const ARCH_T = 7.55;

// video time -> animation time, monotone piecewise-cubic through anchors [video, anim]
export let WARP = [[0, 0], [8.59, 7.55], [19.48, 18.0], [40, 40]];
export function setWarp(w) { WARP = w; }
export function animTime(v) {
  const W = WARP;
  if (v <= W[0][0]) return W[0][1] + (v - W[0][0]);
  if (v >= W[W.length - 1][0]) return W[W.length - 1][1] + (v - W[W.length - 1][0]);
  let i = 0; while (W[i + 1][0] < v) i++;
  const sl = k => (W[k + 1][1] - W[k][1]) / (W[k + 1][0] - W[k][0]);
  const m = k => {
    if (k === 0) return sl(0);
    if (k === W.length - 1) return sl(k - 1);
    const a = sl(k - 1), b = sl(k);
    return a * b <= 0 ? 0 : 2 / (1 / a + 1 / b);
  };
  const x0 = W[i][0], x1 = W[i + 1][0], y0 = W[i][1], y1 = W[i + 1][1], h = x1 - x0, u = (v - x0) / h;
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  return h00 * y0 + h10 * h * m(i) + h01 * y1 + h11 * h * m(i + 1);
}

// ---------- generic keyed interpolation (time-parametrised cardinal spline, C1) ----------
function tangent(keys, i, get) {
  const n = keys.length;
  if (i === 0 || i === n - 1) return get(keys[i]).map(() => 0);
  const p0 = get(keys[i - 1]), p1 = get(keys[i]), p2 = get(keys[i + 1]);
  const t0 = keys[i - 1].t, t1 = keys[i].t, t2 = keys[i + 1].t;
  return p1.map((v, k) => {
    const a = (v - p0[k]) / (t1 - t0), b = (p2[k] - v) / (t2 - t1);
    return (a * (t2 - t1) + b * (t1 - t0)) / (t2 - t0);
  });
}
export function keyed(keys, t, get, { ease = false } = {}) {
  if (t <= keys[0].t) return get(keys[0]);
  if (t >= keys[keys.length - 1].t) return get(keys[keys.length - 1]);
  let i = 0; while (keys[i + 1].t < t) i++;
  const a = keys[i], b = keys[i + 1], dt = b.t - a.t;
  let u = (t - a.t) / dt;
  if (ease) { u = u * u * (3 - 2 * u); }
  const pa = get(a), pb = get(b);
  if (ease) return pa.map((v, k) => v + (pb[k] - v) * u);
  const ma = tangent(keys, i, get), mb = tangent(keys, i + 1, get);
  const u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return pa.map((v, k) => h00 * v + h10 * dt * ma[k] + h01 * pb[k] + h11 * dt * mb[k]);
}

// ---------- camera ----------
// pos / look in world metres; fov vertical degrees; roll radians
export const CAM_KEYS = [
  { t: 0.0, pos: [5.5, 1.15, 60], look: [-1, 3.2, -24], fov: 52, roll: 0.055 },
  { t: 3.5, pos: [2.0, 1.2, 6], look: [-3, 3.8, -70], fov: 52, roll: -0.02 },
  { t: 6.5, pos: [-3.0, 1.9, -46], look: [-2, 5.5, -120], fov: 52, roll: 0.03 },
  { t: 8.3, pos: [-2.2, 2.8, -80], look: [1, 8, -150], fov: 54, roll: 0.0 },
  { t: 11.0, pos: [1.5, 6.0, -115], look: [3, 16, -190], fov: 52, roll: -0.03 },
  { t: 14.5, pos: [3.0, 11.5, -152], look: [2, 22, -215], fov: 50, roll: 0.02 },
  { t: 18.0, pos: [2.0, 27.5, -192], look: [0, 36, -250], fov: 50, roll: 0.0 },
  { t: 20.5, pos: [1.0, 36.5, -230], look: [-2, 40, -290], fov: 50, roll: 0.0 },
  { t: 22.5, pos: [0.5, 38.6, -245], look: [-3, 40.5, -295], fov: 50, roll: 0.0 },
  { t: 25.0, pos: [0.5, 38.6, -253.5], look: [-3.5, 41.0, -292], fov: 50, roll: 0.0 },
  { t: 28.0, pos: [-1.0, 38.3, -258.5], look: [-4.0, 41.5, -292], fov: 50, roll: 0.01 },
  { t: 31.0, pos: [-12.0, 39.0, -252.0], look: [-3.0, 42.0, -293], fov: 50, roll: -0.01 },
  { t: 34.0, pos: [-11.5, 38.9, -250.0], look: [-3.5, 42.2, -296], fov: 46, roll: 0.0 },
  { t: 37.0, pos: [-9.6, 38.75, -254.0], look: [-2.5, 41.6, -296], fov: 45, roll: 0.0 },
  { t: 40.0, pos: [-8.3, 38.55, -257.6], look: [-2.0, 41.3, -298], fov: 44, roll: 0.0 },
];

export function cameraAt(t, cam) {
  const p = keyed(CAM_KEYS, t, k => k.pos), l = keyed(CAM_KEYS, t, k => k.look);
  const [fov] = keyed(CAM_KEYS, t, k => [k.fov]), [roll] = keyed(CAM_KEYS, t, k => [k.roll]);
  // gentle drone sway
  const sx = Math.sin(t * 0.9) * 0.08 + Math.sin(t * 2.3 + 1) * 0.03;
  const sy = Math.sin(t * 1.3 + 2) * 0.06 + Math.sin(t * 3.1) * 0.02;
  const dt = t - DROP_T;
  const kick = dt > 0 ? Math.exp(-dt * 7.0) : 0;
  const shx = kick * (Math.sin(dt * 61) * 0.05 + Math.sin(dt * 37) * 0.03);
  const shy = kick * (Math.sin(dt * 53 + 1) * 0.04);
  cam.position.set(p[0] + sx + shx, p[1] + sy + shy, p[2]);
  cam.up.set(0, 1, 0);
  cam.lookAt(l[0], l[1], l[2]);
  cam.rotateZ(roll + Math.sin(t * 0.7) * 0.004 + kick * Math.sin(dt * 29) * 0.006);
  const breathe = dt > 0 ? 6.0 * (1 - Math.exp(-dt * 10)) * Math.exp(-dt * 1.1) : 0;
  cam.fov = fov + breathe; cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
}

// ---------- time of day ----------
const C = h => new THREE.Color(h);
// sun: azimuth (deg, 0 = -Z forward, + = toward +X), elevation (deg)
export const TOD_KEYS = [
  { t: 0, name: 'day', amb: 0.5, fogMax: 0.85, az: 70, el: 31, sunI: 2.8, sun: '#fff0d8', shadowTint: '#6a80c8', ambTop: '#6488c6', ambBottom: '#4e5e36',
    zen: '#1c66de', mid: '#3a92f0', hor: '#aed6f4', sunGlow: '#fff0d0', hGlow: '#ffe6c0', hGlowAmt: 0.14, anti: '#d8e4ff', antiAmt: 0.0, disk: 4,
    cLit: '#ffffff', cShade: '#9eaee0', cRim: '#ffffff', cover: 0.38, stars: 0, fog: 0.0009, fogTint: '#ffffff',
    gLit: '#b8dc4a', gShade: '#2f6e60', warmth: 0 },
  { t: 11, name: 'afternoon', amb: 0.5, fogMax: 0.85, az: 62, el: 30, sunI: 2.8, sun: '#ffe2b0', shadowTint: '#8a88c0', ambTop: '#6e8cc6', ambBottom: '#52603a',
    zen: '#2264d6', mid: '#4f94ea', hor: '#d6e2ea', sunGlow: '#ffe2b8', hGlow: '#ffd2a0', hGlowAmt: 0.25, anti: '#e0d8f0', antiAmt: 0.1, disk: 4,
    cLit: '#fff6ea', cShade: '#96a2da', cRim: '#fff2d8', cover: 0.42, stars: 0, fog: 0.001, fogTint: '#ffffff',
    gLit: '#cadc4a', gShade: '#3a5c42', warmth: 0.3 },
  { t: 18.5, name: 'golden', amb: 0.4, fogMax: 0.8, az: 28, el: 13, sunI: 2.6, sun: '#ffcf8f', shadowTint: '#5a5cb4', ambTop: '#7a74c0', ambBottom: '#4e4438',
    zen: '#3458c0', mid: '#7a86d8', hor: '#ffbf8a', sunGlow: '#ffc070', hGlow: '#ff9850', hGlowAmt: 0.6, anti: '#e0a0c4', antiAmt: 0.35, disk: 3.0,
    cLit: '#ffd0a4', cShade: '#6a66b8', cRim: '#ffe0a8', cover: 0.44, stars: 0, fog: 0.0008, fogTint: '#fff0e4',
    gLit: '#dcc04a', gShade: '#28485e', warmth: 0.65 },
  { t: 25, name: 'sunset', amb: 0.28, fogMax: 0.62, az: 6, el: 3.0, sunI: 2.5, sun: '#ff9a50', shadowTint: '#2a2d6b', ambTop: '#4a3f8f', ambBottom: '#2a2238',
    zen: '#3a3a8a', mid: '#6a58b8', hor: '#ff6a2a', sunGlow: '#ffb060', hGlow: '#ff4a2a', hGlowAmt: 0.95, anti: '#c86aa8', antiAmt: 0.5, disk: 2.4,
    cLit: '#ffb070', cShade: '#4a3f8f', cRim: '#ffd07a', cover: 0.4, stars: 0, fog: 0.0006, fogTint: '#ffe0d8',
    gLit: '#e0a040', gShade: '#1f2a4e', warmth: 1 },
  { t: 30.5, name: 'late sunset', amb: 0.26, fogMax: 0.6, az: 2, el: 0.3, sunI: 2.0, sun: '#ff7444', shadowTint: '#22245e', ambTop: '#3e3484', ambBottom: '#221c34',
    zen: '#2a2c78', mid: '#5a48a8', hor: '#ff5a3a', sunGlow: '#ff8040', hGlow: '#ff3a3a', hGlowAmt: 1.0, anti: '#b05a9c', antiAmt: 0.55, disk: 2.0,
    cLit: '#ff8a6a', cShade: '#3a3080', cRim: '#ffa060', cover: 0.42, stars: 0.1, fog: 0.0007, fogTint: '#ffd0d8',
    gLit: '#a8604a', gShade: '#181f40', warmth: 1 },
  { t: 35, name: 'dusk', amb: 0.3, fogMax: 0.6, az: -2, el: -3.5, sunI: 0.6, sun: '#ff5a50', shadowTint: '#181a40', ambTop: '#2a2860', ambBottom: '#141228',
    zen: '#1c2460', mid: '#2a3566', hor: '#d8506a', sunGlow: '#ff5040', hGlow: '#e0485a', hGlowAmt: 0.5, anti: '#4a4a90', antiAmt: 0.3, disk: 0,
    cLit: '#6a5a9e', cShade: '#221e50', cRim: '#e8946a', cover: 0.3, stars: 1.6, fog: 0.0007, fogTint: '#c8b0f0',
    gLit: '#4e3a5a', gShade: '#24183a', warmth: 0.9 },
  { t: 40, name: 'dusk2', amb: 0.3, fogMax: 0.6, az: -3, el: -5, sunI: 0.45, sun: '#ff5050', shadowTint: '#141638', ambTop: '#24225a', ambBottom: '#100e22',
    zen: '#141c4c', mid: '#22305a', hor: '#a83a5e', sunGlow: '#ff4a40', hGlow: '#c03a5a', hGlowAmt: 0.42, anti: '#3a3a80', antiAmt: 0.28, disk: 0,
    cLit: '#4a4a80', cShade: '#1a1840', cRim: '#b05a6a', cover: 0.26, stars: 2.0, fog: 0.0007, fogTint: '#b8a0e8',
    gLit: '#3e2e4e', gShade: '#1e1432', warmth: 0.9 },
];

const COLOR_FIELDS = ['sun', 'shadowTint', 'ambTop', 'ambBottom', 'zen', 'mid', 'hor', 'sunGlow', 'hGlow', 'anti', 'cLit', 'cShade', 'cRim', 'fogTint', 'gLit', 'gShade'];
const NUM_FIELDS = ['az', 'el', 'sunI', 'hGlowAmt', 'antiAmt', 'disk', 'cover', 'stars', 'fog', 'warmth', 'amb', 'fogMax'];
TOD_KEYS.forEach(k => COLOR_FIELDS.forEach(f => { k['_' + f] = C(k[f]); }));

function lerpKeys(keys, t) {
  if (t <= keys[0].t) return [keys[0], keys[0], 0];
  if (t >= keys[keys.length - 1].t) return [keys[keys.length - 1], keys[keys.length - 1], 0];
  let i = 0; while (keys[i + 1].t < t) i++;
  let u = (t - keys[i].t) / (keys[i + 1].t - keys[i].t);
  u = u * u * (3 - 2 * u);
  return [keys[i], keys[i + 1], u];
}

export function todAt(t) {
  const [a, b, u] = lerpKeys(TOD_KEYS, t);
  const o = {};
  NUM_FIELDS.forEach(f => { o[f] = a[f] + (b[f] - a[f]) * u; });
  COLOR_FIELDS.forEach(f => { o[f] = a['_' + f].clone().lerp(b['_' + f], u); });
  const az = THREE.MathUtils.degToRad(o.az), el = THREE.MathUtils.degToRad(o.el);
  o.sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
  return o;
}

// ---------- painting style ----------
export const STYLE_KEYS = [
  { t: 0, A: [66, 0.5, 0.8, 0.42], B: [24, 0.5, 0.9, 0.3], impasto: 0.38, kuw: 3.8, baseMix: 0.62, detail: 0.03, flow: 0.9,
    bloom: 0.09, bloomT: 0.95, rays: 0.4, rayLen: 0.55, rayT: 0.55, exposure: 1.0, sat: 1.06, contrast: 1.12, vignette: 0.2 , skySize: 3.0, skyJit: 0.45, groundDetail: 1.5 },
  { t: 12, A: [74, 0.5, 0.85, 0.5], B: [24, 0.5, 0.9, 0.35], impasto: 0.45, kuw: 3.9, baseMix: 0.66, detail: 0.032, flow: 0.95,
    bloom: 0.11, bloomT: 0.9, rays: 0.75, rayLen: 0.6, rayT: 0.5, exposure: 1.0, sat: 1.08, contrast: 1.16, vignette: 0.24 , skySize: 2.8, skyJit: 0.55, groundDetail: 1.5 },
  { t: 14.5, A: [80, 0.5, 0.9, 0.55], B: [24, 0.5, 0.92, 0.38], impasto: 0.5, kuw: 4.0, baseMix: 0.68, detail: 0.033, flow: 0.97,
    bloom: 0.12, bloomT: 0.85, rays: 0.8, rayLen: 0.65, rayT: 0.45, exposure: 1.06, sat: 1.1, contrast: 1.2, vignette: 0.26 , skySize: 2.6, skyJit: 0.65, groundDetail: 1.6 },
  { t: 22, A: [92, 0.5, 0.95, 0.72], B: [26, 0.5, 0.95, 0.45], impasto: 0.85, kuw: 4.3, baseMix: 0.75, detail: 0.035, flow: 1.0,
    bloom: 0.1, bloomT: 0.95, rays: 0.6, rayLen: 0.62, rayT: 0.5, exposure: 1.0, sat: 1.02, contrast: 1.24, vignette: 0.24 , skySize: 2.2, skyJit: 1.0, groundDetail: 2.6 },
  { t: 30, A: [104, 0.5, 1.0, 0.8], B: [28, 0.5, 1.0, 0.5], impasto: 1.0, kuw: 4.5, baseMix: 0.8, detail: 0.038, flow: 1.0,
    bloom: 0.11, bloomT: 0.9, rays: 0.6, rayLen: 0.62, rayT: 0.45, exposure: 1.0, sat: 1.0, contrast: 1.26, vignette: 0.26 , skySize: 2.1, skyJit: 1.0, groundDetail: 3.2 },
  { t: 33, A: [100, 0.5, 1.0, 0.75], B: [28, 0.5, 1.0, 0.5], impasto: 0.95, kuw: 4.5, baseMix: 0.8, detail: 0.038, flow: 1.0,
    bloom: 0.14, bloomT: 0.7, rays: 0.4, rayLen: 0.6, rayT: 0.45, exposure: 0.9, sat: 1.0, contrast: 1.24, vignette: 0.3 , skySize: 2.1, skyJit: 0.9, groundDetail: 3.2 },
  { t: 40, A: [96, 0.5, 0.9, 0.45], B: [28, 0.5, 0.9, 0.3], impasto: 0.85, kuw: 4.5, baseMix: 0.8, detail: 0.038, flow: 1.0,
    bloom: 0.22, bloomT: 0.45, rays: 0.2, rayLen: 0.6, rayT: 0.4, exposure: 0.62, sat: 1.05, contrast: 1.2, vignette: 0.38 , skySize: 2.1, skyJit: 0.7, groundDetail: 3.0 },
];

export function styleAt(t) {
  const [a, b, u] = lerpKeys(STYLE_KEYS, t);
  const L = (x, y) => x + (y - x) * u;
  const dd = t - DROP_T;
  const flash = dd > 0 ? 0.8 * Math.exp(-dd * 2.4) * (1 - Math.exp(-dd * 25)) : 0;
  const v4 = (x, y) => new THREE.Vector4(L(x[0], y[0]), L(x[1], y[1]), L(x[2], y[2]), L(x[3], y[3]));
  return {
    strokeA: v4(a.A, b.A), strokeB: v4(a.B, b.B), impasto: L(a.impasto, b.impasto), kuwRadius: L(a.kuw, b.kuw),
    baseMix: L(a.baseMix, b.baseMix), detailThresh: L(a.detail, b.detail), flowAlign: L(a.flow, b.flow),
    bloom: L(a.bloom, b.bloom) * (1 + 1.2 * flash), bloomThreshold: L(a.bloomT, b.bloomT), rays: L(a.rays, b.rays) * (1 + 0.8 * flash), rayLength: L(a.rayLen, b.rayLen),
    rayThreshold: L(a.rayT, b.rayT), exposure: L(a.exposure, b.exposure) * (1 + 0.18 * flash), saturation: L(a.sat, b.sat) * (1 + 0.08 * flash), contrast: L(a.contrast, b.contrast),
    vignette: L(a.vignette, b.vignette), grain: 0.004,
    lift: new THREE.Vector3(0.0, 0.0, 0.004), gain: new THREE.Vector3(1, 1, 1),
    shadowTone: new THREE.Vector3(0.94, 0.96, 1.08), highTone: new THREE.Vector3(1.04, 1.0, 0.95),
    rayColor: new THREE.Color(1, 0.86, 0.62),
    ridSize: [L(a.skySize, b.skySize), 1.0, 0.85, 0.9, 1.3, 0.7, 0.3, 1],
    ridDetail: [2.2, L(a.groundDetail, b.groundDetail), 1.0, 1.0, 1.4, 1.0, 0.8, 1.0],
    ridJitter: [L(a.skyJit, b.skyJit), 1, 1, 1, 1, 1, 1, 1],
  };
}
