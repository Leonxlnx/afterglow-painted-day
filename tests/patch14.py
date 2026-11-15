R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:90])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

# ---------- A) islands: no waterfalls, sky fill, fog, rim; hero island bigger ----------
rw('src/world/islands.js', [
    ("    if (fall) {", "    if (fall && false) {"),
    ("[380, 130, -911, 52, 56, 1]", "[380, 130, -911, 70, 70, 0]"),
    ("""  vec3 Vv = normalize(cameraPosition - vWP);
  col += mix(uCloudRim, uSunColor * 0.5, 0.5) * pow(1.0 - saturate(dot(n, Vv)), 3.0) * pow(saturate(dot(-Vv, uSunDir)), 1.5) * 0.9;""",
     """  vec3 Vv = normalize(cameraPosition - vWP);
  // islands float in bright air: skylight fill from below/around + warm rim on the sun-facing edge
  col += rock * skyGradient(normalize(n + vec3(0.0, 0.3, 0.0))) * 0.55 * (1.0 - uFar);
  col += mix(uCloudRim, uSunColor * 0.6, 0.5) * pow(1.0 - saturate(dot(n, Vv)), 2.5) * (0.35 + 1.2 * pow(saturate(dot(-Vv, uSunDir)), 1.5));"""),
    ("""  col = applyAtmos(col, vWP);
  writeOut(col, triP(vWP, n), grassM > 0.5 ? RID_GROUND : RID_STONE, vWP);""",
     """  col = applyAtmos(col, vWP);
  float fd = length(vWP - cameraPosition);
  col = mix(col, skyFog(normalize(vWP - cameraPosition)), saturate((fd - 250.0) / 2600.0) * 0.62);
  writeOut(col, triP(vWP, n), grassM > 0.5 ? RID_GROUND : RID_STONE, vWP);"""),
    ("uniforms: { uBob: { value: 0.0 }, uRockA: { value: new THREE.Color('#8a7c84') }, uRockB: { value: new THREE.Color('#c2a894') }, uFar: { value: 0 } } });",
     "uniforms: { uBob: { value: 0.0 }, uRockA: { value: new THREE.Color('#9a6e7e') }, uRockB: { value: new THREE.Color('#d4a48c') }, uFar: { value: 0 } } });"),
])

# ---------- B) forest: less milky veil, crisper shafts ----------
rw('src/world/grass.js', [("  gs = mix(gs, gl * 0.62, 0.3 * forest);", "  gs = mix(gs, gl * 0.62, 0.1 * forest);")])
rw('src/world/terrain.js', [("  gs = mix(gs, gl * 0.62, 0.3 * forest);", "  gs = mix(gs, gl * 0.62, 0.1 * forest);")])
rw('src/world/life.js', [
    ("  float w = mix(0.7 + 1.6 * fract(iA.w * 3.1), 1.4 + 1.6 * fract(iA.w * 3.1), hero);", "  float w = mix(0.6 + 1.2 * fract(iA.w * 3.1), 0.6 + 0.8 * fract(iA.w * 3.1), hero);"),
    ("  vI = lit * uBeams * flick * smoothstep(0.02, 0.15, uSunDir.y) * smoothstep(5.0, 12.0, length(mid - cameraPosition)) * (1.0 + hero * 0.6);",
     "  vI = lit * uBeams * flick * smoothstep(0.02, 0.15, uSunDir.y) * smoothstep(5.0, 12.0, length(mid - cameraPosition)) * mix(0.55, 2.1, hero);"),
    ("  writeGlow(uSunColor * vec3(1.0, 0.95, 0.75) * across * along * vI * 0.11);", "  writeGlow(uSunColor * vec3(1.0, 0.92, 0.66) * across * along * vI * 0.11);"),
])

