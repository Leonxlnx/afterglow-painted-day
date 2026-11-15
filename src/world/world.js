// Assembles the world and drives per-frame animation of its parts.
import * as THREE from 'three';
import { U, makeMaterial, applyMat } from '../render/materials.js';
import { bakeHeightTexture, heightAt, hNear, rand, fbm, footpathInfo, riverInfo, coastZ, WORLD } from './heightfield.js';
import { createSky } from './sky.js';
import { createTerrain, bakeMaskTexture } from './terrain.js';
import { createWater } from './water.js';
import { createGrass } from './grass.js';
import { makeLeafAtlas, createTreeKind, instanceTrees, ARCHETYPES, createFoliage } from './trees.js';
import { createRuins } from './ruins.js';
import { cameraAt, DURATION } from '../timeline.js';
import { createLife } from './life.js';
import { createIslands } from './islands.js';

export function forestDensity(x, z) {
  const s = Math.min(1, Math.max(0, (-(z) - 132) / 22)) * Math.min(1, Math.max(0, (z + 246) / 12));
  const side = 1 - Math.min(1, Math.max(0, (Math.abs(x) - 75) / 30));
  return s * side;
}

export const HERO = { tree: { x: 14.5, z: -263.5 }, kid: { x: -5, z: -266 } };

