// Overgrown stone viaduct + scattered column drums; stone shaded with painted ashlar blocks and moss.
import * as THREE from 'three';
import { makeMaterial, applyMat } from '../render/materials.js';
import { heightAt, rand, WORLD } from './heightfield.js';
import { createFoliage } from './trees.js';

const vert = /* glsl */`
varying vec3 vWP; varying vec3 vN;
void main(){
  mat4 m = modelMatrix;
#ifdef USE_INSTANCING
  m = m * instanceMatrix;
#endif
  vec4 wp = m * vec4(position, 1.0);
  vWP = wp.xyz; vN = normalize(mat3(m) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const frag = /* glsl */`
varying vec3 vWP; varying vec3 vN;
uniform vec3 uStoneA; uniform vec3 uStoneB;
void main(){
#ifdef SHADOW_PASS
  oColor = vec4(1.0); return;
#else
  vec3 n = normalize(vN);
  vec3 wp = vWP;
  // ashlar blocks: rows along y, staggered joints along the dominant horizontal axis
  vec3 an = abs(n);
  float hcoord = an.x > an.z ? wp.z : wp.x;
  float rowH = 0.62;
  float row = floor(wp.y / rowH);
  float bl = 1.1 + 0.6 * h21(vec2(row, 3.0));
  float hc = hcoord / bl + h21(vec2(row, 7.0));
  vec2 cell = vec2(floor(hc), row);
  float fy = fract(wp.y / rowH), fx = fract(hc);
  float mortar = (an.y > 0.7) ? 0.0 : (1.0 - smoothstep(0.0, 0.06, min(min(fy, 1.0 - fy) * rowH, min(fx, 1.0 - fx) * bl)));
  float bv = h21(cell);
  vec3 alb = mix(uStoneA, uStoneB, bv * 0.7 + 0.3 * gnoise(wp.xy * 0.4 + wp.zx * 0.4));
  alb *= 1.0 - mortar * 0.5;
  alb *= 0.8 + 0.4 * h21(cell + 3.0);
  // rain streaks
  float streak = smoothstep(0.55, 1.0, vnoise(vec2(hcoord * 2.2, wp.y * 0.08))) * 0.2;
  alb *= 1.0 - streak;
  // moss: on top faces and in patches, hard painterly edges
  float mossN = fbm3(wp.xz * 0.35 + wp.y * 0.2);
  float moss = smoothstep(0.35, 0.55, n.y + mossN * 0.6) + smoothstep(0.25, 0.32, mossN - 0.15 + (2.5 - min(wp.y - terrainH(wp.xz), 2.5)) * 0.12);
  moss = saturate(moss);
  float sh = sunShadow(wp, n);
  float lit = toonBand(dot(n, uSunDir), 0.12) * sh;
  vec3 stone = paintLight(alb, n, lit, 1.0);
  vec3 mossC = mix(uGrassShade * 1.05, uGrassLit * 0.9, lit);
  vec3 col = mix(stone, mossC, moss * 0.9);
  // dark arch soffit occlusion
  col *= mix(0.72, 1.0, smoothstep(-0.6, 0.2, n.y));
  col = applyAtmos(col, wp);
  vec2 P = triP(wp, n);
  writeOut(col, P, RID_STONE, wp);
#endif
}`;

function bayShape(x0, x1, top, bottom, span, spring, broken, seed) {
  const s = new THREE.Shape();
  s.moveTo(x0, bottom);
  s.lineTo(x1, bottom);
  if (broken > 0) {
    // jagged ruined top
    const n = 7;
    s.lineTo(x1, top - broken * rand(1, seed));
    for (let i = n - 1; i > 0; i--) {
      const x = x0 + (x1 - x0) * i / n;
      s.lineTo(x, top - broken * (0.3 + 0.7 * rand(i + 3, seed)));
    }
    s.lineTo(x0, top - broken * rand(2, seed));
  } else {
    s.lineTo(x1, top); s.lineTo(x0, top);
  }
  s.lineTo(x0, bottom);
  const cx = (x0 + x1) / 2, r = span / 2;
  const h = new THREE.Path();
  h.moveTo(cx - r, bottom + 1.0);
  h.lineTo(cx + r, bottom + 1.0);
  h.lineTo(cx + r, spring);
  h.absarc(cx, spring, r, 0, Math.PI, false);
  h.lineTo(cx - r, bottom + 1.0);
  s.holes.push(h);
  return s;
}

export function createRuins(leafTex) {
  const group = new THREE.Group();
  const pair = makeMaterial({ name: 'stone', vertex: vert, fragment: frag,
    uniforms: { uStoneA: { value: new THREE.Color('#a39a8e') }, uStoneB: { value: new THREE.Color('#d6c9b0') } } });
  const Z = WORLD.viaductZ, TOP = WORLD.viaductDeck, D = 4.6, S = 13, PW = 3.0;
  const geos = [];
  const vineClusters = [];
  const bushClusters = [];
  for (let i = -10; i <= 10; i++) {
    const xc = -2 + i * S;
    const gmin = Math.min(heightAt(xc - S / 2, Z), heightAt(xc, Z), heightAt(xc + S / 2, Z), heightAt(xc - S / 2, Z - D / 2), heightAt(xc + S / 2, Z + D / 2));
    if (gmin > TOP - 5) continue;
    const bottom = Math.min(-3, gmin - 3);
    const collapsed = i === 4;
    const broken = (i === 3 || i === 5) ? 2.6 : (i === -6 ? 1.8 : 0);
    if (collapsed) {
      // only pier stumps remain
      [-1, 1].forEach(sd => {
        const g = new THREE.BoxGeometry(PW, 6 + 3 * rand(i, 9 + sd), D, 1, 1, 1);
        g.translate(xc + sd * (S / 2), bottom + (6 + 3 * rand(i, 9 + sd)) / 2, Z);
        geos.push(g);
      });
      continue;
    }
    const shape = bayShape(xc - S / 2, xc + S / 2, TOP, bottom, S - PW, 9.0, broken, i * 13 + 5);
    const g = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 1, curveSegments: 18 });
    g.translate(0, 0, Z - D / 2);
    geos.push(g);
    // cornice band
    const c = new THREE.BoxGeometry(S + 0.02, 0.5, D + 0.6);
    c.translate(xc, TOP - (broken ? broken + 1.5 : 3.2), Z);
    if (!broken) geos.push(c);
    // vines hanging from the arch crown and deck edges
    for (const side of [-1, 1]) {
      const zEdge = Z + side * (D / 2 + 0.25);
      const nv = 3 + Math.floor(rand(i, 50 + side) * 4);
      for (let v = 0; v < nv; v++) {
        const vx = xc + (rand(v, i * 7 + side) - 0.5) * (S - 1);
        const topY = (broken ? TOP - broken : TOP) - 0.2;
        const archTop = 9.0 + Math.sqrt(Math.max(0, ((S - PW) / 2) ** 2 - (vx - xc) ** 2));
        const len = (topY - archTop) * (0.6 + 0.8 * rand(v, i * 11 + side)) + (Math.abs(vx - xc) < 4 ? 2 + 5 * rand(v, i) : 0);
        for (let y = 0; y < len; y += 0.75) {
          const sway = Math.sin(y * 0.7 + v) * 0.25;
          vineClusters.push({ c: new THREE.Vector3(vx + sway, topY - y, zEdge + side * 0.15 * rand(v + y * 3, i)), r: 0.55 * (1 - 0.4 * y / Math.max(len, 1)), n: 3 });
        }
      }
    }
    // bushes and grass mounds on the deck
    const nb = 5 + Math.floor(rand(i, 77) * 5);
    for (let b = 0; b < nb; b++) {
      const bx = xc + (rand(b, i * 3 + 1) - 0.5) * S;
      const topY = broken ? TOP - broken * 0.6 : TOP;
      bushClusters.push({ c: new THREE.Vector3(bx, topY + 0.4 + rand(b, i) * 0.6, Z + (rand(b, i * 5) - 0.5) * D * 0.8), r: 0.8 + rand(b, i * 9) * 1.0, n: 7 });
    }
  }
  // rubble from the collapsed bay
  const rubble = [];
  for (let k = 0; k < 26; k++) {
    const x = -2 + 4 * S + (rand(k, 301) - 0.5) * 16, z = Z + (rand(k, 302) - 0.5) * 14;
    const sz = 0.6 + rand(k, 303) * 1.6;
    const g = new THREE.BoxGeometry(sz * (1 + rand(k, 304)), sz * 0.7, sz, 1, 1, 1);
    g.rotateY(rand(k, 305) * 3); g.rotateX((rand(k, 306) - 0.5) * 0.6); g.rotateZ((rand(k, 307) - 0.5) * 0.6);
    g.translate(x, heightAt(x, z) + sz * 0.15, z);
    rubble.push(g);
  }
  // column drums by the river, foreground interest for the opening glide
  const drums = [[-11, -16, 1.0, 1.4, 1.48], [10.5, -48, 0.85, 3.2, 0.1], [8, -66, 0.95, 4.2, 0.05]];
  drums.forEach(([x, z, r, h, tilt], k) => {
    const g = new THREE.CylinderGeometry(r, r * 1.04, h, 18, 3);
    // flutes
    const pos = g.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const px = pos.getX(v), pz = pos.getZ(v), a = Math.atan2(pz, px), rr = Math.hypot(px, pz);
      if (rr > 0.01) { const f = 1 - 0.05 * Math.pow(Math.abs(Math.cos(a * 9)), 3); pos.setX(v, px * f); pos.setZ(v, pz * f); }
    }
    g.computeVertexNormals();
    g.rotateZ(tilt); g.rotateY(rand(k, 400) * 3);
    g.translate(x, heightAt(x, z) + (tilt > 1 ? r * 0.8 : h / 2 - 0.3), z);
    rubble.push(g);
    bushClusters.push({ c: new THREE.Vector3(x + 0.5, heightAt(x, z) + 0.6, z + 0.6), r: 0.9, n: 6 });
  });
  const merged = mergeGeos([...geos, ...rubble]);
  const mesh = applyMat(new THREE.Mesh(merged), pair);
  group.add(mesh);
  if (leafTex) {
    group.add(createFoliage(vineClusters, leafTex, { seed: 31, cards: 3, cardScale: 1.1, crownR: 1.5 }));
    group.add(createFoliage(bushClusters, leafTex, { seed: 37, cards: 7, cardScale: 1.05, crownR: 2.0, dabs: false }));
  }
  return { group };
}

function mergeGeos(list) {
  // minimal merge (position + normal + index); converts to non-indexed-safe indexed geometry
  let nv = 0, ni = 0;
  const prepared = list.map(g => { const gg = g.index ? g : g; gg.computeVertexNormals && !gg.attributes.normal && gg.computeVertexNormals(); return gg; });
  prepared.forEach(g => { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint32Array(ni);
  let vo = 0, io = 0;
  prepared.forEach(g => {
    pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3);
    if (g.index) { for (let k = 0; k < g.index.count; k++) idx[io + k] = g.index.array[k] + vo; io += g.index.count; }
    else { for (let k = 0; k < g.attributes.position.count; k++) idx[io + k] = k + vo; io += g.attributes.position.count; }
    vo += g.attributes.position.count;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}
export { mergeGeos };
