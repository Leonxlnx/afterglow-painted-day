R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:90])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

# 1) birds: fewer on the drop, varied scale, warm dark grey, unpainted (no stroke grain), keep clear of the kite
rw('src/world/life.js', [
    ("  const NB0 = 26, NB1 = 22, NB2 = 9, NBd = NB0 + NB1 + NB2;", "  const NB0 = 18, NB1 = 9, NB2 = 7, NBd = NB0 + NB1 + NB2;"),
    ("    A = vec3(4.0, 33.0, -219.0); Bp = vec3(-34.0, 86.0, -410.0); spread = vec3(8.0, 3.5, 7.0) * (0.8 + T * 2.0);",
     "    A = vec3(-2.0, 34.0, -222.0); Bp = vec3(-46.0, 84.0, -400.0); spread = vec3(9.0, 4.0, 8.0) * (0.9 + T * 2.0);"),
    ("  float span = (iB.w > 0.5 ? 1.3 : 0.9) + 0.25 * iB.z;", "  float span = (iB.w > 0.5 ? 1.2 : 0.9) * (0.6 + 0.7 * iB.z);"),
    ("  float bank = (iB.y - 0.5) * 0.5 + sin(t * 0.8 + iA.w * 10.0) * 0.18;", "  float bank = (iB.y - 0.5) * 0.85 + sin(t * 0.8 + iA.w * 10.0) * 0.2;"),
    ("    col = mix(uShadowTint * 0.22, uSunColor * 0.12, 0.25 * smoothstep(-0.1, 0.3, vUp));\n  }\n  col = applyAtmos(col, vWP) * 0.9;\n  writeOut(col, vWP.xz, RID_DETAIL, vWP);",
     "    col = mix(vec3(0.066, 0.042, 0.078), uSunColor * 0.1, 0.2 * smoothstep(-0.1, 0.3, vUp)); // warm dark grey ~#4a3a4f\n  }\n  col = applyAtmos(col, vWP) * 0.95;\n  writeOut(col, vWP.xz, RID_GLOW, vWP);"),
])
# 2) dusk: tiny yellow-green fireflies low in the grass around the child; no petals; darker flowers; bluer zenith
rw('src/world/life.js', [
    ("      if (i < NF) { const a = rand(i, 11) * 6.283, r = 3 + Math.sqrt(rand(i, 12)) * 60; const x = hill.x + Math.cos(a) * r, z = hill.z + 18 + Math.sin(a) * r * 0.9; return [x, heightAt(x, z) + 0.4 + rand(i, 13) * 2.5, z, i / NF]; }",
     "      if (i < NF) { const a = rand(i, 11) * 6.283, r = 2 + Math.sqrt(rand(i, 12)) * 22; const x = hill.x + Math.cos(a) * r, z = hill.z + 6 + Math.sin(a) * r * 0.8; return [x, heightAt(x, z) + 0.25 + rand(i, 13) * 0.9, z, i / NF]; }"),
    ("    vec3 w = vec3(sin(t * 0.5 + iA.w * 40.0), sin(t * 0.7 + iA.w * 23.0) * 0.6 + t * 0.06 * (0.5 + iB.x), cos(t * 0.43 + iA.w * 31.0)) * vec3(1.4, 1.0, 1.4);",
     "    vec3 w = vec3(sin(t * 0.5 + iA.w * 40.0), sin(t * 0.7 + iA.w * 23.0) * 0.35, cos(t * 0.43 + iA.w * 31.0)) * vec3(1.2, 1.0, 1.2);"),
    ("    size = 0.13 + 0.06 * iB.z;", "    size = 0.045 + 0.03 * iB.z;"),
    ("    I = uFireflies * step(iA.w, uFireflies * 0.6) * (0.3 + pulse);", "    I = uFireflies * step(iA.w, uFireflies * 0.11) * (0.35 + pulse) * 1.6;"),
    ("  float g = exp(-r * r * 18.0) * 1.6 + 0.12 * exp(-r * r * 3.0);", "  float g = exp(-r * r * 30.0) * 1.8 + 0.22 * exp(-r * r * 4.0);"),
    ("      LU.uPetals.value = 0.2 + 0.08 * k(0, 6, t) - 0.18 * k(10, 16, t) + 0.5 * k(21, 27, t) - 0.58 * k(30.5, 34.5, t);",
     "      LU.uPetals.value = Math.max(0, 0.2 + 0.08 * k(0, 6, t) - 0.18 * k(10, 16, t) + 0.5 * k(21, 27, t) - 0.7 * k(30.5, 34.5, t));"),
])
rw('src/world/grass.js', [
    ("  vec3 col = paintLight(base, vec3(0.0, 1.0, 0.0), lit, 1.0);\n  col += base * uSunColor * 0.12",
     "  vec3 col = paintLight(base, vec3(0.0, 1.0, 0.0), lit, 1.0) * mix(0.45, 1.0, smoothstep(-0.05, 0.1, uSunDir.y));\n  col += base * uSunColor * 0.12"),
])
s = open(R + 'src/timeline.js', encoding='utf-8').read()
s = s.replace("zen: '#141838', mid: '#34347a',", "zen: '#1c2460', mid: '#2a3566',")
s = s.replace("zen: '#0e1230', mid: '#26286a',", "zen: '#141c4c', mid: '#22305a',")
open(R + 'src/timeline.js', 'w', encoding='utf-8').write(s)

