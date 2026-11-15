R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:90])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

# ---------- 1) birds: gull silhouettes, banked, size-capped ----------
rw('src/world/life.js', [
    ("  span = max(span, dist * 0.0055);\n  vec3 wp = c + (camRight() * position.x + camUp() * position.y * 0.5) * span;\n  vQ = position.xy; vFlap = flap;",
     "  span = min(max(span, dist * 0.0055), dist * 0.07);\n  float bank = (iB.y - 0.5) * 0.5 + sin(t * 0.8 + iA.w * 10.0) * 0.18;\n  vec3 wp = c + (camRight() * position.x + camUp() * position.y * 0.5) * span;\n  float cb = cos(bank), sb = sin(bank);\n  vQ = mat2(cb, sb, -sb, cb) * position.xy; vFlap = flap;"),
    ("    A = vec3(5.0, 30.0, -208.0); Bp = vec3(-34.0, 86.0, -410.0); spread = vec3(7.0, 3.0, 6.0) * (0.7 + T * 2.0);",
     "    A = vec3(4.0, 33.0, -219.0); Bp = vec3(-34.0, 86.0, -410.0); spread = vec3(8.0, 3.5, 7.0) * (0.8 + T * 2.0);"),
    ("""  // painted V silhouette: two bent wings meeting at a small body
  vec2 q = vQ;
  float lift = vFlap * 0.45;
  vec2 tipL = vec2(-1.0, 0.15 + lift), tipR = vec2(1.0, 0.15 + lift), elL = vec2(-0.45, 0.12 + lift * 0.4), elR = vec2(0.45, 0.12 + lift * 0.4);
  float d = min(min(segD(q, vec2(0.0, -0.05), elL), segD(q, elL, tipL)), min(segD(q, vec2(0.0, -0.05), elR), segD(q, elR, tipR)));
  float th = 0.11 * (1.0 - 0.6 * smoothstep(0.2, 1.0, abs(q.x)));
  float body = length((q - vec2(0.0, -0.08)) * vec2(2.2, 1.4));
  if (d > th && body > 0.22) discard;""", """  // painted gull silhouette: body + head + wings that bend at the wrist (wing shape changes with the flap)
  vec2 q = vec2(abs(vQ.x), vQ.y);
  float f = vFlap;
  vec2 root = vec2(0.06, 0.0), elbow = vec2(0.42, 0.10 + f * 0.22), wrist = vec2(0.72, 0.16 + f * 0.42), tip = vec2(1.0, 0.06 + f * 0.62);
  float w1 = segD(q, root, elbow) - 0.12, w2 = segD(q, elbow, wrist) - 0.085, w3 = segD(q, wrist, tip) - 0.04;
  float wing = min(w1, min(w2, w3));
  float body = length((vQ - vec2(0.0, -0.02)) * vec2(3.2, 1.6)) - 0.2;
  float head = length(vQ - vec2(0.0, 0.17)) - 0.075;
  if (min(wing, min(body, head)) > 0.0) discard;"""),
])

# ---------- 2) dusk: blue-violet sky, yellow-green fireflies, no ember-petals ----------
s = open(R + 'src/timeline.js', encoding='utf-8').read()
s = s.replace("zen: '#141838', mid: '#2a2660', hor: '#d8506a', sunGlow: '#ff5040', hGlow: '#e0485a', hGlowAmt: 0.55, anti: '#6a4a90', antiAmt: 0.35, disk: 0,\n    cLit: '#9a4a7a', cShade: '#221e50', cRim: '#d86a6a',",
              "zen: '#141838', mid: '#34347a', hor: '#d8506a', sunGlow: '#ff5040', hGlow: '#e0485a', hGlowAmt: 0.5, anti: '#4a4a90', antiAmt: 0.3, disk: 0,\n    cLit: '#6a5a9e', cShade: '#221e50', cRim: '#e8946a',")
