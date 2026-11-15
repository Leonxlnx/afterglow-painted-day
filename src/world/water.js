// River + sea at y = 0 with planar reflection (oblique clip), painterly glints and shoreline foam.
import * as THREE from 'three';
import { makeMaterial, applyMat, U } from '../render/materials.js';

const vert = /* glsl */`
varying vec3 vWP;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;

const frag = /* glsl */`
varying vec3 vWP;
uniform sampler2D tRefl; uniform mat4 uTexMat;
uniform vec3 uDeep; uniform vec3 uShallow;
float rip(vec2 p){
  float t = uTime;
  return gnoise(p * 0.32 + vec2(t * 0.11, t * 0.05)) * 0.5
       + gnoise(p * 0.9 + vec2(-t * 0.21, t * 0.17)) * 0.25
       + gnoise(p * 2.6 + vec2(t * 0.35, -t * 0.3)) * 0.12;
}
void main(){
#ifdef SHADOW_PASS
  oColor = vec4(1.0); return;
#else
  vec3 wp = vWP;
  vec3 V = normalize(cameraPosition - wp);
  float dist = length(cameraPosition - wp);
  vec2 p = wp.xz;
  float e = 0.06;
  float h0 = rip(p), hx = rip(p + vec2(e, 0.0)), hz = rip(p + vec2(0.0, e));
  float amp = 0.22 / (1.0 + dist * 0.01);
  vec3 n = normalize(vec3(-(hx - h0) / e * amp, 1.0, -(hz - h0) / e * amp));
  // depth below water from the baked terrain
  vec2 huv = (p - uHeightBounds.xy) / uHeightBounds.zw;
  float th = (all(greaterThan(huv, vec2(0.0))) && all(lessThan(huv, vec2(1.0)))) ? terrainH(p) : -30.0;
  float depth = max(0.0 - th, 0.0);
  // reflection
  vec4 rc = uTexMat * vec4(wp, 1.0);
  vec2 ruv = rc.xy / rc.w + n.xz * (0.045 / (1.0 + dist * 0.004));
  vec3 refl = texture(tRefl, clamp(ruv, vec2(0.001), vec2(0.999))).rgb;
  float ndv = max(dot(n, V), 0.0);
  float F = mix(0.42, 1.0, pow(1.0 - ndv, 4.0));
  vec3 body = mix(uShallow, uDeep, smoothstep(0.0, 2.2, depth));
  // body takes some light & shadow
  float sh = sunShadow(wp, vec3(0.0, 1.0, 0.0));
  body *= mix(0.65, 1.0, sh);
  vec3 col = mix(body, refl, F * mix(0.75, 1.0, smoothstep(0.3, 2.0, depth)));
  // sun glints (painted as tiny bright dabs)
  vec3 r = reflect(-uSunDir, n);
  float sp = pow(max(dot(r, V), 0.0), 220.0);
  float glit = step(0.86, vnoise(p * 3.5 + uTime * vec2(0.6, -0.4))) * pow(max(dot(r, V), 0.0), 18.0);
  col += uSunColor * (sp * 1.4 + glit * 0.9) * sh * smoothstep(-0.02, 0.06, uSunDir.y);
  // white squiggle highlights (gouache style), mostly near the viewer
  float sq = 1.0 - smoothstep(0.0, 0.035, abs(gnoise(p * vec2(0.55, 1.4) + vec2(uTime * 0.12, 0.0)) + 0.15 * gnoise(p * 3.0)));
  sq *= smoothstep(0.35, 0.75, vnoise(p * 0.21 + 3.0)) * (1.0 - smoothstep(20.0, 70.0, dist));
  col = mix(col, mix(uSkyHorizon, vec3(1.0), 0.6) * 1.1, sq * 0.55);
  // shoreline foam
  float foamN = vnoise(p * 2.0 + uTime * 0.3);
  float foam = 1.0 - smoothstep(0.0, 0.16 + foamN * 0.12, depth);
  col = mix(col, vec3(0.95, 0.96, 0.98) * (0.55 + 0.45 * sh) * (U_FOAM_TINT), foam * 0.75 * smoothstep(-25.0, -1.0, th));
  col = applyAtmos(col, wp);
  writeOut(col, p, RID_WATER, wp);
#endif
}`.replace('(U_FOAM_TINT)', '(mix(vec3(1.0), uSkyHorizon * 1.3, 0.35))');

export function createWater() {
  const reflRT = new THREE.WebGLRenderTarget(960, 540, { count: 2, type: THREE.HalfFloatType, depthBuffer: true });
  reflRT.textures[0].minFilter = reflRT.textures[0].magFilter = THREE.LinearFilter;
  const texMat = new THREE.Matrix4();
  const uniforms = {
    tRefl: { value: reflRT.textures[0] }, uTexMat: { value: texMat },
    uDeep: { value: new THREE.Color('#1f5a8a') }, uShallow: { value: new THREE.Color('#3a8a8a') },
  };
  const pair = makeMaterial({ name: 'water', vertex: vert, fragment: frag, uniforms, castShadow: false });
  const geo = new THREE.PlaneGeometry(24000, 24000, 1, 1); geo.rotateX(-Math.PI / 2);
  const mesh = applyMat(new THREE.Mesh(geo), pair);
  mesh.position.set(0, 0, -6000);
  mesh.frustumCulled = false;
  const vcam = new THREE.PerspectiveCamera();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const clip = new THREE.Vector4(), q = new THREE.Vector4();

  return {
    mesh, uniforms,
    setSize(w, h) { reflRT.setSize(w, h); },
    update(tod) {
      // water body colours follow the sky
      uniforms.uDeep.value.copy(tod.zen).lerp(tod.mid, 0.3).multiplyScalar(0.55).lerp(tod.gShade, 0.25);
      uniforms.uShallow.value.copy(tod.gShade).lerp(tod.mid, 0.35).multiplyScalar(0.9);
    },
    renderReflection(renderer, scene, cam) {
      // mirror camera across y = 0
      vcam.copy(cam);
      vcam.position.set(cam.position.x, -cam.position.y, cam.position.z);
      const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
      const target = cam.position.clone().add(fwd); target.y = -target.y;
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion); up.y = -up.y;
      vcam.up.copy(up); vcam.lookAt(target);
      vcam.updateMatrixWorld();
      vcam.projectionMatrix.copy(cam.projectionMatrix);
      // texture matrix
      texMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
      texMat.multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse);
      // oblique near plane = water plane (Lengyel)
      const pl = plane.clone().applyMatrix4(vcam.matrixWorldInverse);
      clip.set(pl.normal.x, pl.normal.y, pl.normal.z, pl.constant - 0.05);
      const pm = vcam.projectionMatrix, e = pm.elements;
      q.x = (Math.sign(clip.x) + e[8]) / e[0];
      q.y = (Math.sign(clip.y) + e[9]) / e[5];
      q.z = -1.0; q.w = (1.0 + e[10]) / e[14];
      clip.multiplyScalar(2.0 / clip.dot(q));
      e[2] = clip.x; e[6] = clip.y; e[10] = clip.z + 1.0; e[14] = clip.w;
      vcam.projectionMatrixInverse.copy(vcam.projectionMatrix).invert();
      mesh.visible = false;
      U.uReflect.value = 1;
      renderer.setRenderTarget(reflRT);
      renderer.setClearColor(0x000000, 1);
      renderer.clear(true, true, true);
      const hidden = [];
      scene.traverse(o => { if (o.userData.noReflect && o.visible) { o.visible = false; hidden.push(o); } });
      renderer.render(scene, vcam);
      hidden.forEach(o => o.visible = true);
      U.uReflect.value = 0;
      mesh.visible = true;
    },
  };
}
