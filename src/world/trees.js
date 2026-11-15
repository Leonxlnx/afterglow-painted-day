// Procedural trees: recursive branch tubes + painted leaf-cluster cards with spherised normals.
import * as THREE from 'three';
import { makeMaterial, applyMat } from '../render/materials.js';
import { rand } from './heightfield.js';

// ---------- painted leaf atlas (2x2 variants) ----------
export function makeLeafAtlas(size = 1024) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, size, size);
  const half = size / 2;
  let s = 1;
  const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let v = 0; v < 4; v++) {
    const ox = (v % 2) * half, oy = Math.floor(v / 2) * half, cx = ox + half / 2, cy = oy + half / 2;
    const n = v < 2 ? 110 : 70;
    for (let i = 0; i < n; i++) {
      // denser in the middle, ragged at the rim
      const a = R() * Math.PI * 2, rr = Math.pow(R(), 0.6) * half * 0.42;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.92;
      const len = (v < 2 ? 22 : 34) * (0.7 + 0.6 * R()) * size / 1024;
      const wid = len * (v < 2 ? 0.45 : 0.62);
      const rot = a + (R() - 0.5) * 1.6;
      const shade = Math.round(150 + 105 * (0.4 * (1 - rr / (half * 0.42)) + 0.6 * R()));
      g.save(); g.translate(x, y); g.rotate(rot);
      g.fillStyle = `rgb(${shade},${Math.round(R() * 255)},0)`;
      g.beginPath();
      if (v < 2) { // pointed leaf
        g.moveTo(-len, 0); g.quadraticCurveTo(0, -wid, len, 0); g.quadraticCurveTo(0, wid, -len, 0);
      } else { // round painterly dab
        g.ellipse(0, 0, len, wid, 0, 0, Math.PI * 2);
      }
      g.fill(); g.restore();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  return tex;
}

// ---------- geometry generator ----------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function perp(d) { const a = Math.abs(d.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0); return a.cross(d).normalize(); }

export function generateTree(p, seed) {
  let si = 0; const R = () => rand(si++, seed);
  const tube = { pos: [], nor: [], idx: [] };
  const clusters = [];
  const SIDES = 7;
  function addTube(pts, r0, r1) {
    const base = tube.pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const t = i / (pts.length - 1);
      const d = (i < pts.length - 1 ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
      const a = perp(d), b = d.clone().cross(a).normalize();
      const r = r0 + (r1 - r0) * t;
      for (let k = 0; k <= SIDES; k++) {
        const ang = k / SIDES * Math.PI * 2;
        const n = a.clone().multiplyScalar(Math.cos(ang)).addScaledVector(b, Math.sin(ang));
        tube.pos.push(pts[i].x + n.x * r, pts[i].y + n.y * r, pts[i].z + n.z * r);
        tube.nor.push(n.x, n.y, n.z);
      }
    }
    for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < SIDES; k++) {
      const a = base + i * (SIDES + 1) + k, b = a + SIDES + 1;
      tube.idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  function branch(p0, dir, len, rad, depth) {
    const segs = depth === 0 ? 7 : 4;
    const pts = [p0.clone()]; let d = dir.clone();
    for (let i = 1; i <= segs; i++) {
      d.add(V(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(p.wobble)).add(V(0, p.upTend * (depth === 0 ? 0.2 : 1), 0)).normalize();
      pts.push(pts[i - 1].clone().addScaledVector(d, len / segs));
    }
    addTube(pts, rad, rad * (depth === p.depth ? 0.25 : 0.62));
    const end = pts[pts.length - 1];
    if (depth < p.depth) {
      const nc = depth === 0 ? p.kids0 : p.kids;
      for (let c = 0; c < nc; c++) {
        const t = (depth === 0 ? p.start : 0.45) + (1 - (depth === 0 ? p.start : 0.45)) * (c + R() * 0.8) / nc;
        const fi = t * segs, i0 = Math.min(segs - 1, Math.floor(fi));
        const pos = pts[i0].clone().lerp(pts[i0 + 1], fi - i0);
        const ax = perp(d).applyAxisAngle(d, c * 2.39996 + R());
        const ang = p.spread * (0.75 + 0.5 * R());
        const cd = d.clone().applyAxisAngle(ax, ang).add(V(0, p.upTend * 0.6, 0)).normalize();
        branch(pos, cd, len * p.lenScale * (0.85 + 0.3 * R()), rad * p.radScale, depth + 1);
      }
      if (depth >= p.depth - 1 && R() < 0.5) clusters.push({ c: end.clone(), r: p.clusterR * (0.7 + 0.4 * R()) });
    } else {
      clusters.push({ c: end.clone().add(V(0, p.clusterR * 0.2, 0)), r: p.clusterR * (0.8 + 0.5 * R()) });
    }
  }
  branch(V(0, -0.5, 0), V(0, 1, 0), p.trunkLen, p.trunkRad, 0);
  // extra clusters to fill the crown (painterly masses)
  const crown = new THREE.Vector3(); clusters.forEach(c => crown.add(c.c)); crown.divideScalar(clusters.length);
  let crownR = 0; clusters.forEach(c => crownR = Math.max(crownR, c.c.distanceTo(crown) + c.r));
  const fill = Math.round(clusters.length * p.fill);
  for (let i = 0; i < fill; i++) {
    const a = clusters[Math.floor(R() * clusters.length)];
    const b = clusters[Math.floor(R() * clusters.length)];
    clusters.push({ c: a.c.clone().lerp(b.c, R() * 0.5).lerp(crown, 0.15), r: p.clusterR * (0.8 + 0.4 * R()) });
  }
  const fg = buildCards(clusters, p, R);
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(tube.pos, 3));
  tg.setAttribute('normal', new THREE.Float32BufferAttribute(tube.nor, 3));
  tg.setIndex(tube.idx);
  tg.computeBoundingSphere(); fg.computeBoundingSphere();
  return { trunk: tg, foliage: fg, crown, crownR };
}


export function buildCards(clusters, p, R) {
  const card = { pos: [], uv: [], cc: [], idx: [], cr: [] };
  clusters.forEach(cl => {
    const n = cl.n || p.cards;
    for (let k = 0; k < n; k++) {
      const dirv = V(R() - 0.5, R() - 0.5, R() - 0.5).normalize();
      const center = cl.c.clone().addScaledVector(dirv, cl.r * (0.25 + 0.5 * R()));
      const nrm = V(R() - 0.5, R() * 0.6 - 0.2, R() - 0.5).normalize();
      const a = perp(nrm), b = nrm.clone().cross(a);
      const rot = R() * Math.PI * 2;
      const ca = a.clone().multiplyScalar(Math.cos(rot)).addScaledVector(b, Math.sin(rot));
      const cb = nrm.clone().cross(ca);
      const sz = cl.r * p.cardScale * (0.75 + 0.5 * R());
      const variant = p.dabs ? 2 + Math.floor(R() * 2) : Math.floor(R() * 2);
      const u0 = (variant % 2) * 0.5, v0 = Math.floor(variant / 2) * 0.5;
      const base = card.pos.length / 3;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        const q = center.clone().addScaledVector(ca, sx * sz).addScaledVector(cb, sy * sz);
        card.pos.push(q.x, q.y, q.z);
        card.uv.push(u0 + (sx * 0.5 + 0.5) * 0.5, v0 + (sy * 0.5 + 0.5) * 0.5);
        const cc = cl.cc || cl.c;
        card.cc.push(cc.x, cc.y, cc.z); card.cr.push(cl.r);
      });
      card.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  });
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(card.pos, 3));
  fg.setAttribute('uv', new THREE.Float32BufferAttribute(card.uv, 2));
  fg.setAttribute('cCenter', new THREE.Float32BufferAttribute(card.cc, 3));
  fg.setAttribute('cRad', new THREE.Float32BufferAttribute(card.cr, 1));
  fg.setIndex(card.idx);
  fg.computeBoundingSphere();
  return fg;
}

