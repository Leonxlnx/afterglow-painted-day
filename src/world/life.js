// Living details: the kite child, the red kite + tail + string, birds, butterflies, petals, fireflies, dust motes, light beams.
import * as THREE from 'three';
import { makeMaterial, applyMat, U } from '../render/materials.js';
import { rand, heightAt, hNear } from './heightfield.js';

export const LU = {
  uPetals: { value: 0 }, uSwirl: { value: 0 }, uFireflies: { value: 0 }, uDust: { value: 0 }, uButterflies: { value: 1 }, uBirds: { value: 0 },
  uBeams: { value: 0 }, uBoxC: { value: new THREE.Vector3() }, uKite: { value: new THREE.Vector3() }, uHand: { value: new THREE.Vector3() },
  uTreeCrown: { value: new THREE.Vector3() },
};

const BILL = /* glsl */`
vec3 camRight(){ return vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); }
vec3 camUp(){ return vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]); }
uniform float uPetals, uSwirl, uFireflies, uDust, uButterflies, uBirds, uBeams;
uniform vec3 uBoxC, uKite, uHand, uTreeCrown;
`;

function quadInstanced(n, attrs) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  for (const [k, sz, fn] of attrs) {
    const a = new Float32Array(n * sz);
    for (let i = 0; i < n; i++) { const v = fn(i); for (let j = 0; j < sz; j++) a[i * sz + j] = v[j]; }
    g.setAttribute(k, new THREE.InstancedBufferAttribute(a, sz));
  }
  g.instanceCount = n;
  return g;
}

// ---------------- petals (wind-borne, wrapped around the camera) + blossom swirl from the great tree ----------------
const petalVert = BILL + /* glsl */`
attribute vec4 iA; attribute vec4 iB;
varying vec2 vQ; varying vec3 vWP; varying vec3 vCol; varying float vFade; varying vec3 vN;
mat3 rotAxis(vec3 a, float ang){ float c = cos(ang), s = sin(ang); return mat3(c + a.x*a.x*(1.0-c), a.y*a.x*(1.0-c) + a.z*s, a.z*a.x*(1.0-c) - a.y*s,
  a.x*a.y*(1.0-c) - a.z*s, c + a.y*a.y*(1.0-c), a.z*a.y*(1.0-c) + a.x*s, a.x*a.z*(1.0-c) + a.y*s, a.y*a.z*(1.0-c) - a.x*s, c + a.z*a.z*(1.0-c)); }
void main(){
  float t = uTime;
  float kind = iB.w; // 0 = drifting field, 1 = tree swirl
  vec3 c; float fade = 1.0; float size = 0.035 + 0.025 * iB.x;
  if (kind < 0.5) {
    vec3 B = vec3(34.0, 14.0, 34.0);
    size *= 0.8;
    vec3 p = iA.xyz * B + uWind * t * (1.6 + 1.2 * iB.y) + vec3(sin(t * 0.7 + iA.w * 20.0), 0.35 * sin(t * 1.1 + iA.w * 13.0), cos(t * 0.6 + iA.w * 9.0)) * 1.2;
    vec3 rel = p - uBoxC;
    rel = mod(rel + B * 0.5, B) - B * 0.5;
    c = uBoxC + rel;
    float th = terrainH(c.xz);
    c.y = max(c.y, th + 0.3);
    vec3 q = abs(rel) / B;
    fade = 1.0 - smoothstep(0.32, 0.5, max(q.x, max(q.y, q.z)));
    fade *= step(iA.w, uPetals);
  } else {
    float life = 9.0;
    float age = mod(t + iA.w * life, life);
    vec3 o = (iA.xyz - 0.5) * vec3(14.0, 8.0, 14.0);
    vec3 drift = normalize(vec3(-0.84, 0.0, -0.54)) * age * (2.0 + iB.y * 1.4) + vec3(0.0, age * age * 0.1 * (0.5 + iB.z), 0.0);
    vec3 sw = vec3(sin(age * 1.7 + iA.w * 30.0), cos(age * 1.3 + iA.w * 17.0) * 0.6, cos(age * 1.9 + iA.w * 11.0)) * (0.8 + age * 0.35);
    c = uTreeCrown + o + drift + sw;
    fade = smoothstep(0.0, 0.6, age) * (1.0 - smoothstep(life - 2.0, life, age)) * step(iA.w, uSwirl);
  }
  fade *= smoothstep(1.8, 4.5, length(c - cameraPosition));
  vec3 ax = normalize(vec3(iB.y - 0.5, iB.z - 0.5, iB.x - 0.5) + 0.01);
  mat3 R = rotAxis(ax, t * (2.0 + 3.0 * iB.z) + iA.w * 50.0);
  vec3 lp = R * vec3(position.x * size * 1.25, position.y * size, 0.0);
  vec3 wp = c + lp * fade;
  vN = R * vec3(0.0, 0.0, 1.0);
  vQ = position.xy; vWP = wp; vFade = fade;
  vec3 pink = mix(vec3(1.0, 0.52, 0.72), vec3(1.0, 0.82, 0.9), iB.z);
  vCol = mix(pink, vec3(1.0, 0.75, 0.6), step(0.8, iB.x) * 0.6);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const petalFrag = /* glsl */`
