// World layout + analytic terrain height (JS is the source of truth; GPU gets a baked height texture).
// Forward direction of the journey is -Z. Water level is y = 0.
import * as THREE from 'three';

// ---------- deterministic noise (JS) ----------
function hashi(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}
export function rand(i, s = 0) { return hashi(i | 0, 9137 + (s | 0), s | 0); }
function grad(ix, iy, s) { const a = hashi(ix, iy, s) * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; }
export function gnoise(x, y, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const q = t => t * t * t * (t * (t * 6 - 15) + 10);
  const ux = q(fx), uy = q(fy);
  const g00 = grad(ix, iy, s), g10 = grad(ix + 1, iy, s), g01 = grad(ix, iy + 1, s), g11 = grad(ix + 1, iy + 1, s);
  const a = g00[0] * fx + g00[1] * fy, b = g10[0] * (fx - 1) + g10[1] * fy;
  const c = g01[0] * fx + g01[1] * (fy - 1), d = g11[0] * (fx - 1) + g11[1] * (fy - 1);
  return (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy) * 1.4142;
}
export function fbm(x, y, oct = 5, s = 0) {
  let sum = 0, amp = 0.5;
  for (let i = 0; i < oct; i++) { sum += amp * gnoise(x, y, s + i * 31); const nx = 1.6 * x - 1.2 * y, ny = 1.2 * x + 1.6 * y; x = nx; y = ny; amp *= 0.5; }
  return sum;
}
export const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ---------- polylines ----------
function polyDist(px, pz, pts) {
  let best = 1e9, bt = 0, bx = 0, bz = 0, acc = 0, total = 0;
  for (let i = 0; i < pts.length - 1; i++) total += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx2, bz2] = pts[i + 1];
    const dx = bx2 - ax, dz = bz2 - az, L2 = dx * dx + dz * dz, L = Math.sqrt(L2);
    let t = ((px - ax) * dx + (pz - az) * dz) / L2; t = clamp(t, 0, 1);
    const cx = ax + dx * t, cz = az + dz * t, d = Math.hypot(px - cx, pz - cz);
    if (d < best) { best = d; bt = (acc + t * L) / total; bx = cx; bz = cz; }
    acc += L;
  }
  return { d: best, t: bt, x: bx, z: bz };
}
// smooth the polyline with Catmull-Rom so the river/path are curvy
function smoothPoly(pts, sub = 8) {
  const v = pts.map(p => new THREE.Vector3(p[0], 0, p[1]));
  const c = new THREE.CatmullRomCurve3(v, false, 'centripetal');
  return c.getPoints(pts.length * sub).map(p => [p.x, p.z]);
}

// cached distance grids (1 m) so heightAt() stays fast
function makeGrid(pts, x0, z0, x1, z1, step = 1) {
  const nx = Math.ceil((x1 - x0) / step) + 1, nz = Math.ceil((z1 - z0) / step) + 1;
  const D = new Float32Array(nx * nz), T = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const r = polyDist(x0 + i * step, z0 + j * step, pts); D[j * nx + i] = r.d; T[j * nx + i] = r.t;
  }
  return { pts, x0, z0, x1, z1, step, nx, nz, D, T };
}
function gridDist(g, x, z) {
  if (x < g.x0 || x > g.x1 - g.step || z < g.z0 || z > g.z1 - g.step) return polyDist(x, z, g.pts);
  const fx = (x - g.x0) / g.step, fz = (z - g.z0) / g.step;
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, nx = g.nx;
  const k = j * nx + i;
  const bl = (A) => (A[k] * (1 - u) + A[k + 1] * u) * (1 - v) + (A[k + nx] * (1 - u) + A[k + nx + 1] * u) * v;
  return { d: bl(g.D), t: bl(g.T) };
}
let RIVER_G = null, PATH_G = null;
function riverD(x, z) { if (!RIVER_G) RIVER_G = makeGrid(RIVER, -330, -330, 330, 170, 1); return gridDist(RIVER_G, x, z); }
function pathD(x, z) { if (!PATH_G) PATH_G = makeGrid(FOOTPATH, -60, -300, 60, -60, 0.5); return gridDist(PATH_G, x, z); }

export const RIVER = smoothPoly([[6, 120], [5, 60], [2, 25], [-1, -5], [-3.5, -35], [-2.5, -60], [-2, -78], [-8, -98], [-30, -116], [-62, -128], [-110, -136], [-180, -142], [-260, -150]]);
export const FOOTPATH = smoothPoly([[3, -84], [5, -110], [2, -140], [4, -175], [1, -205], [3, -232], [1, -250], [-1, -260]]);

export const WORLD = {
  waterLevel: 0,
  viaductZ: -78,
  viaductDeck: 17.5,
  hill: { x: -1, z: -262 },
  coastBase: -282,
};

export function coastZ(x) {
  const ax = Math.abs(x);
  let z = WORLD.coastBase + 7 * Math.sin(x * 0.031 + 1.0) + 4 * Math.sin(x * 0.083) + 9 * Math.sin(x * 0.012 + 2.0) * smoothstep(60, 200, ax);
  // headlands framing the bay, receding again far away (open sea beyond)
  const head = 430 * smoothstep(105, 340, ax) * (x > 0 ? 1.0 : 0.85);
  const back = 260 * smoothstep(650, 1500, ax);
  z -= head - back;
  return z;
}

