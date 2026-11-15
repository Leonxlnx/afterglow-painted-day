// Sky dome (gradient, painted cloud layer, sun, stars) + 3D cumulus built from instanced sphere clusters.
import * as THREE from 'three';
import { makeMaterial, applyMat } from '../render/materials.js';
import { rand } from './heightfield.js';

const SKY_P = /* glsl */`
// paint-space coordinates for the sky: a virtual cloud plane, so strokes converge to the horizon
vec2 skyP(vec3 d){ return d.xz / (max(d.y, 0.0) + 0.09) * 260.0; }
`;

const skyVert = /* glsl */`
varying vec3 vDir;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * wp;
  gl_Position.z = gl_Position.w * 0.99999; // far
}`;

const skyFrag = SKY_P + /* glsl */`
varying vec3 vDir;
uniform float uSunSize;
float cloudField(vec2 cp){
  vec2 w = vec2(fbm3(cp * 0.7 + 3.1), fbm3(cp * 0.7 + 9.7));
  float n = fbm(cp * 0.55 + w * 0.9);
  // streaky stretch along wind
  n += 0.35 * fbm3(vec2(cp.x * 0.25, cp.y * 1.6) + 4.0);
  return n;
}
void main(){
  vec3 d = normalize(vDir);
  vec3 col = skyGradient(d);
  // ---- painted cloud layer ----
  float hy = max(d.y, 0.0);
  vec2 cp = d.xz / (hy + 0.07) * 0.9 + vec2(uTime * 0.012, uTime * 0.004);
  float n = cloudField(cp);
  float cover = 1.0 - uCloudCover;
  float dens = smoothstep(cover - 0.55, cover - 0.05, n) * smoothstep(0.0, 0.06, d.y);
  vec2 sdir = normalize(uSunDir.xz + 1e-5);
  float n2 = cloudField(cp + sdir * 0.22);
  float shade = saturate((n - n2) * 4.0 + 0.55);
  float sd = max(dot(d, uSunDir), 0.0);
  vec3 cc = mix(uCloudShade, uCloudLit, shade);
  cc += uCloudRim * pow(1.0 - dens, 3.0) * pow(sd, 6.0) * 1.5;
  // clouds near the horizon pick up horizon colour
  cc = mix(cc, skyGradient(vec3(d.x, 0.02, d.z)) * 1.05, exp(-hy * 10.0) * 0.55);
  col = mix(col, cc, dens * 0.92);
  // ---- sun disk ----
  float sunCore = smoothstep(cos(uSunSize * 1.6), cos(uSunSize * 0.6), sd);
  float sunHalo = pow(sd, 900.0);
  col += mix(uSunGlow, vec3(1.0, 0.92, 0.72), 0.3) * (sunCore * 0.9 + sunHalo * 0.35) * uSunDisk * (1.0 - dens * 0.6);
  // ---- stars ----
  if (uStars > 0.001 && d.y > 0.0) {
    vec2 sp = vec2(atan(d.z, d.x) * 180.0, d.y * 170.0);
    vec2 ci = floor(sp); vec2 r = h22(ci);
    vec2 fpos = fract(sp) - (0.2 + 0.6 * r);
    float star = smoothstep(0.11, 0.0, length(fpos)) * step(0.84, h21(ci + 7.0)) * (0.6 + 0.8 * h21(ci + 3.0));
    float tw = 0.6 + 0.4 * sin(uTime * (2.0 + 3.0 * r.x) + r.y * 40.0);
    col += vec3(1.0, 0.92, 0.85) * star * tw * uStars * smoothstep(0.02, 0.25, d.y) * (1.0 - dens) * 1.6;
  }
  writeOut(col, skyP(d), RID_SKY, cameraPosition + d * 20000.0);
}`;

const cloudVert = /* glsl */`
attribute vec4 iSphere;   // center xyz, radius
attribute vec4 iCluster;  // cluster center xyz, base y
varying vec3 vN; varying vec3 vWP; varying float vBase; varying vec3 vCC;
void main(){
  vec3 sn = normalize(position);
  vec3 wp = iSphere.xyz + position * iSphere.w;
  float disp = fbmv3(wp * 0.0045 + iCluster.xyz * 0.001) - 0.5;
  wp += sn * iSphere.w * disp * 0.55;
  float base = iCluster.w;
  if (wp.y < base) wp.y = base + (wp.y - base) * 0.12;
  vec3 cn = normalize(wp - iCluster.xyz);
  vN = normalize(mix(sn, cn, 0.5));
  vWP = wp; vBase = base; vCC = iCluster.xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const cloudFrag = SKY_P + /* glsl */`
