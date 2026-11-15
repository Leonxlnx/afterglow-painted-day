R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:90])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

# ---------- 1) organic boughs: kinked, tapered, forked, dark warm brown, blossoms to the tips ----------
s = open(R + 'src/world/world.js', encoding='utf-8').read()
a = s.index("  // opening hook: a blossom bough reaching in from the top-right")
b = s.index("  const ruins = createRuins(leafTex); scene.add(ruins.group);")
new = '''  // opening hook: an organic blossom bough reaching in from the top-right; the camera glides out from under it
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
        cl.push({ c: p.clone().add(new THREE.Vector3((rand(i, seed + 5) - 0.5) * 0.5, -0.12 - rand(i, seed + 6) * 0.3, (rand(i, seed + 7) - 0.5) * 0.5)), r: 0.34 + rand(i, seed + 8) * 0.26 + (i > 22 ? 0.15 : 0), n: 4 });
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
      const end = new THREE.Vector3(3.6 + rand(k, 511) * 5.2, 3.15 + rand(k, 512) * 0.9, 45.5 + rand(k, 513) * 10);
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
'''
s = s[:a] + new + s[b:]
s = s.replace("import { U } from '../render/materials.js';", "import { U, makeMaterial, applyMat } from '../render/materials.js';")
open(R + 'src/world/world.js', 'w', encoding='utf-8').write(s)

# ---------- 2) fireflies as a post-paint overlay (crisp cores, occluded by the scene) ----------
rw('src/world/life.js', [
    ("    I = uFireflies * step(iA.w, uFireflies * 0.11) * (0.35 + pulse) * 1.6;", "    I = 0.0; // fireflies are drawn in the post-paint overlay now"),
    ("  return {\n    group, kidMesh,", """  // overlay: fireflies drawn after the painterly pass (crisp glowing cores), occluded by the painted scene's depth
  const overlay = new THREE.Scene();
  const NFO = 40;
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
  vec3 wp = c + (cr * position.x + cu * position.y) * d * 0.0105;
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
  float g = exp(-r2 * 46.0) * 1.1 + exp(-r2 * 4.5) * 0.32;
  outColor = vec4(vec3(0.86, 1.0, 0.48) * g * vI * uFadeMul, 1.0);
}`,
  });
  const ff = new THREE.Mesh(ffGeo, ffMat); ff.frustumCulled = false; overlay.add(ff);
  return {
    group, kidMesh, overlay, ffMat,"""),
])
rw('src/world/world.js', [
    ("  const world = {\n    mask, terrain, sky, water, leafTex,", "  const world = {\n    mask, terrain, sky, water, leafTex, overlay: life.overlay, ffMat: life.ffMat,"),
])
rw('src/main.js', [
    ("  painter.render(mainRT, style, { sunUv, sunVisible, frame, time: t, tiles: QUALITY === 'demo' ? 1 : 4, blur });",
     """  painter.render(mainRT, style, { sunUv, sunVisible, frame, time: t, tiles: QUALITY === 'demo' ? 1 : 4, blur });
  if (world && world.overlay) {
    world.ffMat.uniforms.tAux.value = mainRT.textures[1];
    world.ffMat.uniforms.uFadeMul.value = (1 - (style.fade || 0)) * style.exposure;
    renderer.setRenderTarget(null);
    const ac = renderer.autoClear; renderer.autoClear = false;
    renderer.render(world.overlay, camera);
    renderer.autoClear = ac;
  }"""),
])
# ---------- 3) dusk clouds read as clouds, not translucent ghosts ----------
rw('src/world/sky.js', [
    ("  col = mix(col, sky, saturate(f * 0.6 + fres * fres * 0.6));",
     "  float dusk = 1.0 - smoothstep(-0.06, 0.0, uSunDir.y);\n  col = mix(col, sky, saturate(f * 0.6 * (1.0 - 0.5 * dusk) + fres * fres * mix(0.6, 0.15, dusk)));"),
])
print('ok')