varying vec2 vQ; varying vec3 vWP; varying vec3 vCol; varying float vFade; varying vec3 vN;
void main(){
  vec2 q = vQ;
  // rounded petal with a soft notch, fully inside the quad
  float w = 0.62 * (1.0 - 0.38 * q.y) * (1.0 - 0.25 * smoothstep(0.75, 1.0, q.y) * (1.0 - abs(q.x) * 4.0));
  float d = length(vec2(q.x / max(w, 0.05), q.y / 0.95));
  if (d > 1.0 || vFade < 0.02) discard;
  float sh = sunShadow(vWP, vec3(0.0, 1.0, 0.0));
  float lit = sh * 0.8 + 0.2;
  vec3 V = normalize(cameraPosition - vWP);
  float back = pow(saturate(dot(-V, uSunDir)), 3.0);
  vec3 col = vCol * mix(uShadowTint * 0.8 + uAmbTop * 0.4, uSunColor * 0.75, lit) + vCol * uSunColor * back * 0.6 * sh;
  col = applyAtmos(col, vWP);
  writeOut(col, vWP.xz, RID_DETAIL, vWP);
}`;

// ---------------- glow sprites: fireflies + sun-lit dust ----------------
const glowVert = BILL + /* glsl */`
attribute vec4 iA; attribute vec4 iB;
varying vec2 vQ; varying float vI; varying vec3 vCol;
void main(){
  float t = uTime; vec3 c; float size; float I;
  if (iB.w < 0.5) { // firefly
    vec3 a = iA.xyz;
    vec3 w = vec3(sin(t * 0.5 + iA.w * 40.0), sin(t * 0.7 + iA.w * 23.0) * 0.35, cos(t * 0.43 + iA.w * 31.0)) * vec3(1.2, 1.0, 1.2);
    c = a + w;
    c.y = max(c.y, terrainH(c.xz) + 0.25);
    float pulse = pow(0.5 + 0.5 * sin(t * (1.5 + iB.y * 2.0) + iA.w * 60.0), 3.0);
    I = 0.0; // fireflies are drawn in the post-paint overlay now
    size = 0.045 + 0.03 * iB.z;
    vCol = mix(vec3(0.82, 0.92, 0.32), vec3(0.95, 0.98, 0.5), iB.y) * 2.6;
  } else { // dust mote, only visible in sunlight
    vec3 B = vec3(26.0, 14.0, 26.0);
    vec3 p = iA.xyz * B + vec3(sin(t * 0.3 + iA.w * 20.0), sin(t * 0.21 + iA.w * 9.0) - t * 0.05, cos(t * 0.27 + iA.w * 13.0)) * 0.8;
    vec3 rel = mod(p - uBoxC + B * 0.5, B) - B * 0.5;
    c = uBoxC + rel;
    float lit = sunShadow(c, uSunDir);
    vec3 q = abs(rel) / B;
    float fade = 1.0 - smoothstep(0.3, 0.5, max(q.x, max(q.y, q.z)));
    float tw = 0.5 + 0.5 * sin(t * 3.0 + iA.w * 70.0);
    I = uDust * lit * fade * tw * step(iA.w, uDust);
    size = 0.012 + 0.012 * iB.z;
    vCol = uSunColor * 0.9;
  }
  float dist = length(c - cameraPosition);
  size = max(size, dist * 0.0009);
  I *= smoothstep(2.5, 7.0, dist);
  vec3 wp = c + (camRight() * position.x + camUp() * position.y) * size * 1.4;
  vQ = position.xy; vI = I;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const glowFrag = /* glsl */`
varying vec2 vQ; varying float vI; varying vec3 vCol;
void main(){
  float r = length(vQ);
  float g = exp(-r * r * 30.0) * 1.8 + 0.22 * exp(-r * r * 4.0);
  if (vI < 0.002 || r > 1.0) discard;
  writeGlow(vCol * g * vI);
}`;

// ---------------- light beams (only where sunlight reaches the ground) ----------------
const beamVert = BILL + /* glsl */`
attribute vec4 iA; // base xyz, seed
varying vec2 vQ; varying float vI; varying float vAlong;
void main(){
  vec3 base = iA.xyz;
  vec3 ax = normalize(uSunDir);
  float len = 26.0 + 14.0 * fract(iA.w * 7.3);
  float hero = step(1.5, iA.w);
  float lit = max(sunShadow(base + vec3(0.0, 0.3, 0.0), vec3(0.0, 1.0, 0.0)), hero);
  base += ax * 2.0;
  vec3 mid = base + ax * len * 0.5;
  vec3 toCam = normalize(cameraPosition - mid);
  vec3 side = normalize(cross(ax, toCam));
  float w = mix(0.6 + 1.2 * fract(iA.w * 3.1), 0.6 + 0.8 * fract(iA.w * 3.1), hero);
  vec3 wp = mid + ax * position.y * len * 0.5 + side * position.x * w;
  vQ = position.xy; vAlong = position.y;
  float flick = 0.75 + 0.25 * sin(uTime * 0.6 + iA.w * 40.0);
  vI = lit * uBeams * flick * smoothstep(0.02, 0.15, uSunDir.y) * smoothstep(5.0, 12.0, length(mid - cameraPosition)) * mix(0.55, 2.1, hero);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const beamFrag = /* glsl */`
varying vec2 vQ; varying float vI; varying float vAlong;
void main(){
  if (vI < 0.003) discard;
  float across = 1.0 - smoothstep(0.0, 1.0, abs(vQ.x));
  across *= across;
  float along = smoothstep(-1.0, -0.75, vAlong) * (1.0 - smoothstep(0.1, 1.0, vAlong));
  writeGlow(uSunColor * vec3(1.0, 0.92, 0.66) * across * along * vI * 0.11);
}`;

// ---------------- warm light pools on the forest floor under the hero shafts ----------------
const poolVert = BILL + /* glsl */`
attribute vec4 iA;
varying vec2 vQ; varying float vI;
void main(){
  vec3 ax = normalize(uSunDir);
  // where the shaft meets the ground (shaft starts 2 m up along the sun ray from the base)
  vec3 c = iA.xyz + vec3(0.0, 0.07, 0.0);
  float R = 1.5 + 1.2 * fract(iA.w * 5.7);
  vec2 sh = normalize(ax.xz + 1e-4);
  vec3 a1 = vec3(sh.x, 0.0, sh.y) * R * 1.5, a2 = vec3(-sh.y, 0.0, sh.x) * R * 0.75;
  vec3 wp = c + a1 * position.x + a2 * position.y;
  wp.y = max(wp.y, terrainH(wp.xz) + 0.06);
  vQ = position.xy;
  vI = uBeams * smoothstep(0.02, 0.15, uSunDir.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const poolFrag = /* glsl */`
varying vec2 vQ; varying float vI;
void main(){
  float r = length(vQ);
  if (r > 1.0 || vI < 0.003) discard;
  float g = exp(-r * r * 2.6) * (0.75 + 0.25 * vnoise(vQ * 4.0 + 3.0));
  writeGlow(uSunColor * vec3(1.0, 0.86, 0.5) * g * vI * 0.22);
}`;

// ---------------- butterflies ----------------
const bflyVert = BILL + /* glsl */`
attribute vec4 iA; attribute vec4 iB;
varying vec2 vQ; varying vec3 vWP; varying float vSide; varying vec3 vCol;
void main(){
  float t = uTime;
  float ph = iA.w * 100.0;
  vec3 path = vec3(sin(t * 0.55 + ph) * 1.8 + sin(t * 1.3 + ph * 2.0) * 0.5, sin(t * 0.9 + ph) * 0.5 + sin(t * 2.1 + ph) * 0.15, cos(t * 0.45 + ph) * 1.8);
  vec3 c = iA.xyz + path;
  c.y = max(c.y, terrainH(c.xz) + 0.4);
  vec3 vel = normalize(vec3(cos(t * 0.55 + ph) * 1.0, 0.0, -sin(t * 0.45 + ph) * 0.8) + 0.001);
  vec3 up = vec3(0.0, 1.0, 0.0), sideV = normalize(cross(up, vel));
  float flap = sin(t * 17.0 + ph) * 0.9 + 0.2;
  float sideSign = sign(position.x);
  float u = abs(position.x);
  // wing: hinge along the body axis
  vec3 wingDir = normalize(sideV * sideSign * cos(flap) + up * sin(flap));
  float s = 0.07 + 0.03 * iB.x;
  vec3 wp = c + (wingDir * u * 1.0 + vel * position.y * 0.8) * s * step(0.5, uButterflies + 0.5);
  vQ = vec2(u, position.y); vWP = wp; vSide = sideSign;
  vCol = mix(vec3(1.0, 0.98, 0.94), vec3(1.0, 0.72, 0.35), step(0.8, iB.y));
  if (uButterflies < 0.01) wp = vec3(0.0, -1000.0, 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const bflyFrag = /* glsl */`
varying vec2 vQ; varying vec3 vWP; varying float vSide; varying vec3 vCol;
void main(){
  vec2 q = vQ;
  float upper = length((q - vec2(0.55, 0.35)) * vec2(1.0, 1.25));
  float lower = length((q - vec2(0.45, -0.4)) * vec2(1.2, 1.4));
  if (min(upper, lower) > 0.48) discard;
  float sh = sunShadow(vWP, vec3(0.0, 1.0, 0.0));
  vec3 col = vCol * mix(uShadowTint * 0.9 + uAmbTop * 0.3, uSunColor * 0.8, sh * 0.85 + 0.15);
  col = applyAtmos(col, vWP);
  writeOut(col, vWP.xz, RID_DETAIL, vWP);
}`;

// ---------------- birds ----------------
const birdVert = BILL + /* glsl */`
attribute vec4 iA; attribute vec4 iB;
varying vec3 vWP; varying float vFlock; varying float vUp; varying vec2 vQ; varying float vFlap;
void main(){
  float t = uTime;
  vec3 A, Bp; float T; vec3 spread;
  if (iB.w < 0.5) {
    T = (t - 22.5 - iB.x * 1.5) / 14.0;
    A = vec3(150.0, 92.0, -360.0); Bp = vec3(-190.0, 72.0, -420.0); spread = vec3(9.0, 4.0, 9.0);
  } else if (iB.w > 1.5) {
    // opening: a small flock sweeps across the sky above the viaduct
    T = (t + 0.4 - iB.x * 0.5) / 7.0;
    A = vec3(70.0, 30.0, -40.0); Bp = vec3(-90.0, 44.0, -120.0); spread = vec3(5.0, 2.0, 4.0);
  } else {
    // burst: birds lift out of the last trees as the music drops and sail toward the sunset
    T = (t - 17.7 - iB.x * 0.5) / 8.0;
    A = vec3(-2.0, 34.0, -222.0); Bp = vec3(-46.0, 84.0, -400.0); spread = vec3(9.0, 4.0, 8.0) * (0.9 + T * 2.0);
  }
  float Te = T * T * (3.0 - 2.0 * T) * 0.4 + T * 0.6;
  vec3 c = mix(A, Bp, Te) + iA.xyz * spread + vec3(0.0, sin(T * 6.0 + iA.w * 9.0) * 1.5, 0.0);
  float flap = sin(t * (7.0 + 2.0 * iB.y) + iA.w * 30.0);
  float span = (iB.w > 0.5 ? 1.2 : 0.9) * (0.6 + 0.7 * iB.z);
  float dist = length(c - cameraPosition);
  span = min(max(span, dist * 0.0055), dist * 0.07);
  float bank = (iB.y - 0.5) * 0.85 + sin(t * 0.8 + iA.w * 10.0) * 0.2;
  vec3 wp = c + (camRight() * position.x + camUp() * position.y * 0.5) * span;
  float cb = cos(bank), sb = sin(bank);
  vQ = mat2(cb, sb, -sb, cb) * position.xy; vFlap = flap;
  if (uBirds < 0.5 || T < 0.0 || T > 1.0) wp = vec3(0.0, -1000.0, 0.0);
  vWP = wp; vFlock = iB.w; vUp = flap;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const birdFrag = /* glsl */`
varying vec3 vWP; varying float vFlock; varying float vUp; varying vec2 vQ; varying float vFlap;
float segD(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
void main(){
  // painted gull silhouette: body + head + wings that bend at the wrist (wing shape changes with the flap)
  vec2 q = vec2(abs(vQ.x), vQ.y);
  float f = vFlap;
  vec2 root = vec2(0.06, 0.0), elbow = vec2(0.42, 0.10 + f * 0.22), wrist = vec2(0.72, 0.16 + f * 0.42), tip = vec2(1.0, 0.06 + f * 0.62);
  float w1 = segD(q, root, elbow) - 0.12, w2 = segD(q, elbow, wrist) - 0.085, w3 = segD(q, wrist, tip) - 0.04;
  float wing = min(w1, min(w2, w3));
  float body = length((vQ - vec2(0.0, -0.02)) * vec2(3.2, 1.6)) - 0.2;
  float head = length(vQ - vec2(0.0, 0.17)) - 0.075;
  if (min(wing, min(body, head)) > 0.0) discard;
  vec3 col = mix(uShadowTint * 0.18, uSkyZenith * 0.25, 0.4);
  if (vFlock > 0.5) { // dark silhouettes with a warm rim from the low sun
    col = mix(vec3(0.066, 0.042, 0.078), uSunColor * 0.1, 0.2 * smoothstep(-0.1, 0.3, vUp)); // warm dark grey ~#4a3a4f
  }
  col = applyAtmos(col, vWP) * 0.95;
  writeOut(col, vWP.xz, RID_GLOW, vWP);
}`;

// ---------------- figure (child), kite, tail, string ----------------
const figVert = /* glsl */`
attribute vec3 color; attribute float flutter;
varying vec3 vWP; varying vec3 vN; varying vec3 vCol;
void main(){
  vec3 p = position;
  // right arm tugs the kite string (pivot at the shoulder)
  if (flutter < -0.5) {
    vec3 sh = vec3(0.16, 1.06, -0.02);
    float a = sin(uTime * 1.9) * 0.1 + sin(uTime * 0.7 + 1.3) * 0.08;
    vec3 d = p - sh; float c = cos(a), s = sin(a);
    p = sh + vec3(d.x, d.y * c - d.z * s, d.y * s + d.z * c);
  }
  p.x += sin(uTime * 1.3) * 0.018 * p.y; p.z += sin(uTime * 0.9 + 1.0) * 0.012 * p.y;
  // scarf / hair flutter in the wind (flutter = distance along the scarf)
  float f = max(flutter, 0.0);
  p += uWind * f * 0.9 + vec3(0.0, sin(uTime * 7.0 - f * 6.0) * 0.06 * f, 0.0) + cross(uWind, vec3(0.0, 1.0, 0.0)) * sin(uTime * 5.0 - f * 5.0) * 0.08 * f;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWP = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vCol = color;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const figFrag = /* glsl */`
varying vec3 vWP; varying vec3 vN; varying vec3 vCol;
void main(){
#ifdef SHADOW_PASS
  oColor = vec4(1.0); return;
#else
  vec3 n = normalize(vN);
  float sh = sunShadow(vWP, n);
  float lit = toonBand(dot(n, uSunDir), 0.08) * sh;
  vec3 col = paintLight(vCol, n, lit, 1.0);
  vec3 V = normalize(cameraPosition - vWP);
  col += (vCol * 0.5 + vec3(1.0, 0.62, 0.38)) * uSunColor * pow(1.0 - saturate(dot(n, V)), 2.0) * (0.25 + pow(saturate(dot(-V, uSunDir)), 2.0)) * 0.9; // warm rim
  col += uHorizonGlow * pow(1.0 - saturate(dot(n, V)), 2.0) * 0.35 * (1.0 - smoothstep(-0.02, 0.1, uSunDir.y)); // afterglow rim at dusk
  col = applyAtmos(col, vWP);
  writeOut(col, vec2(vWP.x * 0.8 + vWP.z * 0.6, vWP.y), RID_DETAIL, vWP);
#endif
}`;

const kiteVert = BILL + /* glsl */`
attribute vec3 color; attribute float seg; // seg < 0: kite body, seg >= 0: tail/string param
attribute float part; // 0 body, 1 tail, 2 string
varying vec3 vWP; varying vec3 vCol; varying vec3 vN;
void main(){
  vec3 K = uKite;
  vec3 wdir = normalize(uWind + vec3(0.0, 0.25, 0.0));
  vec3 fwd = normalize(K - uHand);                 // string direction
  vec3 sideV = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 upV = normalize(cross(fwd, sideV));
  vec3 wp; vec3 n = -fwd;
  if (part < 0.5) {
    // diamond kite facing the hand, slight bow and wobble
    float wob = sin(uTime * 2.3) * 0.12;
    vec3 sv = normalize(sideV * cos(wob) + upV * sin(wob));
    vec3 uv2 = normalize(cross(fwd, sv));
    wp = K + sv * position.x * 3.6 + uv2 * position.y * 3.6 - fwd * abs(position.x) * 0.8;
  } else if (part < 1.5) {
    // tail hangs downwind/below the kite and snakes
    float s = seg;
    vec3 down = normalize(vec3(0.0, -1.0, 0.0) * 0.8 + wdir * 0.6);
    vec3 sideW = normalize(cross(down, -fwd));
    vec3 c = K - upV * 2.7 + down * s * 17.0 + sideW * sin(uTime * 3.4 - s * 9.0) * s * 2.2 + (-fwd) * sin(uTime * 2.6 - s * 7.0) * s * 1.1;
    vec3 toCam = normalize(cameraPosition - c);
    vec3 wv = normalize(cross(down, toCam));
    wp = c + wv * position.x * (0.16 + 0.34 * step(0.5, fract(s * 10.0)) * step(fract(s * 10.0), 0.62));
    n = toCam;
  } else {
    // string: sagging line from hand to kite, camera-facing ribbon
    float s = seg;
    vec3 c = mix(uHand, K - upV * 0.2, s) - vec3(0.0, 1.0, 0.0) * 6.0 * s * (1.0 - s) + wdir * 2.0 * s * (1.0 - s);
    vec3 dirS = normalize(K - uHand);
    vec3 toCam = normalize(cameraPosition - c);
    vec3 wv = normalize(cross(dirS, toCam));
    float d = length(cameraPosition - c);
    wp = c + wv * position.x * max(0.012, d * 0.00075);
    n = toCam;
  }
  vWP = wp; vCol = color; vN = n;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const kiteFrag = /* glsl */`
varying vec3 vWP; varying vec3 vCol; varying vec3 vN;
void main(){
#ifdef SHADOW_PASS
  oColor = vec4(1.0); return;
#else
  vec3 V = normalize(cameraPosition - vWP);
  float back = pow(saturate(dot(-V, uSunDir)), 2.0);
  vec3 col = vCol * (uSunColor * 0.3 + uAmbTop * 0.35) + vCol * uSunColor * back * 0.28; // kite fabric glows when backlit
  col = applyAtmos(col, vWP);
  writeOut(col, vWP.xz, RID_DETAIL, vWP);
#endif
}`;

function buildKid() {
  const parts = [];
  const add = (geo, color, m = null, flutter = 0) => {
    if (m) geo.applyMatrix4(m);
    const n = geo.attributes.position.count;
    const c = new THREE.Color(color);
    geo.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => [c.r, c.g, c.b][i % 3]), 3));
    const fl = geo.userData.flutter || new Float32Array(n).fill(flutter);
    geo.setAttribute('flutter', new THREE.Float32BufferAttribute(fl, 1));
    parts.push(geo.index ? geo.toNonIndexed() : geo);
  };
  const M = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));
  const skin = '#f2c9a8', shirt = '#f2c46a', shorts = '#2b3350', hair = '#3a2a24', shoe = '#ece6dc', scarf = '#e23b3b';
  add(new THREE.CapsuleGeometry(0.08, 0.38, 4, 10), skin, M(-0.085, 0.27, 0, 0, 0, 0.04));
  add(new THREE.CapsuleGeometry(0.08, 0.38, 4, 10), skin, M(0.085, 0.27, 0.02, -0.12, 0, -0.04));
  add(new THREE.SphereGeometry(0.075, 10, 8), shoe, M(-0.08, 0.04, 0.03, 0, 0, 0));
  add(new THREE.SphereGeometry(0.075, 10, 8), shoe, M(0.08, 0.04, 0.06, 0, 0, 0));
  add(new THREE.CylinderGeometry(0.15, 0.19, 0.22, 14), shorts, M(0, 0.6, 0));
  add(new THREE.CylinderGeometry(0.16, 0.2, 0.42, 14), shirt, M(0, 0.86, 0));
  add(new THREE.SphereGeometry(0.16, 14, 10), shirt, M(0, 1.03, 0, 0, 0, 0, 1));
  add(new THREE.CapsuleGeometry(0.045, 0.36, 4, 8), shirt, M(-0.2, 0.86, 0, 0.1, 0, 0.25));
  // right arm raised toward the kite (forward = -z)
  add(new THREE.CapsuleGeometry(0.045, 0.38, 4, 8), shirt, M(0.19, 1.13, -0.13, -1.05, 0, -0.35), -1);
  add(new THREE.SphereGeometry(0.045, 8, 6), skin, M(0.25, 1.32, -0.32), -1);
  add(new THREE.SphereGeometry(0.13, 16, 12), skin, M(0, 1.29, 0));
  add(new THREE.SphereGeometry(0.142, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hair, M(0, 1.31, 0.012, 0.25, 0, 0));
  // scarf: a ribbon from the neck, flutter attribute grows along it
  const sg = new THREE.PlaneGeometry(0.16, 1.25, 1, 14);
  const fl = new Float32Array(sg.attributes.position.count);
  for (let i = 0; i < fl.length; i++) fl[i] = (0.625 - sg.attributes.position.getY(i)) / 1.25;
  sg.translate(0, -0.625, 0); sg.rotateX(Math.PI / 2); sg.userData.flutter = fl;
  add(sg, scarf, M(0.05, 1.12, 0.12, 0.25, 0, 0));
  add(new THREE.TorusGeometry(0.12, 0.04, 6, 14), scarf, M(0, 1.13, 0, Math.PI / 2, 0, 0));
  const merged = mergeAttrs(parts);
  return merged;
}
function mergeAttrs(list) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color', 'flutter']) {
    const sz = list[0].attributes[name].itemSize;
    const total = list.reduce((a, g) => a + g.attributes[name].count, 0);
    const arr = new Float32Array(total * sz); let o = 0;
    list.forEach(g => { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; });
    out.setAttribute(name, new THREE.BufferAttribute(arr, sz));
  }
  out.computeBoundingSphere();
  return out;
}