# ---------- C) kid: bigger, rim light, longer scarf; framing ----------
rw('src/world/life.js', [
    ("  kidMesh.rotation.y = -0.19;", "  kidMesh.rotation.y = -0.19;\n  kidMesh.scale.setScalar(1.25);"),
    ("  col += vCol * uSunColor * pow(1.0 - saturate(dot(n, V)), 3.0) * pow(saturate(dot(-V, uSunDir)), 2.0) * 0.8; // rim",
     "  col += (vCol * 0.5 + vec3(1.0, 0.62, 0.38)) * uSunColor * pow(1.0 - saturate(dot(n, V)), 2.0) * (0.25 + pow(saturate(dot(-V, uSunDir)), 2.0)) * 0.9; // warm rim"),
    ("  const sg = new THREE.PlaneGeometry(0.11, 0.9, 1, 12);", "  const sg = new THREE.PlaneGeometry(0.16, 1.25, 1, 14);"),
    ("  for (let i = 0; i < fl.length; i++) fl[i] = (0.45 - sg.attributes.position.getY(i)) / 0.9;\n  sg.translate(0, -0.45, 0);",
     "  for (let i = 0; i < fl.length; i++) fl[i] = (0.625 - sg.attributes.position.getY(i)) / 1.25;\n  sg.translate(0, -0.625, 0);"),
])
s = open(R + 'src/timeline.js', encoding='utf-8').read()
s = s.replace("  { t: 31.0, pos: [-10.5, 38.8, -261.0], look: [-1.5, 42.0, -293], fov: 50, roll: -0.01 },",
              "  { t: 31.0, pos: [-10.5, 38.8, -261.0], look: [-4.0, 41.6, -293], fov: 50, roll: -0.01 },")
s = s.replace("  { t: 34.0, pos: [-10.0, 39.0, -258.0], look: [-3.0, 43.0, -296], fov: 46, roll: 0.0 },",
              "  { t: 34.0, pos: [-10.0, 38.9, -258.0], look: [-4.5, 42.4, -296], fov: 46, roll: 0.0 },")
# F) faster, more energetic opening: start further back
s = s.replace("  { t: 0.0, pos: [5.0, 1.15, 46], look: [-1, 3.2, -30], fov: 52, roll: 0.055 },",
              "  { t: 0.0, pos: [5.5, 1.15, 60], look: [-1, 3.2, -24], fov: 52, roll: 0.055 },")
# D) dusk ground not a dead slab
s = s.replace("gLit: '#3a3a5a', gShade: '#10142e', warmth: 0.9 },", "gLit: '#4e3a5a', gShade: '#24183a', warmth: 0.9 },")
s = s.replace("gLit: '#2a2a48', gShade: '#0c1028', warmth: 0.9 },", "gLit: '#3e2e4e', gShade: '#1e1432', warmth: 0.9 },")
# style: per-time sky stroke size / sky jitter / ground detail
import re
def addkeys(s, t, sky, jit, gd):
    k = "  { t: %s, A:" % t
    i = s.index(k)
    j = s.index("vignette:", i)
    j2 = s.index("}", j)
    return s[:j2] + ", skySize: %s, skyJit: %s, groundDetail: %s " % (sky, jit, gd) + s[j2:]
for t, sky, jit, gd in [('0', 3.0, 0.45, 1.5), ('12', 2.8, 0.55, 1.5), ('14.5', 2.6, 0.65, 1.6), ('22', 2.2, 1.0, 2.6), ('30', 2.1, 1.0, 3.2), ('33', 2.1, 0.9, 3.2), ('40', 2.1, 0.7, 3.0)]:
    s = addkeys(s, t, sky, jit, gd)
s = s.replace("""    rayColor: new THREE.Color(1, 0.86, 0.62),
  };""", """    rayColor: new THREE.Color(1, 0.86, 0.62),
    ridSize: [L(a.skySize, b.skySize), 1.0, 0.85, 0.9, 1.3, 0.7, 0.3, 1],
    ridDetail: [2.2, L(a.groundDetail, b.groundDetail), 1.0, 1.0, 1.4, 1.0, 0.8, 1.0],
    ridJitter: [L(a.skyJit, b.skyJit), 1, 1, 1, 1, 1, 1, 1],
  };""")
