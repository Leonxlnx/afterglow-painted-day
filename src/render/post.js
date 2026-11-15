// Painterly post-processing chain.
import * as THREE from 'three';
import { GLSL_COMMON } from '../glsl/common.js';

const VS = /* glsl */`
out vec2 vUv;
void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function fsMat(frag, uniforms = {}, defines = {}) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms, defines,
    vertexShader: 'precision highp float;\nin vec3 position;\n' + VS,
    fragmentShader: 'precision highp float;\nprecision highp int;\nprecision highp sampler2D;\nin vec2 vUv;\nlayout(location=0) out highp vec4 outColor;\n' + GLSL_COMMON + frag,
    depthTest: false, depthWrite: false,
  });
}

// ---------------- structure tensor ----------------
const TENSOR = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTexel; // texel of OUTPUT res
vec3 L(vec2 uv){ vec3 c = texture(tSrc, uv).rgb; return c / (1.0 + luma(c)); }
void main(){
  vec2 d = uTexel;
  vec3 gx = (-1.0*L(vUv+vec2(-d.x,-d.y)) - 2.0*L(vUv+vec2(-d.x,0.)) - 1.0*L(vUv+vec2(-d.x,d.y))
             +1.0*L(vUv+vec2( d.x,-d.y)) + 2.0*L(vUv+vec2( d.x,0.)) + 1.0*L(vUv+vec2( d.x,d.y))) / 4.0;
  vec3 gy = (-1.0*L(vUv+vec2(-d.x,-d.y)) - 2.0*L(vUv+vec2(0.,-d.y)) - 1.0*L(vUv+vec2(d.x,-d.y))
             +1.0*L(vUv+vec2(-d.x, d.y)) + 2.0*L(vUv+vec2(0., d.y)) + 1.0*L(vUv+vec2(d.x, d.y))) / 4.0;
  outColor = vec4(dot(gx,gx), dot(gy,gy), dot(gx,gy), 1.0);
}`;

const GBLUR = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uDir; uniform float uSigma;
void main(){
  vec4 s = vec4(0.0); float w = 0.0;
  int R = int(ceil(uSigma * 2.5));
  for (int i = -12; i <= 12; i++){
    if (i < -R || i > R) continue;
    float fi = float(i); float k = exp(-fi*fi/(2.0*uSigma*uSigma));
    s += texture(tSrc, vUv + uDir * fi) * k; w += k;
  }
  outColor = s / w;
}`;

// ---------------- anisotropic Kuwahara (polynomial sector weights) ----------------
const KUWAHARA = /* glsl */`
uniform sampler2D tSrc; uniform sampler2D tTensor; uniform vec2 uTexel; uniform float uRadius; uniform float uQ; uniform float uAlpha;
void main(){
  vec3 t = texture(tTensor, vUv).xyz;
  float lam1 = 0.5 * (t.y + t.x + sqrt(max(0.0, (t.y - t.x)*(t.y - t.x) + 4.0*t.z*t.z)));
  float lam2 = 0.5 * (t.y + t.x - sqrt(max(0.0, (t.y - t.x)*(t.y - t.x) + 4.0*t.z*t.z)));
  vec2 v = vec2(lam1 - t.x, -t.z);
  vec2 dir = length(v) > 0.0 ? normalize(v) : vec2(0.0, 1.0);
  float phi = atan(dir.y, dir.x);
  float A = (lam1 + lam2 > 0.0) ? (lam1 - lam2) / (lam1 + lam2) : 0.0;
  float a = uRadius * clamp((uAlpha + A) / uAlpha, 0.1, 2.0);
  float b = uRadius * clamp(uAlpha / (uAlpha + A), 0.1, 2.0);
  float cphi = cos(phi), sphi = sin(phi);
  mat2 SR = mat2(0.5/a, 0.0, 0.0, 0.5/b) * mat2(cphi, -sphi, sphi, cphi);
  int maxX = int(sqrt(a*a*cphi*cphi + b*b*sphi*sphi));
  int maxY = int(sqrt(a*a*sphi*sphi + b*b*cphi*cphi));
  float zeta = 2.0 / uRadius;
  float zeroCross = 0.4; // 3pi/8 approx
  float sinZ = sin(zeroCross);
  float eta = (zeta + cos(zeroCross)) / (sinZ*sinZ);
  vec4 m[8]; vec3 s[8];
  for (int k = 0; k < 8; ++k){ m[k] = vec4(0.0); s[k] = vec3(0.0); }
  for (int j = -12; j <= 12; ++j){
    if (j < -maxY || j > maxY) continue;
    for (int i = -12; i <= 12; ++i){
      if (i < -maxX || i > maxX) continue;
      vec2 vv = SR * vec2(float(i), float(j));
      if (dot(vv, vv) <= 0.25){
        vec3 c = texture(tSrc, vUv + vec2(float(i), float(j)) * uTexel).rgb;
        c = c / (1.0 + c); // compress HDR so the sun doesn't dominate
        float sum = 0.0; float w[8]; float z, vxx, vyy;
        vxx = zeta - eta * vv.x*vv.x; vyy = zeta - eta * vv.y*vv.y;
        z = max(0.0, vv.y + vxx); w[0] = z*z; sum += w[0];
        z = max(0.0, -vv.x + vyy); w[2] = z*z; sum += w[2];
        z = max(0.0, -vv.y + vxx); w[4] = z*z; sum += w[4];
        z = max(0.0, vv.x + vyy); w[6] = z*z; sum += w[6];
        vv = sqrt(2.0)/2.0 * vec2(vv.x - vv.y, vv.x + vv.y);
        vxx = zeta - eta * vv.x*vv.x; vyy = zeta - eta * vv.y*vv.y;
        z = max(0.0, vv.y + vxx); w[1] = z*z; sum += w[1];
        z = max(0.0, -vv.x + vyy); w[3] = z*z; sum += w[3];
        z = max(0.0, -vv.y + vxx); w[5] = z*z; sum += w[5];
        z = max(0.0, vv.x + vyy); w[7] = z*z; sum += w[7];
        float g = exp(-3.125 * dot(vv, vv)) / sum;
        for (int k = 0; k < 8; ++k){ float wk = w[k] * g; m[k] += vec4(c * wk, wk); s[k] += c * c * wk; }
      }
    }
  }
  vec4 o = vec4(0.0);
  for (int k = 0; k < 8; ++k){
    if (m[k].w <= 0.0) continue;
    m[k].rgb /= m[k].w; s[k] = abs(s[k] / m[k].w - m[k].rgb * m[k].rgb);
    float sigma2 = s[k].r + s[k].g + s[k].b;
    float w = 1.0 / (1.0 + pow(1000.0 * sigma2, 0.5 * uQ));
    o += vec4(m[k].rgb * w, w);
  }
  vec3 r = o.rgb / max(o.w, 1e-6);
  r = r / max(1.0 - r, vec3(1e-3)); // expand back to HDR
  outColor = vec4(r, 1.0);
}`;

// ---------------- anchored brush strokes ----------------
const STROKES = /* glsl */`
uniform sampler2D tBase;   // half-res Kuwahara (mipmapped)
uniform sampler2D tScene;  // full-res scene colour
uniform sampler2D tAux;    // P.xy, region id, distance
uniform sampler2D tTensor; // half-res smoothed tensor
uniform vec2 uRes; uniform float uPxScale; uniform float uTime;
uniform vec4 uA;  // big strokes: length px, width ratio, angular spread, colour jitter
uniform vec4 uB;  // detail strokes
uniform float uDetailThresh; uniform float uFlowAlign; uniform float uBaseMix;
uniform float uRidSize[8]; uniform float uRidOn[8];
uniform vec2 uBaseDir[8]; uniform float uFieldFreq[8]; uniform float uFieldAmp[8]; uniform float uRidDetail[8]; uniform float uRidJitter[8]; uniform vec2 uSunP; float gDist;

