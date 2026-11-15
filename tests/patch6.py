R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:80])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

rw('src/timeline.js', [
    ("export let WARP = [[0, 0], [40, 40]];", "export let WARP = [[0, 0], [8.59, 7.55], [19.48, 18.0], [40, 40]];"),
    ("hGlow: '#ff9e5c', hGlowAmt: 0.6, anti: '#e9a8c8', antiAmt: 0.35, disk: 6,", "hGlow: '#ff9e5c', hGlowAmt: 0.6, anti: '#e9a8c8', antiAmt: 0.35, disk: 3.2,"),
    ("hGlow: '#ff4a32', hGlowAmt: 0.95, anti: '#ea8fc4', antiAmt: 0.7, disk: 7,", "hGlow: '#ff4a32', hGlowAmt: 0.95, anti: '#ea8fc4', antiAmt: 0.7, disk: 3.6,"),
    ("hGlow: '#ff3a40', hGlowAmt: 1.0, anti: '#d878b8', antiAmt: 0.8, disk: 5,", "hGlow: '#ff3a40', hGlowAmt: 1.0, anti: '#d878b8', antiAmt: 0.8, disk: 2.8,"),
    ("hGlow: '#ffe8c4', hGlowAmt: 0.12, anti: '#d8e4ff', antiAmt: 0.0, disk: 14,", "hGlow: '#ffe8c4', hGlowAmt: 0.12, anti: '#d8e4ff', antiAmt: 0.0, disk: 5,"),
    ("hGlow: '#ffd2a0', hGlowAmt: 0.25, anti: '#e0d8f0', antiAmt: 0.1, disk: 14,", "hGlow: '#ffd2a0', hGlowAmt: 0.25, anti: '#e0d8f0', antiAmt: 0.1, disk: 4,"),
    ("  { t: 37.0, pos: [-8.5, 39.2, -255.5], look: [-3.5, 43.5, -298], fov: 43, roll: 0.0 },\n  { t: 40.0, pos: [-7.5, 39.3, -253.5], look: [-3.8, 44.0, -300], fov: 41, roll: 0.0 },",
     "  { t: 37.0, pos: [-8.6, 39.1, -257.0], look: [-3.6, 43.5, -298], fov: 44, roll: 0.0 },\n  { t: 40.0, pos: [-7.9, 39.1, -256.3], look: [-3.9, 44.0, -300], fov: 43, roll: 0.0 },"),
])
# softer sun disk (glow, no hard bite)
rw('src/world/sky.js', [
    ("  float sunCore = smoothstep(cos(uSunSize * 1.35), cos(uSunSize * 0.85), sd);\n  col += uSunGlow * sunCore * uSunDisk * (1.0 - dens * 0.85);",
     "  float sunCore = smoothstep(cos(uSunSize * 1.6), cos(uSunSize * 0.6), sd);\n  float sunHalo = pow(sd, 900.0);\n  col += uSunGlow * (sunCore * 0.8 + sunHalo * 0.6) * uSunDisk * (1.0 - dens * 0.6);"),
])
# fireflies: smaller sprites, fade near the lens
rw('src/world/life.js', [
    ("  I *= smoothstep(1.2, 3.5, dist);", "  I *= smoothstep(2.5, 7.0, dist);"),
    ("  vec3 wp = c + (camRight() * position.x + camUp() * position.y) * size * 3.0;\n  vQ = position.xy; vI = I;",
     "  vec3 wp = c + (camRight() * position.x + camUp() * position.y) * size * 2.2;\n  vQ = position.xy; vI = I;"),
])
# forest exposure lift
s = open(R + 'src/timeline.js', encoding='utf-8').read()
s = s.replace("""  { t: 22, A: [92,""", """  { t: 14.5, A: [80, 0.5, 0.9, 0.55], B: [24, 0.5, 0.92, 0.38], impasto: 0.48, kuw: 3.8, baseMix: 0.68, detail: 0.033, flow: 0.97,
    bloom: 0.13, bloomT: 0.8, rays: 0.7, rayLen: 0.65, rayT: 0.45, exposure: 1.12, sat: 1.12, contrast: 1.06, vignette: 0.22 },
  { t: 22, A: [92,""")
open(R + 'src/timeline.js', 'w', encoding='utf-8').write(s)
print('ok')
