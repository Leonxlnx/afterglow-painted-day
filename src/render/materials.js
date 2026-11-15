// Shared uniforms, lighting GLSL and the material factory (every material writes MRT: colour + paint aux).
import * as THREE from 'three';
import { GLSL_COMMON } from '../glsl/common.js';

export const U = {
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0.6, 0.6, -0.3).normalize() },
  uSunColor: { value: new THREE.Color(3, 2.8, 2.5) },
  uShadowTint: { value: new THREE.Color(0.35, 0.42, 0.65) },
  uAmbTop: { value: new THREE.Color(0.25, 0.35, 0.55) },
  uAmbBottom: { value: new THREE.Color(0.18, 0.2, 0.12) },
  uSkyZenith: { value: new THREE.Color(0.1, 0.3, 0.8) },
  uSkyMid: { value: new THREE.Color(0.25, 0.5, 0.9) },
  uSkyHorizon: { value: new THREE.Color(0.6, 0.75, 0.9) },
  uSunGlow: { value: new THREE.Color(1, 0.9, 0.7) },
  uHorizonGlow: { value: new THREE.Color(1, 0.6, 0.3) },
  uHorizonGlowAmt: { value: 0.0 },
  uAntiSun: { value: new THREE.Color(0.8, 0.6, 0.8) },
  uAntiSunAmt: { value: 0.0 },
  uSunDisk: { value: 20.0 },
  uCloudLit: { value: new THREE.Color(1, 0.98, 0.95) },
  uCloudShade: { value: new THREE.Color(0.55, 0.62, 0.85) },
  uCloudRim: { value: new THREE.Color(1, 0.95, 0.8) },
  uCloudCover: { value: 0.45 },
  uStars: { value: 0.0 },
  uFogDensity: { value: 0.0018 },
  uFogHeight: { value: 0.012 },
  uFogMax: { value: 0.9 },
  uFogTint: { value: new THREE.Color(1, 1, 1) },
  uGrassLit: { value: new THREE.Color(0.75, 0.9, 0.25) },
  uGrassShade: { value: new THREE.Color(0.1, 0.32, 0.3) },
  uWarmth: { value: 0.0 }, // 0 day .. 1 sunset, used by materials for art-directed shifts
  uWind: { value: new THREE.Vector3(0.3, 0, -1).normalize() },
  uWindStrength: { value: 1.0 },
  // shadows (2 cascades)
  uShadowMap0: { value: null }, uShadowMap1: { value: null },
  uShadowMat0: { value: new THREE.Matrix4() }, uShadowMat1: { value: new THREE.Matrix4() },
  uShadowTexel: { value: new THREE.Vector4(1 / 4096, 1 / 4096, 0.05, 0.25) }, // texel0, texel1, worldTexel0, worldTexel1
  uShadowOn: { value: 1.0 },
  // heightfield
  uHeightTex: { value: null }, uHeightBounds: { value: new THREE.Vector4() },
  uReflect: { value: 0.0 }, // 1 while rendering planar reflection
  uAmbStrength: { value: 0.55 },
};

