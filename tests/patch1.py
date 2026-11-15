import re
R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:70])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

rw('src/render/materials.js', [
    ("  uReflect: { value: 0.0 }, // 1 while rendering planar reflection", "  uReflect: { value: 0.0 }, // 1 while rendering planar reflection\n  uAmbStrength: { value: 0.55 },"),
    ("uniform float uReflect;\n", "uniform float uReflect; uniform float uAmbStrength;\n// low sun: horizontal surfaces fall into shade, only slopes facing the sun keep light\nfloat grazeLit(float ndl, float band){ float g = 1.0 - smoothstep(0.06, 0.32, uSunDir.y); return band * mix(1.0, smoothstep(0.0, 0.32, ndl), g); }\n"),
    ("  c += albedo * hemiAmb(n) * 0.55;", "  c += albedo * hemiAmb(n) * uAmbStrength;"),
])
rw('src/world/terrain.js', [
    ("""  float band = toonBand(ndl, 0.12);
  float sh = sunShadow(wp, n);
  float lit = band * sh;""", """  float band = grazeLit(ndl, toonBand(ndl, 0.12));
  float sh = sunShadow(wp, n);
  float lit = band * sh;"""),
    ("""  float rockLit = toonBand(ndl, 0.2) * sh;""", """  float rockLit = grazeLit(ndl, toonBand(ndl, 0.2)) * sh;
  rockA *= 1.0 - 0.35 * smoothstep(0.5, 0.0, uSunDir.y + 0.3);"""),
])
rw('src/world/grass.js', [
    ("""  float band = toonBand(ndl, 0.15);
  float sh = sunShadow(vWP, n);""", """  float band = grazeLit(ndl, toonBand(ndl, 0.15));
  float sh = sunShadow(vWP, n);"""),
    ("  col += uGrassLit * uSunColor * back * vH * vH * 0.22 * sh;", "  col += uGrassLit * uSunColor * back * vH * vH * 0.42 * sh;"),
])
rw('src/world/trees.js', [
    ("  col += uGrassLit * uSunColor * back * (0.15 + edge * 0.5) * 0.35 * sh;", "  col += uGrassLit * uSunColor * back * (0.2 + edge * 0.6) * 0.5 * sh;"),
])
rw('src/world/life.js', [
    ("""  vec3 ax = normalize(vec3(iB.y - 0.5, iB.z - 0.5, iB.x - 0.5) + 0.01);""", """  fade *= smoothstep(1.8, 4.5, length(c - cameraPosition));
  vec3 ax = normalize(vec3(iB.y - 0.5, iB.z - 0.5, iB.x - 0.5) + 0.01);"""),
    ("const K0 = new THREE.Vector3(kid.x + 12, 0, kid.z - 92); K0.y = heightAt(kid.x, kid.z) + 48;", "const K0 = new THREE.Vector3(kid.x + 12, 0, kid.z - 92); K0.y = heightAt(kid.x, kid.z) + 40;"),
])
rw('src/world/water.js', [
    ("col += uSunColor * (sp * 3.0 + glit * 1.2) * sh * smoothstep(-0.02, 0.06, uSunDir.y);", "col += uSunColor * (sp * 1.4 + glit * 0.9) * sh * smoothstep(-0.02, 0.06, uSunDir.y);"),
])
rw('src/render/post.js', [
    ("uniform vec2 uBaseDir[8]; uniform float uFieldFreq[8]; uniform float uFieldAmp[8];", "uniform vec2 uBaseDir[8]; uniform float uFieldFreq[8]; uniform float uFieldAmp[8]; uniform float uRidDetail[8];"),
    ("  float wB = smoothstep(uDetailThresh, uDetailThresh * 2.2, err) * B.hit;", "  float dth = uDetailThresh * uRidDetail[int(rid)];\n  float wB = smoothstep(dth, dth * 2.2, err) * B.hit;"),
    ("        uRidSize: { value: [1.3, 1.0, 0.8, 0.9, 1.1, 0.7, 0.5, 1] },", "        uRidSize: { value: [2.1, 1.0, 0.85, 0.9, 1.3, 0.7, 0.5, 1] },\n        uRidDetail: { value: [2.2, 1.0, 1.0, 1.0, 1.4, 1.0, 1.0, 1.0] },"),
])

s = open(R + 'src/timeline.js', encoding='utf-8').read()
s = s.replace("const NUM_FIELDS = ['az', 'el', 'sunI', 'hGlowAmt', 'antiAmt', 'disk', 'cover', 'stars', 'fog', 'warmth'];",
              "const NUM_FIELDS = ['az', 'el', 'sunI', 'hGlowAmt', 'antiAmt', 'disk', 'cover', 'stars', 'fog', 'warmth', 'amb', 'fogMax'];")