// A free-standing foliage mesh from explicit clusters (vines, ivy, bushes on ruins)
export function createFoliage(clusters, leafTex, { seed = 1, cards = 8, cardScale = 1.0, dabs = false, crown = null, crownR = 3, tint = [1, 1, 1], dark = 1, blossom = 0, pale = 0 } = {}) {
  let si = 0; const R = () => rand(si++, seed);
  const fg = buildCards(clusters, { cards, cardScale, dabs }, R);
  const c = crown || fg.boundingSphere.center.clone();
  const lPair = makeMaterial({
    name: 'leaves', vertex: leafVert, fragment: leafFrag, side: THREE.DoubleSide,
    uniforms: { tLeaf: { value: leafTex }, uCrown: { value: c }, uCrownR: { value: crownR }, uLeafTint: { value: new THREE.Color(...tint) }, uLeafDark: { value: dark }, uBlossom: { value: blossom }, uPale: { value: pale } },
  });
  return applyMat(new THREE.Mesh(fg), lPair);
}

export const ARCHETYPES = {
  oak: { trunkLen: 5.0, trunkRad: 0.5, depth: 3, kids0: 5, kids: 3, start: 0.55, spread: 0.85, lenScale: 0.68, radScale: 0.55, wobble: 0.35, upTend: 0.18, clusterR: 2.4, cards: 11, cardScale: 1.05, fill: 0.5, dabs: true },
  hero: { trunkLen: 6.0, trunkRad: 0.85, depth: 3, kids0: 5, kids: 3, start: 0.5, spread: 1.15, lenScale: 0.78, radScale: 0.56, wobble: 0.34, upTend: 0.1, clusterR: 2.8, cards: 13, cardScale: 1.05, fill: 0.25, dabs: true },
  forest: { trunkLen: 11.0, trunkRad: 0.38, depth: 3, kids0: 5, kids: 2, start: 0.62, spread: 0.65, lenScale: 0.55, radScale: 0.5, wobble: 0.25, upTend: 0.35, clusterR: 1.8, cards: 6, cardScale: 1.0, fill: 0.4, dabs: false },
  forest2: { trunkLen: 13.0, trunkRad: 0.42, depth: 3, kids0: 6, kids: 2, start: 0.66, spread: 0.6, lenScale: 0.5, radScale: 0.5, wobble: 0.2, upTend: 0.4, clusterR: 1.9, cards: 6, cardScale: 1.0, fill: 0.35, dabs: false },
  poplar: { trunkLen: 7.0, trunkRad: 0.3, depth: 2, kids0: 9, kids: 2, start: 0.25, spread: 0.32, lenScale: 0.5, radScale: 0.5, wobble: 0.2, upTend: 0.6, clusterR: 1.6, cards: 10, cardScale: 1.1, fill: 0.9, dabs: true },
  young: { trunkLen: 3.0, trunkRad: 0.2, depth: 2, kids0: 4, kids: 3, start: 0.5, spread: 0.8, lenScale: 0.7, radScale: 0.55, wobble: 0.4, upTend: 0.25, clusterR: 1.4, cards: 9, cardScale: 1.05, fill: 0.5, dabs: false },
  bush: { trunkLen: 0.6, trunkRad: 0.12, depth: 2, kids0: 5, kids: 2, start: 0.2, spread: 1.0, lenScale: 0.8, radScale: 0.6, wobble: 0.5, upTend: 0.1, clusterR: 0.9, cards: 8, cardScale: 1.1, fill: 0.6, dabs: false },
};