vec4 auxAt(ivec2 p){ return texelFetch(tAux, clamp(p, ivec2(0), ivec2(uRes) - 1), 0); }

// edge-tangent direction (screen) + anisotropy from the tensor
vec3 flowAt(vec2 uv){
  vec3 t = textureLod(tTensor, uv, 0.0).xyz;
  float l1 = 0.5 * (t.y + t.x + sqrt(max(0.0, (t.y - t.x)*(t.y - t.x) + 4.0*t.z*t.z)));
  float l2 = 0.5 * (t.y + t.x - sqrt(max(0.0, (t.y - t.x)*(t.y - t.x) + 4.0*t.z*t.z)));
  vec2 v = vec2(l1 - t.x, -t.z);   // eigenvector of the minor eigenvalue = edge tangent
  vec2 tg = length(v) > 1e-9 ? normalize(v) : vec2(1.0, 0.0);
  float A = (l1 + l2 > 1e-9) ? (l1 - l2) / (l1 + l2) : 0.0;
  float strength = saturate(sqrt(l1) * 12.0);
  return vec3(tg, A * strength);
}

struct SR { float hit; vec3 col; float h; float order; };

SR strokesOctave(vec2 P, mat2 J, mat2 Ji, float g, float oct, float layer, float rid, vec4 prm, vec2 pix){
  SR res; res.hit = 0.0; res.col = vec3(0.0); res.h = 0.0; res.order = -1.0;
  vec2 u = P / g; vec2 c0 = floor(u);
  float bestO = -1.0; vec2 bestQ = vec2(0.0); vec4 bestR = vec4(0.0); vec2 bestC = vec2(0.0); vec2 bestAx = vec2(0.0);
  float seed = oct * 7.0 + layer * 101.0 + rid * 13.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 cell = c0 + vec2(float(i), float(j));
    vec4 r = h24(cell, seed);
    vec2 ctr = cell + 0.1 + 0.8 * r.xy;
    vec2 dP = (ctr - u) * g;              // P offset to the centre
    vec2 cpx = pix + Ji * dP;             // centre in screen px
    // stroke direction: base (P space) blended with screen flow mapped to P space
    vec2 bd = uBaseDir[int(rid)];
    if (rid < 0.5) { // sky: sweep toward the sun, curling slightly
      vec2 toSun = uSunP - ctr * g; float ls = length(toSun);
      if (ls > 1e-3) bd = normalize(mix(toSun / ls, vec2(-toSun.y, toSun.x) / ls, 0.35));
    }
    // far away: strokes lie horizontal on screen (no barcode at the horizon)
    float farMix = smoothstep(110.0, 520.0, gDist) * step(0.5, rid);
    vec2 hz = J * vec2(1.0, 0.0); float hl2 = dot(hz, hz);
    if (farMix > 0.0 && hl2 > 1e-14) bd = normalize(mix(bd, hz * inversesqrt(hl2), farMix));
    vec3 fl = flowAt(cpx / uRes);
    fl.z *= 1.0 - farMix;
    vec2 fP = J * fl.xy; float fl2 = dot(fP, fP);
    vec2 dir = bd;
    if (fl2 > 1e-12) { fP *= inversesqrt(fl2); if (dot(fP, dir) < 0.0) fP = -fP; dir = normalize(mix(dir, fP, saturate(fl.z * uFlowAlign))); }
    float field = (vnoise(ctr * g * uFieldFreq[int(rid)] + rid * 7.0) - 0.5) * uFieldAmp[int(rid)];
    float ang = atan(dir.y, dir.x) + field * (1.0 - saturate(fl.z * uFlowAlign)) + (r.z - 0.5) * prm.z;
    vec2 ax = vec2(cos(ang), sin(ang));
    vec2 d = u - ctr;
    float hl = 0.85 + 0.55 * r.w;
    float hw = hl * prm.y * (0.75 + 0.5 * fract(r.w * 7.31));
    vec2 q = vec2(dot(d, ax) / hl, dot(d, vec2(-ax.y, ax.x)) / hw);
    // capsule-ish body with ragged dry-brush ends
    float e = length(vec2(max(abs(q.x) - 0.55, 0.0) / 0.45, q.y));
    float rag = vnoise(vec2(q.y * 7.0 + r.x * 61.0, r.y * 13.0)) - 0.5;
    e += rag * 0.55 * smoothstep(0.35, 1.0, abs(q.x));
    e += (vnoise(vec2(q.x * 3.0 + r.y * 17.0, r.z * 9.0)) - 0.5) * 0.18;
    float order = r.z * 0.5 + fract(r.x * 13.7) * 0.5;
    if (e < 1.0 && order > bestO) { bestO = order; bestQ = q; bestR = r; bestC = cpx; bestAx = Ji * (ax * hl * g); }
  }
  if (bestO < 0.0) return res;
  // colour from the centre (if it lies on the same region), else from this pixel
  ivec2 ci = ivec2(bestC);
  bool inside = all(greaterThanEqual(bestC, vec2(0.0))) && all(lessThan(bestC, uRes));
  vec2 suv = bestC / uRes;
  float lod = log2(max(1.0, prm.x * uPxScale * prm.y * 0.35));
  float ridC = inside ? auxAt(ci).z : -1.0;
  vec2 cuv = (inside && abs(ridC - rid) < 0.5) ? suv : pix / uRes;
  bool isDetail = rid > 5.5 && rid < 6.5;
  vec3 c = isDetail ? texture(tScene, cuv).rgb : textureLod(tBase, cuv, lod).rgb;
  // loaded brush: blend toward the colour further along the stroke (wet-on-wet gradient)
  {
    float ang2 = bestR.z; // reuse: direction is encoded in bestQ frame; sample along +q.x
    vec2 tipPx = bestC + bestAx * 0.8;
    vec2 tuv = tipPx / uRes;
    if (all(greaterThan(tuv, vec2(0.0))) && all(lessThan(tuv, vec2(1.0))) && abs(auxAt(ivec2(tipPx)).z - rid) < 0.5) {
      vec3 c2 = isDetail ? texture(tScene, tuv).rgb : textureLod(tBase, tuv, lod).rgb;
      c = mix(c, c2, smoothstep(-1.0, 1.0, bestQ.x) * 0.55);
    }
  }
  // per-stroke colour jitter in Oklab (painter's hand)
  vec3 lab = toOklab(max(c, vec3(0.0)));
  float jw = prm.w * uRidJitter[int(rid)];
  lab.x *= 1.0 + (bestR.x - 0.5) * jw * 0.6;
  lab.yz += (vec2(bestR.y, fract(bestR.w * 3.7)) - 0.5) * jw * 0.09;
  lab.yz *= 1.0 + (fract(bestR.z * 5.3) - 0.3) * jw * 0.5;
  // paint load: denser at the start of the stroke
  lab.x *= 1.0 + 0.04 * prm.w * (-bestQ.x);
  c = max(fromOklab(lab), vec3(0.0));
  // impasto height profile
  float tq = bestQ.y, sq = bestQ.x;
  float grooves = vnoise(vec2(tq * 6.0 + bestR.x * 100.0, sq * 0.45 + bestR.y * 50.0)) - 0.5;
  grooves += 0.6 * (vnoise(vec2(tq * 15.0 + bestR.w * 40.0, sq * 0.9)) - 0.5);
  grooves *= 1.35;
  float body = sqrt(saturate(1.0 - tq * tq));
  float ridge = smoothstep(0.6, 0.92, abs(tq)) * (1.0 - smoothstep(0.92, 1.0, abs(tq)));
  float h = 0.62 * body + 0.22 * grooves + 0.18 * ridge;
  h *= mix(1.0, 0.6, smoothstep(0.1, 1.0, sq));      // thinner toward the tail
  h += 0.12 * smoothstep(-0.6, -1.0, sq);              // paint blob at the start
  c *= 1.0 + grooves * 0.07 * prm.w;
  res.hit = 1.0; res.col = c; res.h = h * (0.8 + 0.4 * bestR.w) + bestO * 0.25; res.order = bestO;
  return res;
}