for name, amb, fm in [("'day'", 0.55, 0.9), ("'afternoon'", 0.55, 0.9), ("'golden'", 0.45, 0.85), ("'sunset'", 0.32, 0.75), ("'late sunset'", 0.3, 0.75), ("'dusk'", 0.38, 0.75), ("'dusk2'", 0.38, 0.75)]:
    s = s.replace("name: %s," % name, "name: %s, amb: %s, fogMax: %s," % (name, amb, fm))
s = s.replace("name: 'afternoon', amb: 0.55, fogMax: 0.9, az: 40, el: 27,", "name: 'afternoon', amb: 0.55, fogMax: 0.9, az: 40, el: 32,")
s = s.replace("name: 'golden', amb: 0.45, fogMax: 0.85, az: 18, el: 11,", "name: 'golden', amb: 0.45, fogMax: 0.85, az: 18, el: 14,")
a = s.index('export const CAM_KEYS = [')
b = s.index('];', a) + 2
s = s[:a] + """export const CAM_KEYS = [
  { t: 0.0, pos: [5.0, 1.7, 46], look: [-1, 3.0, -30], fov: 50, roll: 0.0 },
  { t: 3.5, pos: [2.0, 1.5, 6], look: [-3, 3.5, -70], fov: 50, roll: -0.02 },
  { t: 6.5, pos: [-3.0, 1.9, -46], look: [-2, 5.5, -120], fov: 52, roll: 0.03 },
  { t: 8.3, pos: [-2.2, 2.8, -80], look: [1, 8, -150], fov: 54, roll: 0.0 },
  { t: 11.0, pos: [1.5, 6.0, -115], look: [3, 16, -190], fov: 52, roll: -0.03 },
  { t: 14.5, pos: [3.0, 11.5, -152], look: [2, 22, -215], fov: 50, roll: 0.02 },
  { t: 18.0, pos: [2.0, 27.5, -192], look: [0, 36, -250], fov: 50, roll: 0.0 },
  { t: 20.5, pos: [1.0, 36.5, -230], look: [-2, 40, -290], fov: 50, roll: 0.0 },
  { t: 22.5, pos: [0.5, 38.6, -245], look: [-3, 40.5, -295], fov: 50, roll: 0.0 },
  { t: 25.0, pos: [0.5, 38.6, -253.5], look: [-3.5, 41.0, -292], fov: 50, roll: 0.0 },
  { t: 28.0, pos: [-1.0, 38.3, -258.5], look: [-4.0, 41.5, -292], fov: 50, roll: 0.01 },
  { t: 31.0, pos: [-10.5, 38.8, -261.0], look: [-1.5, 42.0, -293], fov: 50, roll: -0.01 },
  { t: 34.0, pos: [-13.0, 41.0, -255.0], look: [-2.0, 42.5, -296], fov: 50, roll: 0.0 },
  { t: 37.0, pos: [-8.5, 44.0, -245.0], look: [-3.0, 43.0, -300], fov: 50, roll: 0.0 },
  { t: 40.0, pos: [-4.5, 47.0, -236.0], look: [-3.0, 43.5, -302], fov: 50, roll: 0.0 },
];""" + s[b:]
s = s.replace("bloom: 0.16, bloomT: 0.8, rays: 0.7,", "bloom: 0.11, bloomT: 0.9, rays: 0.7,")
s = s.replace("bloom: 0.18, bloomT: 0.75, rays: 0.7,", "bloom: 0.12, bloomT: 0.85, rays: 0.7,")
open(R + 'src/timeline.js', 'w', encoding='utf-8').write(s)

rw('src/main.js', [
    ("  U.uStars.value = o.stars; U.uFogDensity.value = o.fog; U.uFogTint.value.copy(o.fogTint);", "  U.uStars.value = o.stars; U.uFogDensity.value = o.fog; U.uFogTint.value.copy(o.fogTint);\n  U.uAmbStrength.value = o.amb; U.uFogMax.value = o.fogMax;"),
])
rw('src/world/world.js', [
    ("export const HERO = { tree: { x: 17, z: -249 }, kid: { x: -4, z: -268 } };", "export const HERO = { tree: { x: 7.5, z: -267.5 }, kid: { x: -5, z: -266 } };"),
    ("lists.hero.push({ x: HERO.tree.x, y: heightAt(HERO.tree.x, HERO.tree.z), z: HERO.tree.z, s: 1.0, r: 2.2 });", "lists.hero.push({ x: HERO.tree.x, y: heightAt(HERO.tree.x, HERO.tree.z), z: HERO.tree.z, s: 0.82, r: 2.2 });"),
    ("    if (Math.hypot(x - HERO.tree.x, z - HERO.tree.z) < 22) return false;", "    if (Math.hypot(x - HERO.tree.x, z - HERO.tree.z) < 22 || Math.hypot(x - HERO.kid.x, z - HERO.kid.z) < 26) return false;"),
])
print('patched')