// ---------- shaders ----------
const trunkVert = /* glsl */`
varying vec3 vWP; varying vec3 vN; varying float vY;
void main(){
  mat4 m = modelMatrix;
#ifdef USE_INSTANCING
  m = m * instanceMatrix;
#endif
  vec4 wp = m * vec4(position, 1.0);
  vWP = wp.xyz; vN = normalize(mat3(m) * normal); vY = position.y;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const trunkFrag = /* glsl */`
varying vec3 vWP; varying vec3 vN; varying float vY;
void main(){
#ifdef SHADOW_PASS
  oColor = vec4(1.0); return;
#else
  vec3 n = normalize(vN);
  float sh = sunShadow(vWP, n);
  float lit = toonBand(dot(n, uSunDir), 0.18) * sh;
  float bark = gnoise(vec2(atan(n.z, n.x) * 3.0, vWP.y * 1.5)) * 0.5 + 0.5;
  vec3 alb = mix(vec3(0.34, 0.29, 0.25), vec3(0.56, 0.50, 0.44), bark);
  float mossy = smoothstep(0.2, 0.8, -n.x * 0.5 + 0.3) * 0.5;
  vec3 litC = alb * uSunColor * 0.85;
  vec3 shC = mix(alb * 0.36, uGrassShade * 0.7, 0.5);
  litC = mix(litC, uGrassLit * 0.8, mossy); shC = mix(shC, uGrassShade, mossy);
  vec3 col = mix(shC, litC, lit) + alb * hemiAmb(n) * 0.25;
  col *= mix(0.7, 1.0, saturate(vY / 4.0));
  col = applyAtmos(col, vWP);
  writeOut(col, vec2(atan(n.z, n.x) * 0.6 + vWP.x * 0.2, vWP.y), RID_WOOD, vWP);
#endif
}`;

const leafVert = /* glsl */`
attribute vec3 cCenter; attribute float cRad;
uniform vec3 uCrown; uniform float uCrownR;
varying vec3 vWP; varying vec2 vUv; varying vec3 vN; varying float vAO; varying float vRim;
void main(){
  mat4 m = modelMatrix;
#ifdef USE_INSTANCING
  m = m * instanceMatrix;
#endif
  vec4 wp = m * vec4(position, 1.0);
  vec3 cw = (m * vec4(cCenter, 1.0)).xyz;
  vec3 crown = (m * vec4(uCrown, 1.0)).xyz;
  float scale = length(m[0].xyz);
  // wind: whole clusters sway, cards flutter
  float ph = dot(cw, vec3(0.13, 0.07, 0.11));
  float sway = sin(uTime * 1.3 + ph) * 0.5 + sin(uTime * 2.7 + ph * 2.0) * 0.25;
  wp.xyz += uWind * sway * 0.12 * uWindStrength * scale * saturate((cw.y - m[3].y) / (8.0 * scale));
  wp.xyz += vec3(sin(uTime * 4.0 + position.x * 3.0), 0.0, cos(uTime * 3.6 + position.z * 3.0)) * 0.03 * scale;
  vec3 nc = normalize(wp.xyz - cw), nt = normalize(wp.xyz - crown);
  vN = normalize(mix(nt, nc, 0.4));
  vAO = saturate(length(wp.xyz - crown) / (uCrownR * scale) * 1.2);
  vWP = wp.xyz; vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const leafFrag = /* glsl */`
uniform sampler2D tLeaf; uniform vec3 uLeafTint; uniform float uLeafDark; uniform float uBlossom; uniform float uPale;
varying vec3 vWP; varying vec2 vUv; varying vec3 vN; varying float vAO;
void main(){
  vec4 tx = texture(tLeaf, vUv);
  if (tx.a < 0.5) discard;
#ifdef SHADOW_PASS
  oColor = vec4(1.0); return;
#else
  vec3 n = normalize(vN);
  float ndl = dot(n, uSunDir);
  float band = toonBand(ndl + 0.08, 0.16);
  float sh = sunShadow(vWP, n);
  float lit = band * sh;
  float var = tx.r;
  vec3 gl = uGrassLit * uLeafTint * (0.82 + 0.3 * var);
  vec3 gs = uGrassShade * mix(0.85, 1.15, var) * uLeafDark;
  gs = mix(gs, uGrassLit * 0.5, 0.18 * (1.0 - uWarmth));
  gl = mix(gl, gl * vec3(1.1, 1.0, 0.6), tx.g * 0.4);
  vec3 col = mix(gs, gl, lit);
  float term = lit * (1.0 - lit) * 4.0;
  col = satAdjust(col, 1.0 + term * 0.5);
  if (uBlossom > 0.0) {
    vec3 blLit = mix(vec3(0.9, 0.38, 0.56), vec3(1.0, 0.66, 0.78), tx.g);    // ~#f4a6c4
    vec3 blSh = mix(vec3(0.48, 0.10, 0.24), vec3(0.62, 0.2, 0.36), tx.g);      // ~#b85a86
    blLit = mix(blLit, vec3(1.0, 0.78, 0.84), uPale); blSh = mix(blSh, vec3(0.7, 0.42, 0.52), uPale);
    blSh = mix(blSh, blSh * uAmbTop * 2.2, 0.2);
    vec3 bcol = mix(blSh * (0.85 + 0.3 * var), blLit * uSunColor * 0.55 * (0.85 + 0.3 * var), lit);
    // petals glow when the low sun shines through them
    vec3 Vb = normalize(cameraPosition - vWP);
    bcol += blLit * uSunColor * pow(saturate(dot(-Vb, uSunDir)), 3.0) * 0.45 * sh;
    col = mix(col, bcol, uBlossom);
  }
  col *= mix(0.68, 1.0, vAO);
  if (uBlossom > 0.0) col = max(col, mix(vec3(0.48, 0.10, 0.24), vec3(0.7, 0.42, 0.52), uPale) * 0.55);
  // backlight glow through leaves
  vec3 V = normalize(cameraPosition - vWP);
  float back = pow(saturate(dot(-V, uSunDir)), 4.0);
  float edge = 1.0 - saturate(dot(n, V));
  col += uGrassLit * uSunColor * back * (0.2 + edge * 0.6) * 0.5 * sh;
  col = applyAtmos(col, vWP);
  float fdl = length(vWP - cameraPosition);
  col = mix(col, skyFog(normalize(vWP - cameraPosition)), saturate((fdl - 300.0) / 2600.0) * 0.4 * step(60.0, vWP.y));
  vec2 P = abs(n.y) > 0.6 ? vWP.xz : vec2(vWP.x * 0.7 + vWP.z * 0.7, vWP.y);
  writeOut(col, P, RID_FOLIAGE, vWP);
#endif
}`;

export function createTreeKind(def, seed, leafTex, { tint = [1, 1, 1], dark = 1, blossom = 0 } = {}) {
  const t = generateTree(def, seed);
  const tPair = makeMaterial({ name: 'trunk', vertex: trunkVert, fragment: trunkFrag });
  const lPair = makeMaterial({
    name: 'leaves', vertex: leafVert, fragment: leafFrag, side: THREE.DoubleSide, alphaToCoverage: false,
    uniforms: { tLeaf: { value: leafTex }, uCrown: { value: t.crown }, uCrownR: { value: t.crownR }, uLeafTint: { value: new THREE.Color(...tint) }, uLeafDark: { value: dark }, uBlossom: { value: blossom }, uPale: { value: 0 } },
  });
  return { ...t, tPair, lPair };
}

// Instance a tree kind at transforms [{x,y,z,s,r}]
export function instanceTrees(kind, list) {
  const group = new THREE.Group();
  if (!list.length) return group;
  const tm = new THREE.InstancedMesh(kind.trunk, kind.tPair.mat, list.length);
  const fm = new THREE.InstancedMesh(kind.foliage, kind.lPair.mat, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  list.forEach((p, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.r || 0);
    m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.s, p.s * (p.sy || 1), p.s));
    tm.setMatrixAt(i, m); fm.setMatrixAt(i, m);
  });
  tm.computeBoundingSphere(); fm.computeBoundingSphere();
  applyMat(tm, kind.tPair); applyMat(fm, kind.lPair);
  group.add(tm, fm);
  return group;
}
