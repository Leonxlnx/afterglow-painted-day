// Terrain meshes (dense near corridor + coarse far land) with painterly ground shading.
import * as THREE from 'three';
import { heightAt, footpathInfo, riverInfo, coastZ, NEAR, nearGrid } from './heightfield.js';
import { makeMaterial, applyMat } from '../render/materials.js';

export { NEAR };

function buildGrid(x0, x1, z0, z1, nx, nz, hfn, warpX = null) {
  const pos = new Float32Array(nx * nz * 3), nor = new Float32Array(nx * nz * 3);
  const H = new Float32Array(nx * nz);
  const xs = new Float32Array(nx), zs = new Float32Array(nz);
  for (let i = 0; i < nx; i++) { let t = i / (nx - 1); if (warpX) t = warpX(t); xs[i] = x0 + (x1 - x0) * t; }
  for (let j = 0; j < nz; j++) zs[j] = z0 + (z1 - z0) * (j / (nz - 1));
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, h = hfn(xs[i], zs[j]);
    H[k] = h; pos[k * 3] = xs[i]; pos[k * 3 + 1] = h; pos[k * 3 + 2] = zs[j];
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    const il = Math.max(i - 1, 0), ir = Math.min(i + 1, nx - 1), jd = Math.max(j - 1, 0), ju = Math.min(j + 1, nz - 1);
    const dx = xs[ir] - xs[il], dz = zs[ju] - zs[jd];
    const hx = (H[j * nx + ir] - H[j * nx + il]) / dx, hz = (H[ju * nx + i] - H[jd * nx + i]) / dz;
    const l = Math.hypot(hx, 1, hz);
    nor[k * 3] = -hx / l; nor[k * 3 + 1] = 1 / l; nor[k * 3 + 2] = -hz / l;
  }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let p = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    idx[p++] = a; idx[p++] = c; idx[p++] = b; idx[p++] = b; idx[p++] = c; idx[p++] = d;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