export const GLSL_LIGHTING = /* glsl */`
uniform float uTime;
uniform vec3 uSunDir, uSunColor, uShadowTint, uAmbTop, uAmbBottom;
uniform vec3 uSkyZenith, uSkyMid, uSkyHorizon, uSunGlow, uHorizonGlow, uAntiSun;
uniform float uHorizonGlowAmt, uAntiSunAmt, uSunDisk;
uniform vec3 uCloudLit, uCloudShade, uCloudRim; uniform float uCloudCover, uStars;
uniform float uFogDensity, uFogHeight, uFogMax; uniform vec3 uFogTint;
uniform vec3 uGrassLit, uGrassShade; uniform float uWarmth;
uniform vec3 uWind; uniform float uWindStrength;
uniform highp sampler2DShadow uShadowMap0, uShadowMap1;
uniform mat4 uShadowMat0, uShadowMat1; uniform vec4 uShadowTexel; uniform float uShadowOn;
uniform sampler2D uHeightTex; uniform vec4 uHeightBounds;
uniform float uReflect; uniform float uAmbStrength;
// low sun: horizontal surfaces fall into shade, only slopes facing the sun keep light
float grazeLit(float ndl, float band){ float g = 1.0 - smoothstep(0.06, 0.32, uSunDir.y); return band * mix(1.0, smoothstep(0.0, 0.32, ndl), g); }

float terrainH(vec2 xz){ vec2 uv = (xz - uHeightBounds.xy) / uHeightBounds.zw; return texture(uHeightTex, uv).r; }

// ---------- sky ----------
vec3 skyGradient(vec3 d){
  float e = d.y;
  float eu = max(e, 0.0);
  vec3 c = mix(uSkyHorizon, uSkyMid, smoothstep(0.0, 0.22, eu));
  c = mix(c, uSkyZenith, smoothstep(0.18, 0.85, eu));
  // below horizon: keep horizon colour, slightly deeper
  c = mix(c, uSkyHorizon * 0.85, smoothstep(0.0, -0.2, e));
  vec3 s = uSunDir;
  float sd = max(dot(d, s), 0.0);
  // horizontal proximity to the sun's azimuth
  vec2 dh = normalize(d.xz + 1e-5), sh = normalize(s.xz + 1e-5);
  float az = dot(dh, sh) * 0.5 + 0.5;
  float band = exp(-abs(e - 0.01) * 7.0);
  c = mix(c, uHorizonGlow, saturate(band * pow(az, 2.2) * uHorizonGlowAmt));
  // belt of venus on the opposite side
  float anti = exp(-abs(e - 0.12) * 9.0) * pow(1.0 - az, 2.0);
  c = mix(c, uAntiSun, saturate(anti * uAntiSunAmt));
  c += uSunGlow * (pow(sd, 6.0) * 0.35 + pow(sd, 48.0) * 0.9);
  return c;
}

vec3 skyFog(vec3 d){ return skyGradient(vec3(d.x, max(d.y, 0.0) * 0.5 + 0.01, d.z)) * uFogTint; }

vec3 applyAtmos(vec3 col, vec3 wp){
  vec3 v = wp - cameraPosition; float dist = length(v); vec3 d = v / max(dist, 1e-4);
  float h = max(wp.y, 0.0);
  float dens = uFogDensity * exp(-h * uFogHeight);
  float f = 1.0 - exp(-dist * dens);
  return mix(col, skyFog(d), saturate(f) * uFogMax);
}

// ---------- shadows ----------
float pcf(highp sampler2DShadow m, vec3 c, float tx){
  float s = 0.0;
  s += texture(m, vec3(c.xy + vec2(-1.0,-1.0)*tx, c.z));
  s += texture(m, vec3(c.xy + vec2( 1.0,-1.0)*tx, c.z));
  s += texture(m, vec3(c.xy + vec2(-1.0, 1.0)*tx, c.z));
  s += texture(m, vec3(c.xy + vec2( 1.0, 1.0)*tx, c.z));
  s += texture(m, vec3(c.xy, c.z)) * 2.0;
  return s / 6.0;
}
float sunShadow(vec3 wp, vec3 n){
  if (uShadowOn < 0.5) return 1.0;
  // painterly wobble on shadow edges (world anchored)
  vec3 j = vec3(gnoise(wp.xz * 1.7), 0.0, gnoise(wp.zx * 1.7 + 7.0)) * 0.05;
  vec4 c0 = uShadowMat0 * vec4(wp + n * uShadowTexel.z * 1.5 + j, 1.0);
  vec3 p0 = c0.xyz / c0.w * 0.5 + 0.5;
  if (all(greaterThan(p0.xy, vec2(0.02))) && all(lessThan(p0.xy, vec2(0.98))) && p0.z < 1.0) {
    float s0 = pcf(uShadowMap0, vec3(p0.xy, p0.z - 0.0004), uShadowTexel.x);
    // blend into cascade 1 near the edge
    vec2 e = min(p0.xy, 1.0 - p0.xy);
    float edge = smoothstep(0.02, 0.08, min(e.x, e.y));
    if (edge > 0.999) return s0;
    vec4 c1 = uShadowMat1 * vec4(wp + n * uShadowTexel.w * 1.5 + j, 1.0);
    vec3 p1 = c1.xyz / c1.w * 0.5 + 0.5;
    float s1 = pcf(uShadowMap1, vec3(p1.xy, p1.z - 0.0006), uShadowTexel.y);
    return mix(s1, s0, edge);
  }
  vec4 c1 = uShadowMat1 * vec4(wp + n * uShadowTexel.w * 1.5 + j, 1.0);
  vec3 p1 = c1.xyz / c1.w * 0.5 + 0.5;
  if (any(lessThan(p1.xy, vec2(0.0))) || any(greaterThan(p1.xy, vec2(1.0))) || p1.z > 1.0) return 1.0;
  float s1 = pcf(uShadowMap1, vec3(p1.xy, p1.z - 0.0006), uShadowTexel.y);
  vec2 e1 = min(p1.xy, 1.0 - p1.xy);
  return mix(1.0, s1, smoothstep(0.0, 0.05, min(e1.x, e1.y)));
}

// ---------- painterly toon lighting ----------
vec3 hemiAmb(vec3 n){ return mix(uAmbBottom, uAmbTop, n.y * 0.5 + 0.5); }
// albedo in linear, n world normal, lit = combined light factor 0..1 (band * shadow)
vec3 paintLight(vec3 albedo, vec3 n, float lit, float ao){
  vec3 shade = albedo * uShadowTint;
  vec3 light = albedo * uSunColor;
  vec3 c = mix(shade, light, lit);
  float term = lit * (1.0 - lit) * 4.0;
  c = satAdjust(c, 1.0 + term * 0.45);
  c += albedo * hemiAmb(n) * uAmbStrength;
  return c * ao;
}
float toonBand(float ndl, float soft){ return smoothstep(-soft, soft, ndl); }
`;