varying vec3 vN; varying vec3 vWP; varying float vBase; varying vec3 vCC;
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(vWP - cameraPosition);
  float ndl = dot(n, uSunDir);
  // three soft bands, painterly
  float lit = smoothstep(-0.35, 0.15, ndl) * 0.55 + smoothstep(0.15, 0.6, ndl) * 0.45;
  float h = saturate((vWP.y - vBase) / max(vCC.y - vBase, 1.0) * 0.6);
  vec3 col = mix(uCloudShade * mix(0.82, 1.0, h), uCloudLit, lit);
  float fres = pow(1.0 - abs(dot(n, -v)), 2.5);
  float back = pow(max(dot(v, uSunDir), 0.0), 5.0);
  col += uCloudRim * fres * (0.08 + back * 1.4);
  // low sun lights the cloud bases (sunset) - warm undersides, violet tops
  float low = 1.0 - smoothstep(0.05, 0.3, uSunDir.y);
  vec2 sh2 = normalize(uSunDir.xz + 1e-5);
  float towardSun = dot(normalize(vWP.xz - cameraPosition.xz), sh2) * 0.5 + 0.5;
  float under = smoothstep(0.35, -0.5, n.y) * low;
  col = mix(col, uCloudLit * 1.15 + uCloudRim * 0.25, under * (0.45 + 0.55 * towardSun));
  col = mix(col, uCloudShade * 0.85, smoothstep(0.2, 0.9, n.y) * low * 0.5);
  // atmosphere: fade toward the sky behind
  vec3 sky = skyGradient(v);
  float dist = length(vWP - cameraPosition);
  float f = 1.0 - exp(-dist * 0.00018);
  float dusk = 1.0 - smoothstep(-0.06, 0.0, uSunDir.y);
  col = mix(col, sky, saturate(f * 0.6 + fres * fres * 0.6));
  // after sunset the towers dissolve into the afterglow (no hard-edged ghost shapes in the dusk sky)
  col = mix(col, sky, dusk * 0.9);
  writeOut(col, skyP(v), RID_SKY, vWP);
}`;

export function createSky() {
  const group = new THREE.Group();
  // dome
  const domeGeo = new THREE.SphereGeometry(9000, 64, 32);
  const domePair = makeMaterial({ name: 'sky', vertex: skyVert, fragment: skyFrag, side: THREE.BackSide, depthWrite: false, castShadow: false,
    uniforms: { uSunSize: { value: 0.0135 } } });
  const dome = applyMat(new THREE.Mesh(domeGeo, domePair.mat), domePair);
  dome.renderOrder = -1000; dome.frustumCulled = false;
  dome.onBeforeRender = (r, s, cam) => { dome.position.copy(cam.position); dome.updateMatrixWorld(); };
  group.add(dome);

  // cumulus clusters
  const clouds = [];
  const addCloud = (cx, cz, base, w, hgt, seed, lumps = 26) => {
    const center = new THREE.Vector3(cx, base + hgt * 0.35, cz);
    for (let i = 0; i < lumps; i++) {
      const a = rand(i, seed) * Math.PI * 2, rr = Math.sqrt(rand(i, seed + 1));
      const up = Math.pow(rand(i, seed + 2), 1.6);
      const x = cx + Math.cos(a) * rr * w * 0.5;
      const z = cz + Math.sin(a) * rr * w * 0.22;
      const y = base + up * hgt * (1 - rr * 0.55);
      const r = w * (0.09 + 0.12 * rand(i, seed + 3)) * (1.15 - up * 0.45);
      clouds.push([x, y, z, r, center.x, center.y, center.z, base]);
    }
  };
  // big formations mostly ahead (-Z), framing the journey; distances in metres
  const spec = [
    // x, z, base, width, height, lumps
    [-1700, -3600, 260, 1500, 900, 34], [600, -4200, 300, 1800, 1150, 40], [2400, -3300, 240, 1300, 820, 30],
    [-3200, -2400, 250, 1200, 700, 26], [3400, -1900, 280, 1100, 650, 24], [-400, -6200, 320, 2600, 1300, 44],
    [-4200, -5200, 300, 2000, 1000, 34], [4600, -5600, 320, 2200, 1100, 36], [1500, -2300, 380, 700, 380, 18],
    [-1100, -2000, 420, 650, 300, 16], [-2600, -900, 340, 900, 420, 20], [2700, -700, 360, 900, 450, 20],
    [200, -1500, 520, 420, 160, 12], [-500, -1300, 560, 380, 140, 10],
    // hero towers flanking the sunset
    [-1500, -3300, 280, 1700, 1700, 70], [1900, -4300, 300, 1500, 1400, 60],
  ];
  spec.forEach((s, i) => addCloud(s[0], s[1], s[2], s[3], s[4], 100 + i * 17, s[5]));
  const sGeo = new THREE.IcosahedronGeometry(1, 4);
  const ig = new THREE.InstancedBufferGeometry();
  ig.index = sGeo.index; ig.attributes.position = sGeo.attributes.position;
  const a1 = new Float32Array(clouds.length * 4), a2 = new Float32Array(clouds.length * 4);
  clouds.forEach((c, i) => { a1.set([c[0], c[1], c[2], c[3]], i * 4); a2.set([c[4], c[5], c[6], c[7]], i * 4); });
  ig.setAttribute('iSphere', new THREE.InstancedBufferAttribute(a1, 4));
  ig.setAttribute('iCluster', new THREE.InstancedBufferAttribute(a2, 4));
  ig.instanceCount = clouds.length;
  const cPair = makeMaterial({ name: 'clouds', vertex: cloudVert, fragment: cloudFrag, castShadow: false });
  const cm = applyMat(new THREE.Mesh(ig, cPair.mat), cPair);
  cm.frustumCulled = false; cm.renderOrder = -900;
  group.add(cm);
  return { group, dome, clouds: cm };
}