const vert = /* glsl */`
varying vec3 vWP; varying vec3 vN;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz; vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const frag = /* glsl */`
varying vec3 vWP; varying vec3 vN;
uniform sampler2D uPathTex; uniform vec4 uPathBounds;
void main(){
#ifdef SHADOW_PASS
  oColor = vec4(1.0); return;
#else
  vec3 n = normalize(vN);
  vec3 wp = vWP;
  float slope = 1.0 - n.y;
  // ---- regional colour variation (world anchored, several scales) ----
  float big = fbm3(wp.xz * 0.018);
  float mid = fbm3(wp.xz * 0.11 + 5.0);
  float dab = gnoise(wp.xz * 0.9 + 11.0);
  vec4 pathInfo = texture(uPathTex, (wp.xz - uPathBounds.xy) / uPathBounds.zw); // r: path, g: river dist(norm), b: forest
  float pathM = pathInfo.r;
  float forest = pathInfo.b;
  // ---- light ----
  float ndl = dot(n, uSunDir);
  float band = grazeLit(ndl, toonBand(ndl, 0.12));
  float sh = sunShadow(wp, n);
  float lit = band * sh;
  // grass family colours are art-directed directly (lit/shade pair)
  vec3 gl = uGrassLit * (1.0 + 0.16 * big + 0.08 * dab);
  vec3 gs = uGrassShade * (1.0 + 0.2 * mid);
  // hue drift: yellower and bluer patches
  gl = mix(gl, gl * vec3(1.15, 1.0, 0.55), saturate(big * 1.5 + 0.2) * 0.5);
  gs = mix(gs, gs * vec3(0.8, 0.95, 1.3), saturate(-mid * 2.0) * 0.6);
  // forest floor: darker, warmer
  gl = mix(gl, gl * vec3(0.78, 0.72, 0.42), forest * 0.6);
  gs = mix(gs, gl * 0.62, 0.1 * forest);
  vec3 grass = mix(gs, gl, lit);
  float term = lit * (1.0 - lit) * 4.0;
  grass = satAdjust(grass, 1.0 + term * 0.4);
  // dirt path
  vec3 dirtA = vec3(0.62, 0.48, 0.30);
  vec3 dirt = paintLight(dirtA, n, lit, 1.0);
  vec3 col = mix(grass, dirt, smoothstep(0.35, 0.75, pathM + dab * 0.15));
  // river banks: wet sand / pebbles
  float h = wp.y;
  vec3 sandA = vec3(0.55, 0.5, 0.38);
  vec3 sand = paintLight(sandA, n, lit, 1.0);
  float bank = smoothstep(0.55, -0.15, h + dab * 0.15) * (1.0 - smoothstep(-6.0, -12.0, wp.z * 0.0 + h));
  col = mix(col, sand, bank * 0.85);
  col = mix(col, col * vec3(0.55, 0.6, 0.7), smoothstep(0.1, -0.6, h)); // wet / underwater darkening
  // rock on steep slopes (cliffs, hill sides)
  float rockM = smoothstep(0.32, 0.5, slope + mid * 0.12);
  float strata = gnoise(vec2(wp.y * 0.9 + gnoise(wp.xz * 0.05) * 1.5, (wp.x + wp.z) * 0.02)) * 0.5 + 0.5;
  strata = floor(strata * 4.0 + 0.5) / 4.0;
  vec3 rockA = mix(vec3(0.42, 0.40, 0.44), vec3(0.62, 0.55, 0.5), strata);
  rockA *= 0.85 + 0.3 * dab;
  float rockLit = grazeLit(ndl, toonBand(ndl, 0.2)) * sh;
  rockA *= 1.0 - 0.35 * smoothstep(0.5, 0.0, uSunDir.y + 0.3);
  vec3 rock = paintLight(rockA, n, rockLit, 1.0);
  // moss on top of rock edges
  rock = mix(rock, grass, smoothstep(0.55, 0.2, slope) * 0.7);
  col = mix(col, rock, rockM);
  col = applyAtmos(col, wp);
  writeOut(col, wp.xz, RID_GROUND, wp);
#endif
}`;

// Small texture with path mask / river / forest masks for shaders (r: path, g: river, b: forest density)
export function bakeMaskTexture(forestFn, { x0 = -320, x1 = 320, z0 = -420, z1 = 160, res = 1024 } = {}) {
  const data = new Uint8Array(res * res * 4);
  for (let j = 0; j < res; j++) {
    const z = z0 + (z1 - z0) * (j / (res - 1));
    for (let i = 0; i < res; i++) {
      const x = x0 + (x1 - x0) * (i / (res - 1));
      const k = (j * res + i) * 4;
      let path = 0, river = 255;
      if (x > -80 && x < 80 && z < -50 && z > -300) { const p = footpathInfo(x, z); path = Math.max(0, 1 - Math.max(0, p.d - 0.4) / 1.1); }
      if (z > -200 && z < 150) { const r = riverInfo(x, z); river = Math.min(255, r.d * 8); }
      data[k] = path * 255; data[k + 1] = river; data[k + 2] = forestFn(x, z) * 255; data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
  return { tex, bounds: new THREE.Vector4(x0, z0, x1 - x0, z1 - z0) };
}

export function createTerrain(maskTex) {
  const group = new THREE.Group();
  const uniforms = { uPathTex: { value: maskTex.tex }, uPathBounds: { value: maskTex.bounds } };
  const pair = makeMaterial({ name: 'terrain', vertex: vert, fragment: frag, uniforms });
  // near: dense
  const ng = nearGrid();
  const nearH = (x, z) => { const i = Math.round((x - NEAR.x0) / NEAR.step), j = Math.round((z - NEAR.z0) / NEAR.step); return ng.H[j * ng.nx + i]; };
  const near = applyMat(new THREE.Mesh(buildGrid(NEAR.x0, NEAR.x1, NEAR.z0, NEAR.z1, ng.nx, ng.nz, nearH)), pair);
  group.add(near);
  // far: coarse, pushed below the near patch
  const F = { x0: -2600, x1: 2600, z0: -2400, z1: 900 };
  const inner = (x, z) => x > NEAR.x0 + 8 && x < NEAR.x1 - 8 && z > NEAR.z0 + 8 && z < NEAR.z1 - 8;
  const farH = (x, z) => {
    const h = heightAt(x, z);
    return inner(x, z) ? h - 25 : h;
  };
  // denser in x near the centre
  const warp = t => { const u = t * 2 - 1; return (Math.sign(u) * Math.pow(Math.abs(u), 1.6) + 1) / 2; };
  const far = applyMat(new THREE.Mesh(buildGrid(F.x0, F.x1, F.z0, F.z1, 520, 430, farH, warp)), pair);
  group.add(far);
  return { group, near, far, pair };
}
