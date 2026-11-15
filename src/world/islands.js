// Floating islands with waterfalls, sea stacks and distant mountain ridges.
import * as THREE from 'three';
import { makeMaterial, applyMat } from '../render/materials.js';
import { rand, fbm, gnoise } from './heightfield.js';
import { createFoliage, instanceTrees } from './trees.js';

const vert = /* glsl */`
uniform float uBob;
varying vec3 vWP; varying vec3 vN; varying vec3 vLP;
void main(){
  mat4 m = modelMatrix;
#ifdef USE_INSTANCING
  m = m * instanceMatrix;
#endif
  vec4 wp = m * vec4(position, 1.0);
  wp.y += sin(uTime * 0.35 + m[3].x * 0.01) * uBob;
  vWP = wp.xyz; vN = normalize(mat3(m) * normal); vLP = position;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const frag = /* glsl */`
varying vec3 vWP; varying vec3 vN; varying vec3 vLP;
uniform vec3 uRockA; uniform vec3 uRockB; uniform float uFar;
void main(){
#ifdef SHADOW_PASS
  oColor = vec4(1.0); return;
#else
  vec3 n = normalize(vN);
  float sh = uFar > 0.5 ? 1.0 : sunShadow(vWP, n);
  float lit = toonBand(dot(n, uSunDir), 0.14) * sh;
  float strata = gnoise(vec2(vLP.y * 2.2, (vLP.x + vLP.z) * 0.25)) * 0.5 + 0.5;
  vec3 rock = mix(uRockA, uRockB, strata) * (0.85 + 0.3 * gnoise(vLP.xz * 1.3));
  vec3 col = paintLight(rock, n, lit, 1.0);
  vec3 Vv = normalize(cameraPosition - vWP);
  // islands float in bright air: skylight fill from below/around + warm rim on the sun-facing edge
  col += rock * skyGradient(normalize(n + vec3(0.0, 0.3, 0.0))) * 0.55 * (1.0 - uFar);
  col += rock * uHorizonGlow * 0.45 * smoothstep(0.1, -0.8, n.y) * (1.0 - uFar); // warm bounce from the sea on the undersides
  col += mix(uCloudRim, uSunColor * 0.6, 0.5) * pow(1.0 - saturate(dot(n, Vv)), 2.5) * (0.35 + 1.2 * pow(saturate(dot(-Vv, uSunDir)), 1.5));
  float grassM = smoothstep(0.45, 0.75, n.y + gnoise(vWP.xz * 0.2) * 0.25);
  vec3 g = mix(uGrassShade, uGrassLit, lit);
  col = mix(col, g, grassM);
  col = applyAtmos(col, vWP);
  float fd = length(vWP - cameraPosition);
  col = mix(col, skyFog(normalize(vWP - cameraPosition)), saturate((fd - 300.0) / 2600.0) * 0.4);
  writeOut(col, triP(vWP, n), grassM > 0.5 ? RID_GROUND : RID_STONE, vWP);
#endif
}`;

const fallVert = /* glsl */`
attribute float along;
varying vec3 vWP; varying vec2 vUv2; varying float vAlong;
void main(){
  vec3 p = position;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWP = wp.xyz; vUv2 = uv; vAlong = along;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const fallFrag = /* glsl */`
varying vec3 vWP; varying vec2 vUv2; varying float vAlong;
void main(){
  float streak = vnoise(vec2(vUv2.x * 9.0, vUv2.y * 1.2 - uTime * 2.2)) * 0.6 + vnoise(vec2(vUv2.x * 23.0, vUv2.y * 3.0 - uTime * 3.5)) * 0.4;
  float edge = 1.0 - smoothstep(0.25, 0.5, abs(vUv2.x - 0.5) + (vnoise(vec2(vUv2.y * 6.0 - uTime, 3.0)) - 0.5) * 0.25);
  float dissolve = smoothstep(0.55, 1.0, vAlong + (streak - 0.5) * 0.4);
  if (edge < 0.5 || dissolve > 0.5) discard;
  vec3 col = mix(uSkyHorizon * 0.9, vec3(1.0), 0.5 + 0.5 * streak) * (uSunColor * 0.35 + uAmbTop * 0.7);
  col = applyAtmos(col, vWP);
  writeOut(col, vec2(vWP.x + vWP.z, vWP.y) * 0.5, RID_WATER, vWP);
}`;

function islandGeometry(R, depth, seed) {
  const g = new THREE.SphereGeometry(1, 72, 48);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const rim = 1 + 0.18 * gnoise(Math.cos(a) * 2 + seed, Math.sin(a) * 2) + 0.08 * gnoise(Math.cos(a) * 6, Math.sin(a) * 6 + seed);
    if (y > 0) {
      const r = Math.hypot(x, z);
      x *= rim; z *= rim;
      y = 0.06 * (1 - r * r) + 0.05 * gnoise(x * 3 + seed, z * 3) - 0.04 * Math.pow(r, 8);
    } else {
      const t = -y; // 0 rim .. 1 bottom
      const prof = Math.pow(Math.max(0, 1 - Math.pow(t, 1.8)), 0.55);
      const k = 1 + 0.32 * gnoise(a * 2.5 + seed, t * 3) + 0.14 * gnoise(a * 7, t * 9 + seed) + 0.06 * Math.round(gnoise(t * 6, a + seed) * 3);
      x *= rim * k * (0.12 + 0.88 * prof); z *= rim * k * (0.12 + 0.88 * prof);
      y = -t * depth / R + 0.1 * gnoise(x * 4, z * 4 + seed);
      // stalactite tip wobble
      x += 0.15 * t * t * Math.sin(seed); z += 0.15 * t * t * Math.cos(seed);
    }
    p.setXYZ(i, x * R, y * R, z * R);
  }
  g.computeVertexNormals();
  return g;
}