s = s.replace("zen: '#0e1230', mid: '#20204e', hor: '#a83a5e', sunGlow: '#ff4a40', hGlow: '#c03a5a', hGlowAmt: 0.45, anti: '#5a4080', antiAmt: 0.3, disk: 0,\n    cLit: '#6a3a64', cShade: '#1a1840',",
              "zen: '#0e1230', mid: '#26286a', hor: '#a83a5e', sunGlow: '#ff4a40', hGlow: '#c03a5a', hGlowAmt: 0.42, anti: '#3a3a80', antiAmt: 0.28, disk: 0,\n    cLit: '#4a4a80', cShade: '#1a1840',")
# 3) end: slow push-in on the child
s = s.replace("  { t: 37.0, pos: [-8.6, 38.6, -257.0], look: [-4.2, 41.4, -298], fov: 45, roll: 0.0 },\n  { t: 40.0, pos: [-8.2, 38.35, -256.0], look: [-4.6, 41.0, -300], fov: 46, roll: 0.0 },",
              "  { t: 37.0, pos: [-9.6, 38.75, -254.0], look: [-2.5, 41.6, -296], fov: 45, roll: 0.0 },\n  { t: 40.0, pos: [-8.3, 38.55, -257.6], look: [-2.0, 41.3, -298], fov: 44, roll: 0.0 },")
# 4) forest: warmer
s = s.replace("{ t: 11, name: 'afternoon', amb: 0.5, fogMax: 0.85, az: 62, el: 30, sunI: 2.7, sun: '#ffe8c4', shadowTint: '#7a86cc',",
              "{ t: 11, name: 'afternoon', amb: 0.5, fogMax: 0.85, az: 62, el: 30, sunI: 2.8, sun: '#ffe2b0', shadowTint: '#8a88c0',")
s = s.replace("gLit: '#c4dc4c', gShade: '#2f5a4a', warmth: 0.25 },", "gLit: '#cadc4a', gShade: '#3a5c42', warmth: 0.3 },")
open(R + 'src/timeline.js', 'w', encoding='utf-8').write(s)
rw('src/world/life.js', [
    ("    size = 0.09 + 0.05 * iB.z;\n    vCol = mix(vec3(1.0, 0.85, 0.35), vec3(0.75, 1.0, 0.45), iB.y) * 2.2;",
     "    size = 0.13 + 0.06 * iB.z;\n    vCol = mix(vec3(0.82, 0.92, 0.32), vec3(0.95, 0.98, 0.5), iB.y) * 2.6;"),
    ("    I = uFireflies * step(iA.w, uFireflies) * (0.25 + pulse);", "    I = uFireflies * step(iA.w, uFireflies * 0.6) * (0.3 + pulse);"),
    ("      LU.uPetals.value = 0.2 + 0.08 * k(0, 6, t) - 0.18 * k(10, 16, t) + 0.5 * k(21, 27, t) - 0.35 * k(34, 39, t);",
     "      LU.uPetals.value = 0.2 + 0.08 * k(0, 6, t) - 0.18 * k(10, 16, t) + 0.5 * k(21, 27, t) - 0.58 * k(30.5, 34.5, t);"),
    ("      LU.uSwirl.value = k(20, 26, t) * (1 - 0.6 * k(35, 40, t));", "      LU.uSwirl.value = k(20, 26, t) * (1 - k(30.5, 34.5, t));"),
])

# ---------- 4b) forest: light pools where the hero shafts hit the ground; darker trunks ----------
rw('src/world/life.js', [
    ("  mk('beams', quadInstanced(beams.length, [['iA', 4, i => beams[i]]]), beamVert, beamFrag, { additive: true });",
     """  mk('beams', quadInstanced(beams.length, [['iA', 4, i => beams[i]]]), beamVert, beamFrag, { additive: true });
  const pools = beams.filter(b => b[3] >= 1.5);
  mk('pools', quadInstanced(pools.length, [['iA', 4, i => pools[i]]]), poolVert, poolFrag, { additive: true });"""),
    ("// ---------------- butterflies ----------------", """// ---------------- warm light pools on the forest floor under the hero shafts ----------------
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

// ---------------- butterflies ----------------"""),
])
rw('src/world/trees.js', [
    ("  vec3 shC = mix(alb * 0.5, uGrassShade * 0.95, 0.5);", "  vec3 shC = mix(alb * 0.36, uGrassShade * 0.7, 0.5);"),
    # 6) blossom tree mostly pink (no dark green specks reading as holes)
    ("    col = mix(col, bcol, uBlossom * step(0.32, tx.g));", "    col = mix(col, bcol, uBlossom * step(0.12, tx.g));\n    col = max(col, blSh * 0.45 * uBlossom * step(0.12, tx.g));"),
    # 5) distant trees fade like the islands they stand on
    ("  vec2 P = abs(n.y) > 0.6 ? vWP.xz : vec2(vWP.x * 0.7 + vWP.z * 0.7, vWP.y);\n  writeOut(col, P, RID_FOLIAGE, vWP);",
     "  float fdl = length(vWP - cameraPosition);\n  col = mix(col, skyFog(normalize(vWP - cameraPosition)), saturate((fdl - 300.0) / 2600.0) * 0.4 * step(60.0, vWP.y));\n  vec2 P = abs(n.y) > 0.6 ? vWP.xz : vec2(vWP.x * 0.7 + vWP.z * 0.7, vWP.y);\n  writeOut(col, P, RID_FOLIAGE, vWP);"),
])