SR strokeLayer(vec2 P, mat2 J, mat2 Ji, float pxPerUnit, float layer, float rid, vec4 prm, vec2 pix){
  float lenPx = prm.x * uPxScale * uRidSize[int(rid)];
  float cellUnits = lenPx * 0.62 / max(pxPerUnit, 1e-6);
  float lg = log2(max(cellUnits, 1e-6));
  float k = floor(lg), f = lg - k;
  SR a = strokesOctave(P, J, Ji, exp2(k), k, layer, rid, prm, pix);
  float w = smoothstep(0.3, 0.7, f);
  if (w <= 0.001) return a;
  SR b = strokesOctave(P, J, Ji, exp2(k + 1.0), k + 1.0, layer, rid, prm, pix);
  if (w >= 0.999) return b;
  // stochastic-ish blend: keep the stroke that is "on top" with probability by w
  SR o;
  o.hit = mix(a.hit, b.hit, w);
  o.col = (a.hit > 0.0 && b.hit > 0.0) ? mix(a.col, b.col, w) : (a.hit > 0.0 ? a.col : b.col);
  o.h = mix(a.h, b.h, w);
  o.order = max(a.order, b.order);
  return o;
}

void main(){
  vec2 pix = gl_FragCoord.xy;
  ivec2 ip = ivec2(pix);
  vec4 aux = auxAt(ip);
  vec2 P = aux.xy; float rid = floor(aux.z + 0.5); gDist = aux.w;
  vec3 base = textureLod(tBase, vUv, 0.0).rgb;
  vec3 scene = texelFetch(tScene, ip, 0).rgb;
  vec3 own = mix(scene, base, (rid > 5.5 && rid < 6.5) ? 0.0 : uBaseMix);
  if (uRidOn[int(rid)] < 0.5) { outColor = vec4(mix(scene, base, 0.25), 0.0); return; }
  // Jacobian dP/dpixel from neighbours (same region, smallest difference)
  vec4 ax1 = auxAt(ip + ivec2(1, 0)), ax0 = auxAt(ip - ivec2(1, 0));
  vec4 ay1 = auxAt(ip + ivec2(0, 1)), ay0 = auxAt(ip - ivec2(0, 1));
  vec2 dx1 = ax1.xy - P, dx0 = P - ax0.xy, dy1 = ay1.xy - P, dy0 = P - ay0.xy;
  bool sx1 = abs(ax1.z - aux.z) < 0.5, sx0 = abs(ax0.z - aux.z) < 0.5, sy1 = abs(ay1.z - aux.z) < 0.5, sy0 = abs(ay0.z - aux.z) < 0.5;
  vec2 dPdx = (sx1 && (!sx0 || dot(dx1,dx1) < dot(dx0,dx0))) ? dx1 : (sx0 ? dx0 : vec2(1e-3, 0.0));
  vec2 dPdy = (sy1 && (!sy0 || dot(dy1,dy1) < dot(dy0,dy0))) ? dy1 : (sy0 ? dy0 : vec2(0.0, 1e-3));
  mat2 J = mat2(dPdx, dPdy);
  float det = J[0][0]*J[1][1] - J[1][0]*J[0][1];
  float areaScale = sqrt(abs(det));
  float maxScale = max(length(dPdx), length(dPdy));
  float unitsPerPx = max(areaScale, maxScale * 0.25);
  if (abs(det) < 1e-14) det = 1e-14;
  mat2 Ji = mat2(J[1][1], -J[0][1], -J[1][0], J[0][0]) / det;
  // clamp Ji so a single stroke never reaches absurdly far across the screen
  float pxPerUnit = 1.0 / max(unitsPerPx, 1e-7);

  SR A = strokeLayer(P, J, Ji, pxPerUnit, 0.0, rid, uA, pix);
  SR B = strokeLayer(P, J, Ji, pxPerUnit, 1.0, rid, uB, pix);
  vec3 cA = A.hit > 0.0 ? A.col : own;
  float err = length(cA / (1.0 + cA) - own / (1.0 + own));
  float dth = uDetailThresh * uRidDetail[int(rid)];
  float wB = smoothstep(dth, dth * 2.2, err) * B.hit;
  vec3 col = mix(cA, B.col, wB);
  float h = mix(A.hit > 0.0 ? A.h : 0.0, B.h + 0.4, wB);
  // tiny canvas weave where no paint covers
  float cover = max(A.hit, wB);
  float weave = (sin(pix.x * 1.9 / uPxScale) * sin(pix.y * 1.9 / uPxScale)) * 0.08;
  h = mix(weave, h, cover);
  col = mix(own, col, cover);
  outColor = vec4(col, h);
}`;

// ---------------- bloom ----------------
const BLOOM_DOWN = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uPrefilter; uniform float uThreshold;
vec3 S(vec2 o){ return texture(tSrc, vUv + o * uTexel).rgb; }
void main(){
  vec3 a = S(vec2(-1,-1)), b = S(vec2(1,-1)), c = S(vec2(-1,1)), d = S(vec2(1,1)), e = S(vec2(0));
  vec3 col = e * 0.5 + (a + b + c + d) * 0.125;
  if (uPrefilter > 0.5) {
    float br = max(col.r, max(col.g, col.b));
    float soft = clamp(br - uThreshold + 0.5, 0.0, 1.0); soft = soft*soft*0.5;
    float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
    col *= contrib;
  }
  outColor = vec4(col, 1.0);
}`;
const BLOOM_UP = /* glsl */`
uniform sampler2D tSrc; uniform sampler2D tPrev; uniform vec2 uTexel; uniform float uMix;
void main(){
  vec3 s = vec3(0.0);
  s += texture(tSrc, vUv + vec2(-1,-1)*uTexel).rgb; s += texture(tSrc, vUv + vec2(0,-1)*uTexel).rgb*2.0; s += texture(tSrc, vUv + vec2(1,-1)*uTexel).rgb;
  s += texture(tSrc, vUv + vec2(-1,0)*uTexel).rgb*2.0; s += texture(tSrc, vUv).rgb*4.0; s += texture(tSrc, vUv + vec2(1,0)*uTexel).rgb*2.0;
  s += texture(tSrc, vUv + vec2(-1,1)*uTexel).rgb; s += texture(tSrc, vUv + vec2(0,1)*uTexel).rgb*2.0; s += texture(tSrc, vUv + vec2(1,1)*uTexel).rgb;
  outColor = vec4(s / 16.0 + texture(tPrev, vUv).rgb * uMix, 1.0);
}`;