const OUT_DECL = /* glsl */`
layout(location = 0) out highp vec4 oColor;
layout(location = 1) out highp vec4 oAux;
// region ids for the stroke pass
#define RID_SKY 0.0
#define RID_GROUND 1.0
#define RID_FOLIAGE 2.0
#define RID_STONE 3.0
#define RID_WATER 4.0
#define RID_WOOD 5.0
#define RID_DETAIL 6.0
#define RID_GLOW 7.0
void writeOut(vec3 col, vec2 P, float rid, vec3 wp){
  oColor = vec4(col, 1.0);
  oAux = vec4(P, rid, length(wp - cameraPosition));
}
// additive light (beams, fireflies, sparkles): colour adds, aux untouched (needs CustomBlending ONE, ONE_MINUS_SRC_ALPHA)
void writeGlow(vec3 col){ oColor = vec4(col, 0.0); oAux = vec4(0.0); }
vec2 triP(vec3 wp, vec3 n){
  vec3 a = abs(n);
  if (a.y > a.x && a.y > a.z) return wp.xz;
  if (a.x > a.z) return vec2(wp.z, wp.y) + vec2(0.0, 0.0);
  return vec2(wp.x, wp.y);
}
`;

/**
 * Build a ShaderMaterial pair (main + shadow) sharing the vertex code.
 * vertex / fragment: GLSL bodies containing main(). SHADOW_PASS is defined for the shadow variant.
 */
export function makeMaterial({ uniforms = {}, vertex, fragment, defines = {}, side = THREE.FrontSide, transparent = false,
  blending = THREE.NormalBlending, depthWrite = true, depthTest = true, castShadow = true, alphaToCoverage = false, name = '', additive = false }) {
  const allUniforms = { ...U, ...uniforms };
  const pre = GLSL_COMMON + GLSL_LIGHTING;
  const mat = new THREE.ShaderMaterial({
    name, glslVersion: THREE.GLSL3, uniforms: allUniforms, defines: { ...defines },
    vertexShader: pre + vertex, fragmentShader: OUT_DECL + pre + fragment,
    side, transparent, blending, depthWrite, depthTest,
  });
  mat.alphaToCoverage = alphaToCoverage;
  if (additive) {
    mat.transparent = true; mat.depthWrite = false;
    mat.blending = THREE.CustomBlending; mat.blendEquation = THREE.AddEquation;
    mat.blendSrc = THREE.OneFactor; mat.blendDst = THREE.OneMinusSrcAlphaFactor;
    mat.blendSrcAlpha = THREE.OneFactor; mat.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
    castShadow = false;
  }
  let shadowMat = null;
  if (castShadow) {
    shadowMat = new THREE.ShaderMaterial({
      name: name + '_shadow', glslVersion: THREE.GLSL3, uniforms: allUniforms, defines: { ...defines, SHADOW_PASS: 1 },
      vertexShader: pre + vertex, fragmentShader: OUT_DECL + pre + fragment,
      side: side === THREE.FrontSide ? THREE.DoubleSide : side, colorWrite: false,
    });
  }
  return { mat, shadowMat };
}

// attach materials to a mesh (records the shadow material for the shadow pass)
export function applyMat(mesh, pair, { receive = true } = {}) {
  mesh.material = pair.mat;
  mesh.userData.shadowMat = pair.shadowMat;
  mesh.userData.mainMat = pair.mat;
  mesh.castShadowCustom = !!pair.shadowMat;
  return mesh;
}