# ---------- 5) islands: drop the pom-pom island, lighter tree kind, bounce light, less extra fog ----------
rw('src/world/islands.js', [
    ("[-170, 95, -530, 14, 18, 0], ", ""),
    ("  col = mix(col, skyFog(normalize(vWP - cameraPosition)), saturate((fd - 250.0) / 2600.0) * 0.62);",
     "  col = mix(col, skyFog(normalize(vWP - cameraPosition)), saturate((fd - 300.0) / 2600.0) * 0.4);"),
    ("  col += rock * skyGradient(normalize(n + vec3(0.0, 0.3, 0.0))) * 0.55 * (1.0 - uFar);",
     "  col += rock * skyGradient(normalize(n + vec3(0.0, 0.3, 0.0))) * 0.55 * (1.0 - uFar);\n  col += rock * uHorizonGlow * 0.45 * smoothstep(0.1, -0.8, n.y) * (1.0 - uFar); // warm bounce from the sea on the undersides"),
    ("  for (const k of Object.keys(treeLists)) group.add(instanceTrees(kinds[k], treeLists[k]));",
     "  for (const k of Object.keys(treeLists)) group.add(instanceTrees(kinds['isl_' + k] || kinds[k], treeLists[k]));"),
])
rw('src/world/world.js', [
    ("    hero: createTreeKind(ARCHETYPES.hero, 7, leafTex, { tint: [1.04, 1.0, 0.9], blossom: 0.8 }),",
     """    hero: createTreeKind(ARCHETYPES.hero, 7, leafTex, { tint: [1.04, 1.0, 0.9], blossom: 0.8 }),
    isl_oak: createTreeKind(ARCHETYPES.oak, 61, leafTex, { tint: [1.12, 1.0, 0.85], dark: 1.9 }),
    isl_young: createTreeKind(ARCHETYPES.young, 63, leafTex, { tint: [1.12, 1.0, 0.85], dark: 1.9 }),
    isl_poplar: createTreeKind(ARCHETYPES.poplar, 67, leafTex, { tint: [1.1, 1.0, 0.88], dark: 1.9 }),"""),
])

# ---------- 7) bugs: stone texture on the arch piers, sturdier legs ----------
rw('src/world/ruins.js', [
    ("  alb *= 1.0 - mortar * 0.35;", "  alb *= 1.0 - mortar * 0.5;\n  alb *= 0.8 + 0.4 * h21(cell + 3.0);"),
])
rw('src/world/life.js', [
    ("  add(new THREE.CapsuleGeometry(0.06, 0.42, 4, 10), skin, M(-0.08, 0.27, 0, 0, 0, 0.04));\n  add(new THREE.CapsuleGeometry(0.06, 0.42, 4, 10), skin, M(0.08, 0.27, 0.02, -0.12, 0, -0.04));",
     "  add(new THREE.CapsuleGeometry(0.08, 0.38, 4, 10), skin, M(-0.085, 0.27, 0, 0, 0, 0.04));\n  add(new THREE.CapsuleGeometry(0.08, 0.38, 4, 10), skin, M(0.085, 0.27, 0.02, -0.12, 0, -0.04));"),
])
print('ok')
