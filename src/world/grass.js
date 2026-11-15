// Chunked instanced grass blades + flowers, density driven by distance to the camera route.
import * as THREE from 'three';
import { makeMaterial, applyMat } from '../render/materials.js';
import { hNear as heightAt, nNear, riverInfo, footpathInfo, rand, fbm, smoothstep, coastZ } from './heightfield.js';

// --------- blade geometry: tapered strip, 4 segments ---------
function bladeGeometry() {
  const segs = 4, pos = [], uv = [];
  for (let i = 0; i <= segs; i++) {
    const v = i / segs;
    if (i < segs) { pos.push(-0.5, v, 0, 0.5, v, 0); uv.push(0, v, 1, v); }
    else { pos.push(0, 1, 0); uv.push(0.5, 1); }
  }
  const idx = [];
  for (let i = 0; i < segs - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const a = (segs - 1) * 2; idx.push(a, a + 1, a + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// --------- flower geometry: 5-lobed disk on a short stem quad ---------
function flowerGeometry() {
  const pos = [0, 0, 0], kind = [1];
  const N = 15;
  for (let i = 0; i <= N; i++) {
    const a = i / N * Math.PI * 2;
    const r = 0.55 + 0.45 * Math.pow(Math.abs(Math.cos(a * 2.5)), 0.7);
    pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); kind.push(1);
  }
  const idx = [];
  for (let i = 1; i <= N; i++) idx.push(0, i + 1, i);
  // stem (thin vertical quad) indices after disk
  const s0 = pos.length / 3;
  pos.push(-0.06, -6, 0, 0.06, -6, 0, -0.06, 0, 0, 0.06, 0, 0); kind.push(0, 0, 0, 0);
  idx.push(s0, s0 + 1, s0 + 2, s0 + 1, s0 + 3, s0 + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('kind', new THREE.Float32BufferAttribute(kind, 1));
  g.setIndex(idx);
  return g;
}

const WIND = /* glsl */`
// rolling gusts that travel across the meadow
float gust(vec2 p, float t){
  float a = dot(p, uWind.xz);
  float w = 0.55 + 0.45 * sin(a * 0.11 - t * 1.9 + gnoise(p * 0.03 + t * 0.07) * 2.5);
  w += 0.35 * gnoise(p * 0.06 - uWind.xz * t * 0.35);
  return w * uWindStrength;
}`;

const grassVert = WIND + /* glsl */`
attribute vec4 iPos;   // x y z rot
attribute vec4 iShape; // height width bend seed
attribute vec3 iNorm;  // terrain normal
varying vec3 vWP; varying float vH; varying float vSeed; varying vec3 vTN; varying float vGust;
void main(){
  float h = iShape.x, w = iShape.y, bend = iShape.z;
  float v = position.y;
  float c = cos(iPos.w), s = sin(iPos.w);
  vec3 side = vec3(c, 0.0, s), face = vec3(-s, 0.0, c);
  float g = gust(iPos.xz, uTime);
  vec3 lean = face * bend + uWind * g * 0.55;
  vec3 p = iPos.xyz + side * position.x * w * (1.0 - v * 0.85) + vec3(0.0, v * h, 0.0) + lean * h * v * v;
  // keep blade length roughly constant when bending
  p.y -= dot(lean, lean) * h * v * v * 0.35;
  vWP = p; vH = v; vSeed = iShape.w; vTN = iNorm; vGust = g;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const grassFrag = /* glsl */`
varying vec3 vWP; varying float vH; varying float vSeed; varying vec3 vTN; varying float vGust;
uniform sampler2D uPathTex; uniform vec4 uPathBounds;
void main(){
  vec3 n = normalize(vTN);
  float forest = texture(uPathTex, (vWP.xz - uPathBounds.xy) / uPathBounds.zw).b;
  float ndl = dot(n, uSunDir);
  float band = grazeLit(ndl, toonBand(ndl, 0.15));
  float sh = sunShadow(vWP, n);
  float lit = band * sh;
  float big = fbm3(vWP.xz * 0.018);
  vec3 gl = uGrassLit * (1.0 + 0.16 * big);
  vec3 gs = uGrassShade;
  gl = mix(gl, gl * vec3(1.15, 1.0, 0.55), saturate(big * 1.5 + 0.2) * 0.5);
  // per-blade variety
  float r = fract(vSeed * 7.13);
  gl *= 0.86 + 0.28 * r; gs *= 0.85 + 0.3 * fract(vSeed * 3.7);
  gl = mix(gl, gl * vec3(0.9, 1.05, 1.25), step(0.82, r) * 0.6);
  gs = mix(gs, gl * 0.62, 0.1 * forest);
  vec3 col = mix(gs, gl, lit);
  // height gradient: dark roots, bright tips; wind waves show lighter sheen
  col *= mix(0.55, 1.12, smoothstep(0.0, 1.0, vH));
  col *= 1.0 + (vGust - 0.6) * 0.18 * vH;
  float term = lit * (1.0 - lit) * 4.0;
  col = satAdjust(col, 1.0 + term * 0.4);
  // backlit translucency
  vec3 V = normalize(cameraPosition - vWP);
  float back = pow(saturate(dot(-V, uSunDir)), 3.0);
  col += uGrassLit * uSunColor * back * vH * vH * 0.42 * sh;
  col = applyAtmos(col, vWP);
  writeOut(col, vWP.xz, RID_GROUND, vWP);
}`;

const flowerVert = WIND + /* glsl */`
attribute vec4 iPos;   // x y z size
attribute vec4 iCol;   // rgb, seed
attribute float kind;
varying vec3 vWP; varying vec3 vCol; varying float vKind; varying float vSeed;
void main(){
  float sz = iPos.w;
  float stemH = sz * 6.0;
  float g = gust(iPos.xz, uTime);
  vec3 p = position * sz;
  // tilt the disk toward the viewer a little & with the wind
  float a = iCol.w * 6.283;
  vec3 tilt = vec3(cos(a), 0.0, sin(a)) * 0.35 + uWind * g * 0.25;
  p.y += p.x * tilt.x + p.z * tilt.z;
  vec3 top = iPos.xyz + vec3(0.0, stemH, 0.0) + uWind * g * stemH * 0.3;
  vec3 wp = (kind > 0.5) ? top + p : mix(iPos.xyz, top, (position.y + 6.0) / 6.0) + vec3(position.x * sz, 0.0, 0.0);
  vWP = wp; vCol = iCol.rgb; vKind = kind; vSeed = iCol.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const flowerFrag = /* glsl */`
varying vec3 vWP; varying vec3 vCol; varying float vKind; varying float vSeed;
void main(){
  float sh = sunShadow(vWP, vec3(0.0, 1.0, 0.0));
  float lit = toonBand(uSunDir.y + 0.15, 0.2) * sh;
  vec3 base = vKind > 0.5 ? vCol : uGrassShade * 1.2;
  vec3 col = paintLight(base, vec3(0.0, 1.0, 0.0), lit, 1.0) * mix(0.45, 1.0, smoothstep(-0.05, 0.1, uSunDir.y));
  col += base * uSunColor * 0.12 * (1.0 - lit) * smoothstep(-0.04, 0.12, uSunDir.y); // flowers stay luminous in shade (not at dusk)
  col = applyAtmos(col, vWP);
  writeOut(col, vWP.xz, RID_GROUND, vWP);
}`;

export function createGrass({ routePts, quality = 'high', extraAreas = [], mask = null }) {
  const group = new THREE.Group();
  const dens = quality === 'demo' ? 0.3 : 1.0;
  const CH = 8;
  // distance to the camera route (xz), precomputed on a coarse grid for speed
  const routeD = (x, z) => { let b = 1e9; for (const p of routePts) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < b) b = d; } return Math.sqrt(b); };
  const bladeG = bladeGeometry(), flowerG = flowerGeometry();
  const gPair = makeMaterial({ name: 'grass', vertex: grassVert, fragment: grassFrag, side: THREE.DoubleSide, castShadow: false,
    uniforms: { uPathTex: { value: mask ? mask.tex : null }, uPathBounds: { value: mask ? mask.bounds : new THREE.Vector4(0, 0, 1, 1) } } });
  const fPair = makeMaterial({ name: 'flowers', vertex: flowerVert, fragment: flowerFrag, side: THREE.DoubleSide, castShadow: false });
  const palette = ['#ff5fa2', '#ff86c0', '#c868ff', '#9a6bff', '#ffd25a', '#ffffff', '#ff8a4a', '#f2f0ff', '#ff4f7a'].map(h => new THREE.Color(h));
  let totalB = 0, totalF = 0;
  for (let cz = -300; cz < 70; cz += CH) for (let cx = -120; cx < 120; cx += CH) {
    const mx = cx + CH / 2, mz = cz + CH / 2;
    let rd = routeD(mx, mz);
    for (const a of extraAreas) rd = Math.min(rd, Math.max(0, Math.hypot(mx - a.x, mz - a.z) - a.r) * 0.6);
    if (rd > 95) continue;
    const near = 1 - smoothstep(10, 85, rd);
    const bladesPerM2 = dens * (6 + 44 * near * near);
    const n = Math.round(bladesPerM2 * CH * CH);
    const ip = [], is = [], inn = [];
    const fp = [], fc = [];
    const seed = (cx * 73856093) ^ (cz * 19349663);
    for (let i = 0; i < n; i++) {
      const x = cx + rand(i, seed) * CH, z = cz + rand(i, seed + 1) * CH;
      const y = heightAt(x, z);
      if (y < 0.08) continue;
      if (z < coastZ(x) + 2) continue;
      const nrm = nNear(x, z, 0.5);
      if (nrm.y < 0.8) continue;
      const pd = footpathInfo(x, z).d;
      if (pd < 0.8 + rand(i, seed + 2) * 0.6) continue;
      const patch = fbm(x * 0.05, z * 0.05, 3, 77);
      const tall = 0.32 + 0.4 * smoothstep(-0.3, 0.6, patch) + 0.25 * rand(i, seed + 3);
      const river = riverInfo(x, z).d;
      const h = tall * (river < 9 ? 1.25 : 1) * (z < -130 && z > -240 ? 0.75 : 1);
      ip.push(x, y - 0.03, z, rand(i, seed + 4) * Math.PI * 2);
      is.push(h, 0.035 + 0.03 * rand(i, seed + 5), (rand(i, seed + 6) - 0.5) * 0.6, rand(i, seed + 7));
      inn.push(nrm.x, nrm.y, nrm.z);
    }
    // flowers in patches
    const nf = Math.round(dens * (2 + 26 * near) * CH * CH * 0.23);
    for (let i = 0; i < nf; i++) {
      const x = cx + rand(i, seed + 11) * CH, z = cz + rand(i, seed + 12) * CH;
      const patch = fbm(x * 0.04 + 3, z * 0.04, 3, 91);
      if (patch < 0.05 + rand(i, seed + 13) * 0.3) continue;
      const y = heightAt(x, z);
      if (y < 0.1 || z < coastZ(x) + 2) continue;
      if (footpathInfo(x, z).d < 1.2) continue;
      const pal = palette[Math.floor((fbm(x * 0.02, z * 0.02, 2, 5) * 0.5 + 0.5) * 4.0 + rand(i, seed + 14) * 3.2) % palette.length];
      const sz = 0.05 + 0.05 * rand(i, seed + 15);
      fp.push(x, y, z, sz); fc.push(pal.r, pal.g, pal.b, rand(i, seed + 16));
    }
    if (ip.length) {
      const g = new THREE.InstancedBufferGeometry();
      g.index = bladeG.index; g.attributes.position = bladeG.attributes.position; g.attributes.uv = bladeG.attributes.uv;
      g.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(ip), 4));
      g.setAttribute('iShape', new THREE.InstancedBufferAttribute(new Float32Array(is), 4));
      g.setAttribute('iNorm', new THREE.InstancedBufferAttribute(new Float32Array(inn), 3));
      g.instanceCount = ip.length / 4;
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(mx, heightAt(mx, mz), mz), CH * 0.75 + 4);
      const m = applyMat(new THREE.Mesh(g), gPair); m.userData.noReflect = true;
      group.add(m); totalB += g.instanceCount;
    }
    if (fp.length) {
      const g = new THREE.InstancedBufferGeometry();
      g.index = flowerG.index; g.attributes.position = flowerG.attributes.position; g.attributes.kind = flowerG.attributes.kind;
      g.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(fp), 4));
      g.setAttribute('iCol', new THREE.InstancedBufferAttribute(new Float32Array(fc), 4));
      g.instanceCount = fp.length / 4;
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(mx, heightAt(mx, mz), mz), CH * 0.75 + 4);
      const m = applyMat(new THREE.Mesh(g), fPair); m.userData.noReflect = true;
      group.add(m); totalF += g.instanceCount;
    }
  }
  return { group, totalB, totalF };
}