open(R + 'src/timeline.js', 'w', encoding='utf-8').write(s)
rw('src/render/post.js', [
    ("uniform float uRidDetail[8]; uniform vec2 uSunP;", "uniform float uRidDetail[8]; uniform float uRidJitter[8]; uniform vec2 uSunP;"),
    ("        uRidDetail: { value: [2.2, 1.5, 1.0, 1.0, 1.4, 1.0, 0.8, 1.0] },", "        uRidDetail: { value: [2.2, 1.5, 1.0, 1.0, 1.4, 1.0, 0.8, 1.0] },\n        uRidJitter: { value: [1, 1, 1, 1, 1, 1, 1, 1] },"),
    ("    if (P.sunP) su.uSunP.value.copy(P.sunP);", "    if (P.sunP) su.uSunP.value.copy(P.sunP);\n    if (P.ridDetail) su.uRidDetail.value = P.ridDetail;\n    if (P.ridJitter) su.uRidJitter.value = P.ridJitter;"),
    ("  lab.x *= 1.0 + (bestR.x - 0.5) * prm.w * 0.6;", "  float jw = prm.w * uRidJitter[int(rid)];\n  lab.x *= 1.0 + (bestR.x - 0.5) * jw * 0.6;"),
    ("  lab.yz += (vec2(bestR.y, fract(bestR.w * 3.7)) - 0.5) * prm.w * 0.09;\n  lab.yz *= 1.0 + (fract(bestR.z * 5.3) - 0.3) * prm.w * 0.5;",
     "  lab.yz += (vec2(bestR.y, fract(bestR.w * 3.7)) - 0.5) * jw * 0.09;\n  lab.yz *= 1.0 + (fract(bestR.z * 5.3) - 0.3) * jw * 0.5;"),
])
# D) flowers: fewer, bigger dabs
rw('src/world/grass.js', [
    ("    const nf = Math.round(dens * (2 + 26 * near) * CH * CH * 0.35);", "    const nf = Math.round(dens * (2 + 26 * near) * CH * CH * 0.23);"),
    ("      const sz = 0.035 + 0.035 * rand(i, seed + 15);", "      const sz = 0.05 + 0.05 * rand(i, seed + 15);"),
])

# ---------- E) blossom tree: pink not violet, lobed crown, petals stream toward the child ----------
rw('src/world/trees.js', [
    ("    vec3 blSh = mix(vec3(0.26, 0.07, 0.26), vec3(0.4, 0.14, 0.36), tx.g);      // ~#8a4a8a",
     "    vec3 blSh = mix(vec3(0.48, 0.10, 0.24), vec3(0.62, 0.2, 0.36), tx.g);      // ~#b85a86"),
    ("    vec3 blLit = mix(vec3(0.95, 0.33, 0.55), vec3(1.0, 0.62, 0.74), tx.g);   // ~#f39ac0",
     "    vec3 blLit = mix(vec3(0.9, 0.38, 0.56), vec3(1.0, 0.66, 0.78), tx.g);    // ~#f4a6c4"),
    ("    blSh = mix(blSh, blSh * uAmbTop * 2.2, 0.35);", "    blSh = mix(blSh, blSh * uAmbTop * 2.2, 0.2);"),
    ("  hero: { trunkLen: 6.0, trunkRad: 0.85, depth: 3, kids0: 6, kids: 3, start: 0.5, spread: 0.95, lenScale: 0.72, radScale: 0.56, wobble: 0.3, upTend: 0.12, clusterR: 3.0, cards: 13, cardScale: 1.05, fill: 0.7, dabs: true },",
     "  hero: { trunkLen: 6.0, trunkRad: 0.85, depth: 3, kids0: 5, kids: 3, start: 0.5, spread: 1.15, lenScale: 0.78, radScale: 0.56, wobble: 0.34, upTend: 0.1, clusterR: 2.8, cards: 13, cardScale: 1.05, fill: 0.25, dabs: true },"),
])
rw('src/world/life.js', [
    ("    vec3 drift = uWind * age * (2.2 + iB.y * 1.5) + vec3(0.0, age * age * 0.12 * (0.5 + iB.z), 0.0);",
     "    vec3 drift = normalize(vec3(-0.84, 0.0, -0.54)) * age * (2.0 + iB.y * 1.4) + vec3(0.0, age * age * 0.1 * (0.5 + iB.z), 0.0);"),
])