export function riverInfo(x, z) { return riverD(x, z); }

// ---------- the terrain function ----------
export function heightAt(x, z) {
  // gentle rolling meadow
  let h = 0.9 + 0.9 * fbm(x * 0.011, z * 0.011, 4, 1) + 0.25 * fbm(x * 0.05, z * 0.05, 3, 7);
  // valley walls (hills either side)
  const dx = Math.abs(x - 4);
  const wallN = 0.6 + 0.4 * fbm(x * 0.006, z * 0.006, 3, 3);
  const nearCoast = 1 - 0.55 * smoothstep(-220, -420, z);
  h += (smoothstep(55, 165, dx) * 46 * wallN + smoothstep(140, 320, dx) * 40 * wallN) * nearCoast;
  // slope up to the plateau with the forest
  const rise = smoothstep(-118, -238, z);
  h += rise * (31 + 3 * fbm(x * 0.02, z * 0.02, 3, 11));
  // hilltop knoll
  const hx = x - WORLD.hill.x, hz = z - WORLD.hill.z;
  h += 5.2 * Math.exp(-(hx * hx + hz * hz) / (2 * 17 * 17));
  // river carve (only where the land is low)
  const r = riverD(x, z);
  const halfW = 4.2 + 1.5 * Math.sin(r.t * 40);
  const carve = 1 - smoothstep(halfW, halfW + 5.5, r.d);
  if (carve > 0) h = lerp(h, -1.15 + 0.25 * fbm(x * 0.2, z * 0.2, 2, 5), carve * (1 - rise));
  // footpath: a slight worn groove
  const p = pathD(x, z);
  h -= 0.12 * (1 - smoothstep(0.6, 1.6, p.d));
  // cliffs to the sea
  const cz = coastZ(x) + 14 * fbm(x * 0.03, z * 0.03, 3, 41);
  const shoreW = 16 + 44 * smoothstep(110, 230, Math.abs(x));
  if (z < cz + 4) {
    const t = smoothstep(cz + 4, cz - shoreW, z);
    const rock = 2.2 * fbm(x * 0.07, z * 0.07, 3, 21);
    h = lerp(h, -7.5 + rock, Math.pow(t, 0.85));
  }
  return h;
}

export function normalAt(x, z, e = 0.35) {
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return new THREE.Vector3(-hx, 2 * e, -hz).normalize();
}

export function footpathInfo(x, z) { return pathD(x, z); }

// Bake a height texture for GPU lookups (water depth, foam, etc.)
export function bakeHeightTexture({ x0 = -320, x1 = 320, z0 = -420, z1 = 160, res = 1024 } = {}) {
  const data = new Float32Array(res * res);
  for (let j = 0; j < res; j++) {
    const z = z0 + (z1 - z0) * (j / (res - 1));
    for (let i = 0; i < res; i++) {
      const x = x0 + (x1 - x0) * (i / (res - 1));
      data[j * res + i] = heightAt(x, z);
    }
  }
  const tex = new THREE.DataTexture(data, res, res, THREE.RedFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return { tex, bounds: new THREE.Vector4(x0, z0, x1 - x0, z1 - z0) };
}

// ---------- dense cached grid over the near region (matches the near terrain mesh) ----------
export const NEAR = { x0: -150, x1: 150, z0: -330, z1: 70, step: 0.5 };
let NEARG = null;
export function nearGrid() {
  if (NEARG) return NEARG;
  const nx = Math.round((NEAR.x1 - NEAR.x0) / NEAR.step) + 1, nz = Math.round((NEAR.z1 - NEAR.z0) / NEAR.step) + 1;
  const H = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) { const z = NEAR.z0 + j * NEAR.step; for (let i = 0; i < nx; i++) H[j * nx + i] = heightAt(NEAR.x0 + i * NEAR.step, z); }
  NEARG = { nx, nz, H };
  return NEARG;
}
export function hNear(x, z) {
  const g = nearGrid();
  const fx = (x - NEAR.x0) / NEAR.step, fz = (z - NEAR.z0) / NEAR.step;
  if (fx < 0 || fz < 0 || fx >= g.nx - 1 || fz >= g.nz - 1) return heightAt(x, z);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * g.nx + i;
  // match the mesh triangulation (a,c,b / b,c,d)
  const a = g.H[k], b = g.H[k + 1], c = g.H[k + g.nx], d = g.H[k + g.nx + 1];
  if (u + v <= 1) return a + (b - a) * u + (c - a) * v;
  return d + (c - d) * (1 - u) + (b - d) * (1 - v);
}
export function nNear(x, z, e = 0.5) {
  const hx = hNear(x + e, z) - hNear(x - e, z), hz = hNear(x, z + e) - hNear(x, z - e);
  const l = Math.hypot(hx, 2 * e, hz);
  return { x: -hx / l, y: 2 * e / l, z: -hz / l };
}