export async function buildWorld({ scene, renderer, quality, log, progress = () => {} }) {
  const parts = [];
  const tick = (m) => { progress(m); return new Promise(r => setTimeout(r, 0)); };
  await tick('Shaping the land');
  const hb = bakeHeightTexture();
  U.uHeightTex.value = hb.tex; U.uHeightBounds.value.copy(hb.bounds);
  const mask = bakeMaskTexture(forestDensity);
  const sky = createSky(); scene.add(sky.group);
  const terrain = createTerrain(mask); scene.add(terrain.group);
  log('terrain ok');
  await tick('Growing the meadow');
  const water = createWater(); scene.add(water.mesh);
  parts.push({ update: (t, c, tod) => water.update(tod) });

  // camera route samples (xz) for density decisions
  const cam = new THREE.PerspectiveCamera();
  const route = [];
  for (let t = 0; t <= DURATION; t += 0.1) { cameraAt(t, cam); route.push(cam.position.clone()); }
  const routeD = (x, z) => { let b = 1e9; for (const p of route) { const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < b) b = d; } return Math.sqrt(b); };

  const grass = createGrass({ routePts: route, quality, extraAreas: [{ x: -1, z: -262, r: 34 }], mask });
  scene.add(grass.group);
  log(`grass ok: ${grass.totalB} blades, ${grass.totalF} flowers`);
  await tick('Planting trees');

  // ---------- trees ----------
  const leafTex = makeLeafAtlas(1024);
  const kinds = {
    oak: createTreeKind(ARCHETYPES.oak, 11, leafTex),
    oak2: createTreeKind(ARCHETYPES.oak, 23, leafTex, { tint: [1.05, 1.0, 0.85] }),
    forest: createTreeKind(ARCHETYPES.forest, 5, leafTex),
    forest2: createTreeKind(ARCHETYPES.forest2, 9, leafTex, { tint: [0.92, 1.0, 1.05], dark: 0.9 }),
    poplar: createTreeKind(ARCHETYPES.poplar, 17, leafTex, { tint: [0.95, 1.02, 0.9] }),
    young: createTreeKind(ARCHETYPES.young, 29, leafTex),
    bush: createTreeKind(ARCHETYPES.bush, 41, leafTex),
    hero: createTreeKind(ARCHETYPES.hero, 7, leafTex, { tint: [1.04, 1.0, 0.9], blossom: 1.0 }),
    isl_oak: createTreeKind(ARCHETYPES.oak, 61, leafTex, { tint: [1.12, 1.0, 0.85], dark: 1.9 }),
    isl_young: createTreeKind(ARCHETYPES.young, 63, leafTex, { tint: [1.12, 1.0, 0.85], dark: 1.9 }),
    isl_poplar: createTreeKind(ARCHETYPES.poplar, 67, leafTex, { tint: [1.1, 1.0, 0.88], dark: 1.9 }),
  };
  const lists = Object.fromEntries(Object.keys(kinds).map(k => [k, []]));
  const ok = (x, z, clear) => {
    if (z < coastZ(x) + 6) return false;
    const h = heightAt(x, z);
    if (h < 0.4) return false;
    if (riverInfo(x, z).d < 7) return false;
    if (footpathInfo(x, z).d < 3) return false;
    if (routeD(x, z) < clear) return false;
    if (Math.hypot(x - HERO.tree.x, z - HERO.tree.z) < 22 || Math.hypot(x - HERO.kid.x, z - HERO.kid.z) < 26) return false;
    return true;
  };
  // forest on the slope
  let n = 0;
  for (let z = -250; z < -125; z += 6.2) for (let x = -110; x < 110; x += 6.2) {
    n++;
    const jx = x + (rand(n, 1) - 0.5) * 4.5, jz = z + (rand(n, 2) - 0.5) * 4.5;
    const d = forestDensity(jx, jz) * (0.45 + 0.55 * Math.min(1, Math.max(0, (routeD(jx, jz) - 10) / 14)));
    if (rand(n, 3) > d * 0.78) continue;
    if (!ok(jx, jz, 9.0)) continue;
    const r = rand(n, 4);
    const kind = r < 0.42 ? 'forest' : r < 0.8 ? 'forest2' : r < 0.9 ? 'young' : 'oak';
    lists[kind].push({ x: jx, y: hNear(jx, jz), z: jz, s: 0.85 + rand(n, 5) * 0.4, r: rand(n, 6) * 6.28 });
    if (rand(n, 7) < 0.35) { const bx = jx + (rand(n, 8) - 0.5) * 5, bz = jz + (rand(n, 9) - 0.5) * 5; if (ok(bx, bz, 4)) lists.bush.push({ x: bx, y: hNear(bx, bz), z: bz, s: 0.8 + rand(n, 10) * 0.8, r: rand(n, 11) * 6 }); }
  }
  // undergrowth close to the route (foreground parallax in the forest and on the river banks)
  for (let k = 0; k < 520; k++) {
    const p = route[Math.floor(rand(k, 81) * route.length)];
    if (p.z > 45 || p.z < -246) continue;
    const side = rand(k, 82) < 0.5 ? -1 : 1;
    const off = 3.0 + rand(k, 83) * 8.0;
    const x = p.x + side * off, z = p.z + (rand(k, 84) - 0.5) * 6;
    const h = hNear(x, z);
    if (h < 0.35 || footpathInfo(x, z).d < 1.6 || riverInfo(x, z).d < 5.5) continue;
    lists.bush.push({ x, y: h - 0.1, z, s: 0.45 + rand(k, 85) * 0.6, r: rand(k, 86) * 6.28 });
  }
  // meadow groves along the river and valley sides
  for (let k = 0; k < 140; k++) {
    const z = 60 - rand(k, 21) * 200;
    const side = rand(k, 22) < 0.5 ? -1 : 1;
    const x = side * (18 + Math.pow(rand(k, 23), 0.8) * 120);
    if (!ok(x, z, 13)) continue;
    const r = rand(k, 24);
    const kind = r < 0.35 ? 'oak' : r < 0.55 ? 'oak2' : r < 0.8 ? 'poplar' : 'young';
    lists[kind].push({ x, y: heightAt(x, z), z, s: 0.8 + rand(k, 25) * 0.5, r: rand(k, 26) * 6.28 });
  }
  // far hills: woods on the valley walls (cheap, distant)
  for (let k = 0; k < 1500; k++) {
    const x = (rand(k, 31) - 0.5) * 1300, z = 120 - rand(k, 32) * 760;
    if (Math.abs(x) < 120 && z > -260) continue;
    if (fbm(x * 0.01, z * 0.01, 3, 5) < -0.05) continue;
    if (!ok(x, z, 20)) continue;
    const kind = rand(k, 33) < 0.6 ? 'forest' : 'oak';
    lists[kind].push({ x, y: heightAt(x, z), z, s: 0.9 + rand(k, 34) * 0.5, r: rand(k, 35) * 6.28 });
  }
  // woods on the two headlands framing the bay (read as wooded promontories, not bare slopes)
  for (let k = 0; k < 2600; k++) {
    const side = rand(k, 91) < 0.5 ? -1 : 1;
    const x = side * (95 + rand(k, 92) * 260), z = -250 - rand(k, 93) * 520;
    if (heightAt(x, z) < 2.5 || routeD(x, z) < 30 || Math.hypot(x - HERO.kid.x, z - HERO.kid.z) < 40) continue;
    if (fbm(x * 0.02, z * 0.02, 3, 17) < -0.25) continue;
    const r = rand(k, 94);
    const kind = r < 0.45 ? 'oak' : r < 0.75 ? 'forest' : r < 0.9 ? 'poplar' : 'oak2';
    lists[kind].push({ x, y: heightAt(x, z) - 0.3, z, s: 0.9 + rand(k, 95) * 0.6, r: rand(k, 96) * 6.28 });
  }
  // the great tree on the hilltop
  lists.hero.push({ x: HERO.tree.x, y: heightAt(HERO.tree.x, HERO.tree.z), z: HERO.tree.z, s: 0.95, r: 2.2 });
  for (const k of Object.keys(kinds)) scene.add(instanceTrees(kinds[k], lists[k]));
  log('trees: ' + Object.entries(lists).map(([k, v]) => `${k}=${v.length}`).join(' '));

  // opening hook: an organic blossom bough reaching in from the top-right; the camera glides out from under it
  {
    const pos = [], nor = [], idx = [];
    const SIDES = 7;
    const tube = (pts, r0, r1) => {
      const base = pos.length / 3;
      for (let i = 0; i < pts.length; i++) {
        const t = i / (pts.length - 1);
        const d = (i < pts.length - 1 ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
        const up = Math.abs(d.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const ax = up.clone().cross(d).normalize(), bx = d.clone().cross(ax).normalize();
        const r = r0 + (r1 - r0) * Math.pow(t, 0.8);
        for (let k = 0; k <= SIDES; k++) {
          const ang = k / SIDES * Math.PI * 2, n = ax.clone().multiplyScalar(Math.cos(ang)).addScaledVector(bx, Math.sin(ang));
          pos.push(pts[i].x + n.x * r, pts[i].y + n.y * r, pts[i].z + n.z * r); nor.push(n.x, n.y, n.z);
        }
      }
      for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < SIDES; k++) {
        const p0 = base + i * (SIDES + 1) + k, p1 = p0 + SIDES + 1;
        idx.push(p0, p1, p0 + 1, p0 + 1, p1, p1 + 1);
      }
    };
    const cl = [];
    const limb = (start, end, r0, r1, seed, depth) => {
      // kinked path: jittered control points, smoothed
      const ctrl = [start.clone()];
      const n = 4;
      for (let i = 1; i < n; i++) {
        const p = start.clone().lerp(end, i / n);
        p.add(new THREE.Vector3((rand(i, seed) - 0.5) * 1.1, -Math.sin(i / n * Math.PI) * (0.6 + rand(i, seed + 1) * 0.6), (rand(i, seed + 2) - 0.5) * 1.1));
        ctrl.push(p);
      }
      ctrl.push(end.clone());
      const pts = new THREE.CatmullRomCurve3(ctrl).getPoints(28);
      tube(pts, r0, r1);
      // blossoms all along the outer two thirds, and a full cluster at the tip
      for (let i = 9; i < pts.length; i += 2) {
        const p = pts[i];
        const cc = p.clone().add(new THREE.Vector3((rand(i, seed + 5) - 0.5) * 0.5, -0.12 - rand(i, seed + 6) * 0.3, (rand(i, seed + 7) - 0.5) * 0.5));
        if (cc.y < 3.1) continue;
        cl.push({ c: cc, r: 0.34 + rand(i, seed + 8) * 0.26 + (i > 22 ? 0.15 : 0), n: 4 });
      }
      if (depth < 1) {
        for (let f = 0; f < 3; f++) {
          const i0 = 8 + f * 6 + Math.floor(rand(f, seed + 9) * 3), p = pts[i0];
          const dir = pts[Math.min(pts.length - 1, i0 + 3)].clone().sub(p).normalize();
          const side = new THREE.Vector3(-dir.z, 0.2, dir.x).normalize().multiplyScalar(f % 2 ? 1 : -1);
          const e = p.clone().addScaledVector(dir, 1.6 + rand(f, seed + 10) * 1.2).addScaledVector(side, 1.0 + rand(f, seed + 11) * 0.8).add(new THREE.Vector3(0, -0.5, 0));
          limb(p, e, r0 * 0.38, 0.012, seed * 7 + f * 13 + 3, depth + 1);
        }
      }
    };
    const A = new THREE.Vector3(15.5, 8.4, 57.5);
    for (let k = 0; k < 5; k++) {
      const end = new THREE.Vector3(3.6 + rand(k, 511) * 5.2, 3.7 + rand(k, 512) * 0.9, 45.5 + rand(k, 513) * 10);
      limb(A.clone().add(new THREE.Vector3(0, -k * 0.15, (k - 2) * 0.4)), end, 0.15 + rand(k, 515) * 0.05, 0.018, 600 + k * 31, 0);
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); bg.setIndex(idx);
    bg.computeBoundingSphere();
    const boughPair = makeMaterial({ name: 'bough', vertex: `varying vec3 vWP; varying vec3 vN;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragment: `varying vec3 vWP; varying vec3 vN;
void main(){
#ifdef SHADOW_PASS
  oColor = vec4(1.0); return;
#else
  vec3 n = normalize(vN);
  float lit = toonBand(dot(n, uSunDir), 0.2) * sunShadow(vWP, n);
  vec3 col = mix(vec3(0.03, 0.018, 0.018), vec3(0.2, 0.12, 0.09), lit) + vec3(0.03, 0.025, 0.04) * hemiAmb(n);
  col = applyAtmos(col, vWP);
  writeOut(col, vec2(vWP.x * 0.7 + vWP.z * 0.7, vWP.y), RID_WOOD, vWP);
#endif
}` });
    scene.add(applyMat(new THREE.Mesh(bg), boughPair));
    const br = createFoliage(cl, leafTex, { seed: 777, cards: 4, cardScale: 1.0, dabs: true, crownR: 4, blossom: 1.0, pale: 0.6, crown: new THREE.Vector3(9, 6, 55) });
    scene.add(br);
  }
  const ruins = createRuins(leafTex); scene.add(ruins.group);
  log('ruins ok');
  await tick('Lifting the islands');
  const islands = createIslands({ leafTex, kinds }); scene.add(islands.group);
  log('islands ok');
  await tick('Waking the wind');
  const heroP = lists.hero[0];
  const crown = kinds.hero.crown.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), heroP.r).add(new THREE.Vector3(heroP.x, heroP.y, heroP.z));
  const routeForest = route.filter(p => p.z < 40 && p.z > -240);
  const life = createLife({ kid: HERO.kid, treeCrown: crown, routeForest });
  scene.add(life.group); parts.push(life);
  log('life ok');

  const world = {
    mask, terrain, sky, water, leafTex, overlay: life.overlay, ffMat: life.ffMat,
    update(t, camera, tod) { parts.forEach(p => p.update && p.update(t, camera, tod)); },
  };
  return world;
}