# ---------- G) birds as camera-facing V sprites (never edge-on wires) ----------
rw('src/world/life.js', [
    ("""  vec3 vel = normalize(Bp - A);
  vec3 sideV = normalize(cross(vec3(0.0, 1.0, 0.0), vel));
  float flap = sin(t * (7.0 + 2.0 * iB.y) + iA.w * 30.0);
  float span = (iB.w > 0.5 ? 1.05 : 0.75) + 0.2 * iB.z;
  vec3 p = position;
  vec3 lp = vel * p.z * span + sideV * p.x * span + vec3(0.0, 1.0, 0.0) * (p.y + abs(p.x) * flap * 0.55) * span;
  vec3 wp = c + lp;""", """  float flap = sin(t * (7.0 + 2.0 * iB.y) + iA.w * 30.0);
  float span = (iB.w > 0.5 ? 1.3 : 0.9) + 0.25 * iB.z;
  float dist = length(c - cameraPosition);
  span = max(span, dist * 0.0055);
  vec3 wp = c + (camRight() * position.x + camUp() * position.y * 0.5) * span;
  vQ = position.xy; vFlap = flap;"""),
    ("attribute vec4 iA; attribute vec4 iB;\nvarying vec3 vWP; varying float vFlock; varying float vUp;\nvoid main(){",
     "attribute vec4 iA; attribute vec4 iB;\nvarying vec3 vWP; varying float vFlock; varying float vUp; varying vec2 vQ; varying float vFlap;\nvoid main(){"),
    ("  vWP = wp; vFlock = iB.w; vUp = p.y + abs(p.x) * flap * 0.55;", "  vWP = wp; vFlock = iB.w; vUp = flap;"),
    ("""varying vec3 vWP; varying float vFlock; varying float vUp;
void main(){
  vec3 col = mix(uShadowTint * 0.22, uSkyZenith * 0.25, 0.4);""", """varying vec3 vWP; varying float vFlock; varying float vUp; varying vec2 vQ; varying float vFlap;
float segD(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
void main(){
  // painted V silhouette: two curved wings meeting at a small body
  vec2 q = vQ;
  float lift = vFlap * 0.45;
  vec2 tipL = vec2(-1.0, 0.15 + lift), tipR = vec2(1.0, 0.15 + lift), elL = vec2(-0.45, 0.12 + lift * 0.4), elR = vec2(0.45, 0.12 + lift * 0.4);
  float d = min(min(segD(q, vec2(0.0, -0.05), elL), segD(q, elL, tipL)), min(segD(q, vec2(0.0, -0.05), elR), segD(q, elR, tipR)));
  float th = 0.11 * (1.0 - 0.6 * smoothstep(0.2, 1.0, abs(q.x)));
  float body = length((q - vec2(0.0, -0.08)) * vec2(2.2, 1.4));
  if (d > th && body > 0.22) discard;
  vec3 col = mix(uShadowTint * 0.22, uSkyZenith * 0.25, 0.4);"""),
])
s = open(R + 'src/world/life.js', encoding='utf-8').read()
a = s.index("  // birds\n  const bgeo = new THREE.InstancedBufferGeometry();")
b = s.index("  mk('birds', bgeo, birdVert, birdFrag, { side: THREE.DoubleSide, castShadow: false });")
s = s[:a] + """  // birds (flock 0: far sunset crossing, 1: burst on the drop, 2: opening flyover)
  const NB0 = 26, NB1 = 22, NB2 = 9, NBd = NB0 + NB1 + NB2;
  const bgeo = quadInstanced(NBd, [
    ['iA', 4, i => {
      if (i < NB0) { const row = Math.floor(Math.sqrt(i)), off = i - row * row; return [(off - row) * 0.9 + (rand(i, 71) - 0.5), (rand(i, 72) - 0.5), row * 0.9 + (rand(i, 73) - 0.5), rand(i, 74)]; }
      return [(rand(i, 81) - 0.5) * 2, (rand(i, 82) - 0.5) * 2, (rand(i, 83) - 0.5) * 2, rand(i, 84)];
    }],
    ['iB', 4, i => [rand(i, 85), rand(i, 86), rand(i, 87), i < NB0 ? 0 : i < NB0 + NB1 ? 1 : 2]],
  ]);
""" + s[b:]
s = s.replace("""  } else {
    // burst: birds lift out of the last trees as the music drops and sail toward the sunset""", """  } else if (iB.w > 1.5) {
    // opening: a small flock sweeps across the sky above the viaduct
    T = (t + 0.4 - iB.x * 0.5) / 7.0;
    A = vec3(70.0, 30.0, -40.0); Bp = vec3(-90.0, 44.0, -120.0); spread = vec3(5.0, 2.0, 4.0);
  } else {
    // burst: birds lift out of the last trees as the music drops and sail toward the sunset""")
s = s.replace("      LU.uBirds.value = t > 17.5 && t < 38 ? 1 : 0;", "      LU.uBirds.value = (t < 7.5 || (t > 17.5 && t < 38)) ? 1 : 0;")
open(R + 'src/world/life.js', 'w', encoding='utf-8').write(s)

# ---------- H) remove the box-like drums near the start ----------
rw('src/world/ruins.js', [
    ("  const drums = [[9.5, 18, 0.9, 2.6, 0.4], [-11, -16, 1.0, 1.4, 1.48], [10.5, -48, 0.85, 3.2, 0.1], [-9.5, 30, 0.8, 1.0, 1.52], [8, -66, 0.95, 4.2, 0.05]];",
     "  const drums = [[-11, -16, 1.0, 1.4, 1.48], [10.5, -48, 0.85, 3.2, 0.1], [8, -66, 0.95, 4.2, 0.05]];"),
])
print('ok')