// ---------------- god rays ----------------
const RAYMASK = /* glsl */`
uniform sampler2D tSrc; uniform sampler2D tAux; uniform vec2 uSun; uniform float uAspect; uniform float uThreshold;
void main(){
  vec4 ax = texture(tAux, vUv);
  vec3 c = texture(tSrc, vUv).rgb;
  float sky = ax.z < 0.5 ? 1.0 : 0.0;
  vec2 d = (vUv - uSun) * vec2(uAspect, 1.0);
  float prox = exp(-dot(d, d) * 2.5);
  float b = max(luma(c) - uThreshold, 0.0);
  outColor = vec4(c * b * sky * prox, 1.0);
}`;
const RAYBLUR = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uSun; uniform float uLen; uniform float uDecay;
void main(){
  vec2 d = (uSun - vUv) * uLen / 48.0;
  vec2 uv = vUv; vec3 s = vec3(0.0); float w = 1.0, tw = 0.0;
  float j = h21(gl_FragCoord.xy);
  uv += d * j;
  for (int i = 0; i < 48; i++){ s += texture(tSrc, uv).rgb * w; tw += w; w *= uDecay; uv += d; }
  outColor = vec4(s / tw * 3.0, 1.0);
}`;

// ---------------- composite ----------------
const COMPOSITE = /* glsl */`
uniform sampler2D tPaint; uniform sampler2D tBloom; uniform sampler2D tRays; uniform sampler2D tAux;
uniform vec2 uRes; uniform float uPxScale; uniform float uTime; uniform float uFrame;
uniform float uImpasto; uniform float uBloom; uniform vec3 uRayColor; uniform float uRays;
uniform float uExposure; uniform float uSaturation; uniform float uContrast; uniform vec3 uLift; uniform vec3 uGain;
uniform vec3 uShadowTone; uniform vec3 uHighTone; uniform float uVignette; uniform float uGrain;
uniform float uFade; // 0..1 fade to black (start/end)
uniform mat4 uInvViewProj; uniform vec3 uCamPos; uniform mat4 uVPa; uniform mat4 uVPb; uniform float uBlur;
vec4 P(ivec2 p){ return texelFetch(tPaint, clamp(p, ivec2(0), ivec2(uRes) - 1), 0); }
vec3 tonemap(vec3 c){
  float m = max(c.r, max(c.g, c.b));
  float k = 0.75;
  float mm = m < k ? m : k + (1.0 - k) * (1.0 - exp(-(m - k) / (1.0 - k)));
  vec3 r = c * (mm / max(m, 1e-5));
  r = mix(r, vec3(mm), saturate((m - 1.0) * 0.12));
  return r;
}
vec3 lin2srgb(vec3 c){ c = saturate(c); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  ivec2 ip = ivec2(gl_FragCoord.xy);
  vec4 pc = P(ip);
  vec3 col = pc.rgb;
  // ---- camera motion blur (shutter interval reprojected through the painted image) ----
  if (uBlur > 0.0) {
    vec4 ax = texelFetch(tAux, ip, 0);
    vec4 pw = uInvViewProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec3 dir = normalize(pw.xyz / pw.w - uCamPos);
    vec3 wp = uCamPos + dir * max(ax.w, 0.1);
    vec4 ca = uVPa * vec4(wp, 1.0), cb = uVPb * vec4(wp, 1.0);
    if (ca.w > 0.01 && cb.w > 0.01) {
      vec2 dv = ((cb.xy / cb.w) - (ca.xy / ca.w)) * 0.5 * uRes * uBlur;
      float L = length(dv);
      if (L > 1.0) {
        dv *= min(1.0, 160.0 * uPxScale / L);
        int N = int(min(32.0, ceil(length(dv) / (1.5 * max(uPxScale, 0.5)))) );
        vec3 acc = vec3(0.0); float wsum = 0.0;
        float jit = h21(gl_FragCoord.xy + uFrame) - 0.5;
        for (int i = 0; i < 32; i++) {
          if (i >= N) break;
          float f = (float(i) + 0.5 + jit) / float(N) - 0.5;
          vec2 sp = gl_FragCoord.xy + dv * f;
          float w = 1.0 - abs(f) * 0.6;
          acc += P(ivec2(sp)).rgb * w; wsum += w;
        }
        col = acc / wsum;
      }
    }
  }
  // ---- impasto relief ----
  int o = int(max(1.0, floor(uPxScale * 1.5 + 0.5)));
  float hx = (P(ip + ivec2(o,0)).a - P(ip - ivec2(o,0)).a) * 0.5 + (P(ip + ivec2(o,o)).a - P(ip - ivec2(o,-o)).a) * 0.25 + (P(ip + ivec2(o,-o)).a - P(ip - ivec2(o,o)).a) * 0.25;
  float hy = (P(ip + ivec2(0,o)).a - P(ip - ivec2(0,o)).a) * 0.5 + (P(ip + ivec2(o,o)).a - P(ip - ivec2(-o,o)).a) * 0.25 + (P(ip + ivec2(-o,o)).a - P(ip - ivec2(o,o)).a) * 0.25;
  vec2 gr = clamp(vec2(hx, hy) * 1.6 / (uPxScale * 2.0), vec2(-0.7), vec2(0.7));
  vec3 n = normalize(vec3(-gr, 1.0));
  vec3 L = normalize(vec3(-0.5, 0.6, 0.8));
  float shade = clamp(dot(n, L) / L.z, 0.72, 1.22);
  float spec = pow(saturate(dot(reflect(-L, n), vec3(0,0,1))), 30.0) * step(0.02, length(gr));
  col *= mix(1.0, shade, uImpasto);
  col += spec * uImpasto * 0.05 * (0.4 + luma(col));
  // ---- light ----
  col += texture(tBloom, vUv).rgb * uBloom;
  col += texture(tRays, vUv).rgb * uRayColor * uRays;
  col *= uExposure;
  // ---- grade ----
  float l = luma(col);
  col = mix(col, col * uShadowTone, (1.0 - smoothstep(0.0, 0.35, l)) * 0.6);
  col = mix(col, col * uHighTone, smoothstep(0.35, 1.2, l) * 0.6);
  col = satAdjust(col, uSaturation);
  col = tonemap(col);
  col = pow(max(col, 0.0), vec3(1.0)) ;
  // contrast around mid grey (perceptual)
  vec3 sc = lin2srgb(col);
  sc = (sc - 0.5) * uContrast + 0.5;
  sc = sc * uGain + uLift * (1.0 - sc);
  // vignette
  vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
  sc *= 1.0 - uVignette * smoothstep(0.35, 1.05, length(q));
  // grain + dither
  float g = h21(gl_FragCoord.xy + vec2(uFrame * 17.0, uFrame * 31.0)) + h21(gl_FragCoord.xy * 1.37 + uFrame) - 1.0;
  sc += g * (1.0/255.0) + g * uGrain;
  sc *= 1.0 - uFade;
  outColor = vec4(saturate(sc), 1.0);
}`;

export class Painter {
  constructor(renderer) {
    this.r = renderer;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad = new THREE.Mesh(g, null); this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad);
    this.m = {
      tensor: fsMat(TENSOR, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } }),
      blur: fsMat(GBLUR, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() }, uSigma: { value: 2 } }),
      kuw: fsMat(KUWAHARA, { tSrc: { value: null }, tTensor: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 4 }, uQ: { value: 8 }, uAlpha: { value: 1 } }),
      strokes: fsMat(STROKES, {
        tBase: { value: null }, tScene: { value: null }, tAux: { value: null }, tTensor: { value: null },
        uRes: { value: new THREE.Vector2() }, uPxScale: { value: 1 }, uTime: { value: 0 },
        uA: { value: new THREE.Vector4(46, 0.36, 0.5, 0.5) }, uB: { value: new THREE.Vector4(15, 0.4, 0.6, 0.35) },
        uDetailThresh: { value: 0.035 }, uFlowAlign: { value: 1.0 }, uBaseMix: { value: 0.75 },
        uRidSize: { value: [2.1, 1.0, 0.85, 0.9, 1.3, 0.7, 0.3, 1] },
        uRidDetail: { value: [2.2, 1.5, 1.0, 1.0, 1.4, 1.0, 0.8, 1.0] },
        uRidJitter: { value: [1, 1, 1, 1, 1, 1, 1, 1] },
        uRidOn: { value: [1, 1, 1, 1, 1, 1, 1, 0] },
        uSunP: { value: new THREE.Vector2() },
        uFieldFreq: { value: [0.004, 0.06, 0.15, 0.2, 0.05, 0.3, 0.3, 0.3] },
        uFieldAmp: { value: [2.2, 1.6, 2.5, 1.2, 0.6, 0.8, 1, 1] },
        uBaseDir: { value: Array.from({ length: 8 }, () => new THREE.Vector2(1, 0)) },
      }),
      down: fsMat(BLOOM_DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uPrefilter: { value: 0 }, uThreshold: { value: 1.0 } }),
      up: fsMat(BLOOM_UP, { tSrc: { value: null }, tPrev: { value: null }, uTexel: { value: new THREE.Vector2() }, uMix: { value: 1 } }),
      raymask: fsMat(RAYMASK, { tSrc: { value: null }, tAux: { value: null }, uSun: { value: new THREE.Vector2() }, uAspect: { value: 1.7 }, uThreshold: { value: 0.6 } }),
      rayblur: fsMat(RAYBLUR, { tSrc: { value: null }, uSun: { value: new THREE.Vector2() }, uLen: { value: 0.6 }, uDecay: { value: 0.965 } }),
      comp: fsMat(COMPOSITE, {
        tPaint: { value: null }, tBloom: { value: null }, tRays: { value: null }, tAux: { value: null },
        uRes: { value: new THREE.Vector2() }, uPxScale: { value: 1 }, uTime: { value: 0 }, uFrame: { value: 0 },
        uImpasto: { value: 0.5 }, uBloom: { value: 0.12 }, uRayColor: { value: new THREE.Color(1, 0.85, 0.6) }, uRays: { value: 0.5 },
        uExposure: { value: 1 }, uSaturation: { value: 1.08 }, uContrast: { value: 1.04 }, uLift: { value: new THREE.Vector3(0.0, 0.0, 0.02) }, uGain: { value: new THREE.Vector3(1, 1, 1) },
        uShadowTone: { value: new THREE.Vector3(0.92, 0.95, 1.1) }, uHighTone: { value: new THREE.Vector3(1.05, 1.0, 0.94) },
        uVignette: { value: 0.22 }, uGrain: { value: 0.006 }, uFade: { value: 0 },
        uInvViewProj: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() }, uVPa: { value: new THREE.Matrix4() }, uVPb: { value: new THREE.Matrix4() }, uBlur: { value: 0 },
      }),
    };
    this.rts = null; this.size = new THREE.Vector2();
  }

  setSize(w, h) {
    if (this.size.x === w && this.size.y === h) return;
    this.size.set(w, h);
    if (this.rts) Object.values(this.rts).flat().forEach(t => t.dispose && t.dispose());
    const hf = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    const hw = Math.ceil(w / 2), hh = Math.ceil(h / 2);
    const base = new THREE.WebGLRenderTarget(hw, hh, { ...hf, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    this.rts = {
      tensor: new THREE.WebGLRenderTarget(hw, hh, hf),
      tensorB: new THREE.WebGLRenderTarget(hw, hh, hf),
      base,
      paint: new THREE.WebGLRenderTarget(w, h, { ...hf, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }),
      bloom: [], bloomUp: [],
      rayMask: new THREE.WebGLRenderTarget(Math.ceil(w / 4), Math.ceil(h / 4), hf),
      rayBlur: new THREE.WebGLRenderTarget(Math.ceil(w / 4), Math.ceil(h / 4), hf),
    };
    let bw = hw, bh = hh;
    for (let i = 0; i < 6; i++) {
      this.rts.bloom.push(new THREE.WebGLRenderTarget(bw, bh, hf));
      this.rts.bloomUp.push(new THREE.WebGLRenderTarget(bw, bh, hf));
      bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1);
    }
  }

  pass(mat, target, tiles = 1) {
    this.quad.material = mat;
    if (tiles <= 1) { this.r.setRenderTarget(target); this.r.render(this.scene, this.cam); return; }
    const w = target ? target.width : this.r.domElement.width, h = target ? target.height : this.r.domElement.height;
    const gl = this.r.getContext();
    for (let i = 0; i < tiles; i++) {
      const y0 = Math.floor(h * i / tiles), y1 = Math.floor(h * (i + 1) / tiles);
      if (target) { target.scissor.set(0, y0, w, y1 - y0); target.scissorTest = true; this.r.setRenderTarget(target); }
      else { this.r.setRenderTarget(null); this.r.setScissorTest(true); this.r.setScissor(0, y0, w, y1 - y0); }
      this.r.render(this.scene, this.cam);
      gl.flush();
    }
    if (target) { target.scissorTest = false; this.r.setRenderTarget(target); }
    this.r.setScissorTest(false);
  }

  render(sceneRT, P, { sunUv = new THREE.Vector2(0.5, 0.9), sunVisible = 0, frame = 0, time = 0, tiles = 1, blur = null } = {}) {
    const w = this.size.x, h = this.size.y, R = this.rts, m = this.m;
    const pxScale = h / 2160;
    const color = sceneRT.textures[0], aux = sceneRT.textures[1];
    // tensor at half res
    m.tensor.uniforms.tSrc.value = color; m.tensor.uniforms.uTexel.value.set(1 / R.tensor.width, 1 / R.tensor.height);
    this.pass(m.tensor, R.tensor);
    const sig = Math.max(1.0, 2.2 * pxScale * 2);
    m.blur.uniforms.uSigma.value = Math.min(sig, 4.5);
    m.blur.uniforms.tSrc.value = R.tensor.texture; m.blur.uniforms.uDir.value.set(1 / R.tensor.width, 0); this.pass(m.blur, R.tensorB);
    m.blur.uniforms.tSrc.value = R.tensorB.texture; m.blur.uniforms.uDir.value.set(0, 1 / R.tensor.height); this.pass(m.blur, R.tensor);
    // Kuwahara at half res
    m.kuw.uniforms.tSrc.value = color; m.kuw.uniforms.tTensor.value = R.tensor.texture;
    m.kuw.uniforms.uTexel.value.set(1 / R.base.width, 1 / R.base.height);
    m.kuw.uniforms.uRadius.value = Math.max(2, P.kuwRadius * pxScale * 2);
    this.pass(m.kuw, R.base, tiles);
    // strokes at full res
    const su = m.strokes.uniforms;
    su.tBase.value = R.base.texture; su.tScene.value = color; su.tAux.value = aux; su.tTensor.value = R.tensor.texture;
    su.uRes.value.set(w, h); su.uPxScale.value = pxScale; su.uTime.value = time;
    su.uA.value.copy(P.strokeA); su.uB.value.copy(P.strokeB);
    su.uDetailThresh.value = P.detailThresh; su.uFlowAlign.value = P.flowAlign; su.uBaseMix.value = P.baseMix;
    if (P.ridSize) su.uRidSize.value = P.ridSize;
    if (P.baseDir) su.uBaseDir.value = P.baseDir;
    if (P.ridOn) su.uRidOn.value = P.ridOn;
    if (P.fieldAmp) su.uFieldAmp.value = P.fieldAmp;
    if (P.sunP) su.uSunP.value.copy(P.sunP);
    if (P.ridDetail) su.uRidDetail.value = P.ridDetail;
    if (P.ridJitter) su.uRidJitter.value = P.ridJitter;
    this.pass(m.strokes, R.paint, tiles);
    // bloom from paint
    let src = R.paint.texture;
    for (let i = 0; i < R.bloom.length; i++) {
      m.down.uniforms.tSrc.value = src; m.down.uniforms.uTexel.value.set(1 / (i === 0 ? w : R.bloom[i - 1].width), 1 / (i === 0 ? h : R.bloom[i - 1].height));
      m.down.uniforms.uPrefilter.value = i === 0 ? 1 : 0; m.down.uniforms.uThreshold.value = P.bloomThreshold;
      this.pass(m.down, R.bloom[i]); src = R.bloom[i].texture;
    }
    let prev = R.bloom[R.bloom.length - 1].texture;
    for (let i = R.bloom.length - 2; i >= 0; i--) {
      m.up.uniforms.tSrc.value = prev; m.up.uniforms.tPrev.value = R.bloom[i].texture;
      m.up.uniforms.uTexel.value.set(1 / R.bloom[i + 1].width, 1 / R.bloom[i + 1].height); m.up.uniforms.uMix.value = 1;
      this.pass(m.up, R.bloomUp[i]); prev = R.bloomUp[i].texture;
    }
    // god rays
    m.raymask.uniforms.tSrc.value = color; m.raymask.uniforms.tAux.value = aux; m.raymask.uniforms.uSun.value.copy(sunUv);
    m.raymask.uniforms.uAspect.value = w / h; m.raymask.uniforms.uThreshold.value = P.rayThreshold;
    this.pass(m.raymask, R.rayMask);
    m.rayblur.uniforms.tSrc.value = R.rayMask.texture; m.rayblur.uniforms.uSun.value.copy(sunUv); m.rayblur.uniforms.uLen.value = P.rayLength;
    this.pass(m.rayblur, R.rayBlur);
    // composite to screen
    const c = m.comp.uniforms;
    c.tPaint.value = R.paint.texture; c.tBloom.value = prev; c.tRays.value = R.rayBlur.texture; c.tAux.value = aux;
    c.uRes.value.set(w, h); c.uPxScale.value = pxScale; c.uTime.value = time; c.uFrame.value = frame;
    c.uImpasto.value = P.impasto; c.uBloom.value = P.bloom; c.uRays.value = P.rays * sunVisible; c.uRayColor.value.copy(P.rayColor);
    c.uExposure.value = P.exposure; c.uSaturation.value = P.saturation; c.uContrast.value = P.contrast;
    c.uLift.value.copy(P.lift); c.uGain.value.copy(P.gain); c.uShadowTone.value.copy(P.shadowTone); c.uHighTone.value.copy(P.highTone);
    c.uVignette.value = P.vignette; c.uGrain.value = P.grain; c.uFade.value = P.fade || 0;
    if (blur) { c.uInvViewProj.value.copy(blur.invVP); c.uCamPos.value.copy(blur.camPos); c.uVPa.value.copy(blur.vpA); c.uVPb.value.copy(blur.vpB); c.uBlur.value = blur.amount; }
    else c.uBlur.value = 0;
    this.pass(m.comp, null, tiles);
  }
}