function buildKiteGeo() {
  const pos = [], col = [], seg = [], part = [], idx = [];
  const red = new THREE.Color('#d8222a'), cream = new THREE.Color('#ffc94a'), yel = new THREE.Color('#ffb02a');
  const v = (x, y, z, c, s, p) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); seg.push(s); part.push(p); return pos.length / 3 - 1; };
  // body: diamond split into 4 panels with alternate colours
  const top = [0, 0.75], right = [0.5, 0.12], bot = [0, -0.85], left = [-0.5, 0.12], c0 = [0, 0.12];
  const tri = (a, b, c, color) => { const i = v(a[0], a[1], 0, color, -1, 0), j = v(b[0], b[1], 0, color, -1, 0), k = v(c[0], c[1], 0, color, -1, 0); idx.push(i, j, k, i, k, j); };
  tri(top, right, c0, red); tri(right, bot, c0, cream); tri(bot, left, c0, red); tri(left, top, c0, cream);
  // tail ribbon
  const N = 40;
  for (let i = 0; i <= N; i++) { const s = i / N; v(-1, 0, 0, i % 4 < 2 ? yel : red, s, 1); v(1, 0, 0, i % 4 < 2 ? yel : red, s, 1); }
  const t0 = (pos.length / 3) - (N + 1) * 2;
  for (let i = 0; i < N; i++) { const a = t0 + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  // string
  const S = 80, dark = new THREE.Color('#3a3040');
  for (let i = 0; i <= S; i++) { const s = i / S; v(-1, 0, 0, dark, s, 2); v(1, 0, 0, dark, s, 2); }
  const s0 = (pos.length / 3) - (S + 1) * 2;
  for (let i = 0; i < S; i++) { const a = s0 + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('seg', new THREE.Float32BufferAttribute(seg, 1));
  g.setAttribute('part', new THREE.Float32BufferAttribute(part, 1));
  g.setIndex(idx);
  return g;
}

function birdGeo() {
  // body + two wings (x: span, z: along body)
  const pos = [0, 0, 0.38, -0.07, 0, -0.1, 0.07, 0, -0.1,      // body
    0, 0.02, -0.1, -0.06, 0, -0.42, 0.06, 0, -0.42,                     // tail
    0, 0, 0.2, 0, 0, -0.18, -0.95, 0.06, -0.08, 0, 0, 0.2, -0.95, 0.06, -0.08, -1.0, 0.04, 0.06,   // left wing
    0, 0, 0.2, 1.0, 0.04, 0.06, 0.95, 0.06, -0.08, 0, 0, 0.2, 0.95, 0.06, -0.08, 0, 0, -0.18];  // right wing
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

export function createLife({ kid, treeCrown, routeForest }) {
  const group = new THREE.Group();
  const meshes = {};
  const mk = (name, geo, vert, frag, opts = {}) => {
    const pair = makeMaterial({ name, vertex: vert, fragment: frag, uniforms: LU, ...opts });
    const m = applyMat(new THREE.Mesh(geo), pair);
    m.frustumCulled = false; m.userData.noReflect = !opts.reflect;
    group.add(m); meshes[name] = m; return m;
  };
  // petals: 2600 drifting + 2400 swirling from the tree
  const NP = 2600, NS = 2400;
  mk('petals', quadInstanced(NP + NS, [
    ['iA', 4, i => [rand(i, 1), rand(i, 2), rand(i, 3), i < NP ? i / NP : (i - NP) / NS]],
    ['iB', 4, i => [rand(i, 4), rand(i, 5), rand(i, 6), i < NP ? 0 : 1]],
  ]), petalVert, petalFrag, { side: THREE.DoubleSide, castShadow: false });
  // fireflies around the hilltop & dust motes along the forest
  const NF = 700, ND = 2500;
  const hill = kid;
  mk('glow', quadInstanced(NF + ND, [
    ['iA', 4, i => {
      if (i < NF) { const a = rand(i, 11) * 6.283, r = 2 + Math.sqrt(rand(i, 12)) * 22; const x = hill.x + Math.cos(a) * r, z = hill.z + 6 + Math.sin(a) * r * 0.8; return [x, heightAt(x, z) + 0.25 + rand(i, 13) * 0.9, z, i / NF]; }
      const j = i - NF; return [rand(j, 21), rand(j, 22), rand(j, 23), j / ND];
    }],
    ['iB', 4, i => [rand(i, 31), rand(i, 32), rand(i, 33), i < NF ? 0 : 1]],
  ]), glowVert, glowFrag, { additive: true });
  // light beams in the forest
  const beams = [];
  for (let k = 0; k < 420; k++) {
    const p = routeForest[Math.floor(rand(k, 41) * routeForest.length)];
    const x = p.x + (rand(k, 42) - 0.5) * 34, z = p.z + (rand(k, 43) - 0.5) * 30;
    beams.push([x, hNear(x, z), z, rand(k, 44)]);
  }
  // hero shafts across the forest path ahead of the camera (always lit: cathedral light)
  const heroPts = routeForest.filter(p => p.z < -150 && p.z > -232);
  for (let k = 0; k < 16; k++) {
    const p = heroPts[Math.floor((k + 0.5) / 16 * heroPts.length)];
    if (!p) continue;
    const side = (k % 2 ? 1 : -1) * (1.5 + rand(k, 141) * 6);
    const x = p.x + side, z = p.z - 8 - rand(k, 142) * 10;
    beams.push([x, hNear(x, z), z, 2.0 + rand(k, 143)]);
  }
  mk('beams', quadInstanced(beams.length, [['iA', 4, i => beams[i]]]), beamVert, beamFrag, { additive: true });
  const pools = beams.filter(b => b[3] >= 1.5);
  mk('pools', quadInstanced(pools.length, [['iA', 4, i => pools[i]]]), poolVert, poolFrag, { additive: true });
  // butterflies along the route
  const NB = 70;
  const bf = [];
  for (let k = 0; k < NB; k++) {
    const p = routeForest[Math.floor(rand(k, 51) * routeForest.length)];
    const x = p.x + (rand(k, 52) - 0.5) * 16, z = p.z + (rand(k, 53) - 0.5) * 20;
    bf.push([x, hNear(x, z) + 0.8 + rand(k, 54) * 2.0, z, rand(k, 55)]);
  }
  const bg = quadInstanced(NB, [['iA', 4, i => bf[i]], ['iB', 4, i => [rand(i, 61), rand(i, 62), rand(i, 63), 0]]]);
  mk('butterflies', bg, bflyVert, bflyFrag, { side: THREE.DoubleSide, castShadow: false });
  // birds (flock 0: far sunset crossing, 1: burst on the drop, 2: opening flyover)
  const NB0 = 18, NB1 = 9, NB2 = 7, NBd = NB0 + NB1 + NB2;
  const bgeo = quadInstanced(NBd, [
    ['iA', 4, i => {
      if (i < NB0) { const row = Math.floor(Math.sqrt(i)), off = i - row * row; return [(off - row) * 0.9 + (rand(i, 71) - 0.5), (rand(i, 72) - 0.5), row * 0.9 + (rand(i, 73) - 0.5), rand(i, 74)]; }
      return [(rand(i, 81) - 0.5) * 2, (rand(i, 82) - 0.5) * 2, (rand(i, 83) - 0.5) * 2, rand(i, 84)];
    }],
    ['iB', 4, i => [rand(i, 85), rand(i, 86), rand(i, 87), i < NB0 ? 0 : i < NB0 + NB1 ? 1 : 2]],
  ]);
  mk('birds', bgeo, birdVert, birdFrag, { side: THREE.DoubleSide, castShadow: false });
  // kid
  const kg = buildKid();
  const kidPair = makeMaterial({ name: 'kid', vertex: figVert, fragment: figFrag, uniforms: LU });
  const kidMesh = applyMat(new THREE.Mesh(kg), kidPair);
  kidMesh.position.set(kid.x, heightAt(kid.x, kid.z) - 0.02, kid.z);
  kidMesh.rotation.y = -0.19;
  kidMesh.scale.setScalar(1.25);
  kidMesh.updateMatrixWorld();
  group.add(kidMesh);
  const hand = new THREE.Vector3(0.25, 1.32, -0.32).applyMatrix4(kidMesh.matrixWorld);
  LU.uHand.value.copy(hand);
  // kite + tail + string
  const kite = mk('kite', buildKiteGeo(), kiteVert, kiteFrag, { side: THREE.DoubleSide, castShadow: false, reflect: true });
  kite.userData.noReflect = false;
  LU.uTreeCrown.value.copy(treeCrown);
  // overlay: fireflies drawn after the painterly pass (crisp glowing cores), occluded by the painted scene's depth
  const overlay = new THREE.Scene();
  const NFO = 80;
  const ffGeo = quadInstanced(NFO, [['iA', 4, i => { const a = rand(i, 211) * 6.283, r = 2.5 + Math.sqrt(rand(i, 212)) * 16; const x = kid.x + Math.cos(a) * r, z = kid.z + 5 + Math.sin(a) * r * 0.8; return [x, heightAt(x, z) + 0.3 + rand(i, 213) * 1.0, z, i / NFO]; }],
    ['iB', 4, i => [rand(i, 221), rand(i, 222), rand(i, 223), 0]]]);
  const ffMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.uTime, uFireflies: LU.uFireflies, tAux: { value: null }, uFadeMul: { value: 1 } },
    vertexShader: `uniform float uTime; uniform float uFireflies; attribute vec4 iA; attribute vec4 iB;
out vec2 vQ; out float vI; out float vDist;
void main(){
  float t = uTime;
  vec3 c = iA.xyz + vec3(sin(t * 0.5 + iA.w * 40.0) * 1.1, sin(t * 0.7 + iA.w * 23.0) * 0.3, cos(t * 0.43 + iA.w * 31.0) * 1.1);
  float pulse = pow(0.5 + 0.5 * sin(t * (1.4 + iB.y * 1.8) + iA.w * 60.0), 2.0);
  vI = uFireflies * step(iA.w, uFireflies) * (0.25 + 0.75 * pulse);
  vec3 cr = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), cu = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float d = length(c - cameraPosition); vDist = d;
  vec3 wp = c + (cr * position.x + cu * position.y) * d * 0.017;
  vQ = position.xy;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`,
    fragmentShader: `precision highp float; uniform sampler2D tAux; uniform float uFadeMul; in vec2 vQ; in float vI; in float vDist;
layout(location = 0) out highp vec4 outColor;
void main(){
  if (vI < 0.003) discard;
  vec4 ax = texelFetch(tAux, ivec2(gl_FragCoord.xy), 0);
  if (ax.w < vDist - 0.6) discard;
  float r2 = dot(vQ, vQ);
  float g = exp(-r2 * 26.0) * 1.25 + exp(-r2 * 3.2) * 0.38;
  outColor = vec4(vec3(0.74, 1.0, 0.3) * g * vI * uFadeMul, 1.0);
}`,
  });
  const ff = new THREE.Mesh(ffGeo, ffMat); ff.frustumCulled = false; overlay.add(ff);
  return {
    group, kidMesh, overlay, ffMat,
    update(t, camera, tod) {
      const K0 = new THREE.Vector3(kid.x + 12, 0, kid.z - 92); K0.y = heightAt(kid.x, kid.z) + 40;
      LU.uKite.value.set(K0.x + Math.sin(t * 0.45) * 3.0 + Math.sin(t * 1.3) * 0.8, K0.y + Math.sin(t * 0.7) * 2.0 + Math.sin(t * 1.9) * 0.6, K0.z + Math.cos(t * 0.35) * 2.0);
      const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
      LU.uBoxC.value.copy(camera.position).addScaledVector(fwd, 10);
      const k = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
      LU.uPetals.value = Math.max(0, 0.2 + 0.08 * k(0, 6, t) - 0.18 * k(10, 16, t) + 0.5 * k(21, 27, t) - 0.7 * k(30.5, 34.5, t));
      LU.uSwirl.value = k(20, 26, t) * (1 - k(30.5, 34.5, t));
      LU.uFireflies.value = k(31, 37, t);
      LU.uDust.value = k(8, 11, t) * (1 - k(19, 22, t));
      LU.uBeams.value = k(9, 12, t) * (1 - k(19.5, 22, t));
      LU.uBirds.value = (t < 7.5 || (t > 17.5 && t < 38)) ? 1 : 0;
      LU.uButterflies.value = t < 21 ? 1 : 0;
    },
  };
}