function stackGeometry(r, h, seed) {
  const g = new THREE.CylinderGeometry(r * 0.75, r * 1.2, h, 28, 18);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x), rr = Math.hypot(x, z);
    if (rr < 0.01) { if (y > 0) p.setY(i, y + 0.6 * gnoise(seed, 1)); continue; }
    const k = 1 + 0.22 * gnoise(a * 2 + seed, y * 0.08) + 0.1 * gnoise(a * 7, y * 0.3 + seed) + 0.06 * Math.round(gnoise(y * 0.25, seed) * 3) / 3;
    p.setXYZ(i, x * k, y, z * k);
  }
  g.translate(0, h / 2 - 6, 0);
  g.computeVertexNormals();
  return g;
}

function ridgeGeometry(dist, arc0, arc1, hMax, seed, segs = 360) {
  const pos = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const a = arc0 + (arc1 - arc0) * i / segs;
    const u = i / segs;
    const ridge = 1 - Math.abs(fbm(u * 3.2 + seed, seed, 3, seed)) * 1.5;
    const massif = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(u * Math.PI * 3.0 + seed)), 2);
    const h = hMax * (0.12 + 0.88 * Math.max(0, ridge) ** 2 * massif);
    const x = Math.sin(a) * dist, z = -Math.cos(a) * dist;
    const back = 1.12;
    pos.push(x, -20, z, x * 1.0, Math.max(5, h), z * 1.0, x * back, Math.max(5, h * 0.6), z * back);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 3, b = a + 3;
    idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export function createIslands({ leafTex, kinds }) {
  const group = new THREE.Group();
  const near = makeMaterial({ name: 'island', vertex: vert, fragment: frag,
    uniforms: { uBob: { value: 0.0 }, uRockA: { value: new THREE.Color('#9a6e7e') }, uRockB: { value: new THREE.Color('#d4a48c') }, uFar: { value: 0 } } });
  const stackM = makeMaterial({ name: 'stack', vertex: vert, fragment: frag,
    uniforms: { uBob: { value: 0 }, uRockA: { value: new THREE.Color('#7c7280') }, uRockB: { value: new THREE.Color('#b8a08c') }, uFar: { value: 0 } } });
  const fallPair = makeMaterial({ name: 'fall', vertex: fallVert, fragment: fallFrag, side: THREE.DoubleSide, castShadow: false });
  const ISL = [
    // x, y, z, radius, depth, waterfall
    [-228, 96, -765, 40, 46, 0], [380, 130, -911, 70, 70, 0], [532, 268, -2388, 60, 60, 0],
  ];
  const treeLists = { oak: [], young: [], poplar: [] };
  ISL.forEach(([x, y, z, R, D, fall], k) => {
    const m = applyMat(new THREE.Mesh(islandGeometry(R, D, k * 3.1 + 1)), near);
    m.position.set(x, y, z); m.rotation.y = rand(k, 900) * 6;
    m.scale.set(1.25, 1, 0.85);
    group.add(m);
    // trees on top
    const nt = Math.round(R * 0.55);
    for (let i = 0; i < nt; i++) {
      const a = rand(i, k * 10 + 1) * 6.28, r = Math.sqrt(rand(i, k * 10 + 2)) * R * 0.72;
      const kind = ['oak', 'young', 'poplar'][Math.floor(rand(i, k * 10 + 3) * 3)];
      const lx = Math.cos(a) * r * 1.25, lz = Math.sin(a) * r * 0.85, th = m.rotation.y;
      const ty = y + 0.06 * R * (1 - (r / R) ** 2) - 0.4;
      treeLists[kind].push({ x: x + lx * Math.cos(th) + lz * Math.sin(th), y: ty, z: z - lx * Math.sin(th) + lz * Math.cos(th), s: (1.1 + rand(i, k * 10 + 4) * 0.8) * Math.min(1.6, R / 25), r: rand(i, k) * 6 });
    }
    // hanging roots/vines
    const cl = [];
    for (let i = 0; i < R * 2.2; i++) {
      const a = rand(i, k * 20 + 5) * 6.28, rr = R * (0.85 + 0.15 * rand(i, k * 20 + 6));
      const len = R * (0.2 + 0.5 * rand(i, k * 20 + 7));
      for (let yy = 0; yy < len; yy += 1.4) cl.push({ c: new THREE.Vector3(x + Math.cos(a) * rr * (1 - yy / len * 0.25), y - 1 - yy, z + Math.sin(a) * rr * (1 - yy / len * 0.25)), r: 1.2 * (1 - yy / len * 0.5), n: 3 });
    }
    group.add(createFoliage(cl, leafTex, { seed: 300 + k, cards: 3, cardScale: 1.1, crownR: R }));
    if (fall && false) {
      const a = rand(k, 950) * 6.28;
      const ex = x + Math.cos(a) * R * 0.95, ez = z + Math.sin(a) * R * 0.95;
      const len = 60 + D * 1.4, w = R * 0.32;
      const fg = new THREE.PlaneGeometry(w, len, 1, 24);
      const along = new Float32Array(fg.attributes.position.count);
      const p = fg.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const t = Math.min(1, Math.max(0, (len / 2 - p.getY(i)) / len)); along[i] = t;
        // arc outward then fall
        p.setXYZ(i, p.getX(i) * (1 + t * 1.8), -t * len, Math.sqrt(t) * 6 + t * 4);
      }
      fg.setAttribute('along', new THREE.BufferAttribute(along, 1));
      const fm = applyMat(new THREE.Mesh(fg), fallPair);
      fm.position.set(ex, y + 0.2, ez); fm.rotation.y = -a + Math.PI / 2;
      fm.userData.noReflect = false;
      group.add(fm);
    }
  });
  for (const k of Object.keys(treeLists)) group.add(instanceTrees(kinds['isl_' + k] || kinds[k], treeLists[k]));
  // sea stacks off the coast
  const STK = [[-142, -405, 10.5, 62], [176, -455, 9, 44]];
  const stl = { young: [], bush: [] };
  STK.forEach(([x, z, r, h], k) => {
    const m = applyMat(new THREE.Mesh(stackGeometry(r, h, k * 7.7)), stackM);
    m.position.set(x, 0, z); group.add(m);
    for (let i = 0; i < 0; i++) stl['bush'].push({ x: x + (rand(i, k + 600) - 0.5) * r, y: h - 6.2, z: z + (rand(i, k + 601) - 0.5) * r, s: 0.7 + rand(i, k) * 0.6, r: rand(i, k + 2) * 6 });
  });
  for (const k of Object.keys(stl)) group.add(instanceTrees(kinds[k], stl[k]));
  // distant ridges across the sea (two layers)
  const far = makeMaterial({ name: 'ridge', vertex: vert, fragment: frag, castShadow: false,
    uniforms: { uBob: { value: 0 }, uRockA: { value: new THREE.Color('#4e4e7e') }, uRockB: { value: new THREE.Color('#6c6898') }, uFar: { value: 1 } } });
  const r2 = applyMat(new THREE.Mesh(ridgeGeometry(7000, -1.2, 1.2, 760, 7.1, 520)), far);
  r2.position.z = -260;
  // (distant ridge removed: read as a palisade at the horizon)
  return { group };
}