# 3) blossom canopy fully pink, no dark dashes; 4) pale sakura option for the opening branches
rw('src/world/trees.js', [
    ("uniform sampler2D tLeaf; uniform vec3 uLeafTint; uniform float uLeafDark; uniform float uBlossom;",
     "uniform sampler2D tLeaf; uniform vec3 uLeafTint; uniform float uLeafDark; uniform float uBlossom; uniform float uPale;"),
    ("    vec3 blSh = mix(vec3(0.48, 0.10, 0.24), vec3(0.62, 0.2, 0.36), tx.g);      // ~#b85a86",
     "    vec3 blSh = mix(vec3(0.48, 0.10, 0.24), vec3(0.62, 0.2, 0.36), tx.g);      // ~#b85a86\n    blLit = mix(blLit, vec3(1.0, 0.78, 0.84), uPale); blSh = mix(blSh, vec3(0.7, 0.42, 0.52), uPale);"),
    ("    col = mix(col, bcol, uBlossom * step(0.12, tx.g));\n    col = max(col, blSh * 0.45 * uBlossom * step(0.12, tx.g));",
     "    col = mix(col, bcol, uBlossom);\n  }\n  col *= mix(0.68, 1.0, vAO);\n  if (uBlossom > 0.0) {\n    col = max(col, mix(vec3(0.48, 0.10, 0.24), vec3(0.7, 0.42, 0.52), uPale) * 0.55);"),
    ("  }\n  col *= mix(0.68, 1.0, vAO);\n  // backlight glow through leaves", "  } else col *= mix(0.68, 1.0, vAO);\n  // backlight glow through leaves"),
    ("uLeafTint: { value: new THREE.Color(...tint) }, uLeafDark: { value: dark }, uBlossom: { value: blossom } },\n  });\n  return { ...t, tPair, lPair };",
     "uLeafTint: { value: new THREE.Color(...tint) }, uLeafDark: { value: dark }, uBlossom: { value: blossom }, uPale: { value: 0 } },\n  });\n  return { ...t, tPair, lPair };"),
    ("export function createFoliage(clusters, leafTex, { seed = 1, cards = 8, cardScale = 1.0, dabs = false, crown = null, crownR = 3, tint = [1, 1, 1], dark = 1, blossom = 0 } = {}) {",
     "export function createFoliage(clusters, leafTex, { seed = 1, cards = 8, cardScale = 1.0, dabs = false, crown = null, crownR = 3, tint = [1, 1, 1], dark = 1, blossom = 0, pale = 0 } = {}) {"),
    ("uLeafTint: { value: new THREE.Color(...tint) }, uLeafDark: { value: dark }, uBlossom: { value: blossom } },\n  });\n  return applyMat(new THREE.Mesh(fg), lPair);",
     "uLeafTint: { value: new THREE.Color(...tint) }, uLeafDark: { value: dark }, uBlossom: { value: blossom }, uPale: { value: pale } },\n  });\n  return applyMat(new THREE.Mesh(fg), lPair);"),
])
rw('src/world/world.js', [
    ("    hero: createTreeKind(ARCHETYPES.hero, 7, leafTex, { tint: [1.04, 1.0, 0.9], blossom: 0.8 }),", "    hero: createTreeKind(ARCHETYPES.hero, 7, leafTex, { tint: [1.04, 1.0, 0.9], blossom: 1.0 }),"),
    ("""    for (let k = 0; k < 46; k++) {
      const z = 52 + rand(k, 501) * 10, x = 1.5 + rand(k, 502) * 9.5;
      const y = 2.6 + rand(k, 503) * 1.8 + Math.abs(x - 5.5) * 0.18;
      cl.push({ c: new THREE.Vector3(x, y, z), r: 0.55 + rand(k, 504) * 0.5, n: 5 });
    }
    const br = createFoliage(cl, leafTex, { seed: 777, cards: 5, cardScale: 1.0, dabs: true, crownR: 4, blossom: 0.85, crown: new THREE.Vector3(6, 6, 57) });""",
     """    for (let k = 0; k < 30; k++) {
      const z = 50 + rand(k, 501) * 9, x = 5.5 + rand(k, 502) * 6.5;
      const y = 3.3 + rand(k, 503) * 1.6 + (x - 5.5) * 0.12;
      cl.push({ c: new THREE.Vector3(x, y, z), r: 0.45 + rand(k, 504) * 0.4, n: 4 });
    }
    const br = createFoliage(cl, leafTex, { seed: 777, cards: 4, cardScale: 1.0, dabs: true, crownR: 4, blossom: 1.0, pale: 0.6, crown: new THREE.Vector3(8, 7, 55) });"""),
])
print('ok')
