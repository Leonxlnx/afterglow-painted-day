R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:80])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

rw('src/render/post.js', [
    ("  if (uRidOn[int(rid)] < 0.5) { outColor = vec4(own, 0.0); return; }", "  if (uRidOn[int(rid)] < 0.5) { outColor = vec4(mix(scene, base, 0.25), 0.0); return; }"),
])
rw('src/world/life.js', [
    ("  const red = new THREE.Color('#e8322e'), cream = new THREE.Color('#fff0d8'), yel = new THREE.Color('#ffc23a');",
     "  const red = new THREE.Color('#d8222a'), cream = new THREE.Color('#ffc94a'), yel = new THREE.Color('#ffb02a');"),
    ("  vec3 col = vCol * (uSunColor * 0.55 + uAmbTop * 0.6) + vCol * uSunColor * back * 0.9; // kite fabric glows when backlit",
     "  vec3 col = vCol * (uSunColor * 0.32 + uAmbTop * 0.35) + vCol * uSunColor * back * 0.55; // kite fabric glows when backlit"),
])
# clouds: sunset underside glow, softer edges, less bubbly rim
rw('src/world/sky.js', [
    ("""  float fres = pow(1.0 - abs(dot(n, -v)), 2.5);
  float back = pow(max(dot(v, uSunDir), 0.0), 5.0);
  col += uCloudRim * fres * (0.25 + back * 2.2);
  // silver lining when the sun is behind the cloud
  col += uCloudRim * back * 0.6 * (1.0 - lit);""", """  float fres = pow(1.0 - abs(dot(n, -v)), 2.5);
  float back = pow(max(dot(v, uSunDir), 0.0), 5.0);
  col += uCloudRim * fres * (0.08 + back * 1.4);
  // low sun lights the cloud bases (sunset) - warm undersides, violet tops
  float low = 1.0 - smoothstep(0.05, 0.3, uSunDir.y);
  vec2 sh2 = normalize(uSunDir.xz + 1e-5);
  float towardSun = dot(normalize(vWP.xz - cameraPosition.xz), sh2) * 0.5 + 0.5;
  float under = smoothstep(0.35, -0.5, n.y) * low;
  col = mix(col, uCloudLit * 1.15 + uCloudRim * 0.25, under * (0.45 + 0.55 * towardSun));
  col = mix(col, uCloudShade * 0.85, smoothstep(0.2, 0.9, n.y) * low * 0.5);"""),
    ("  col = mix(col, sky, saturate(f * 0.65 + fres * fres * 0.35));", "  col = mix(col, sky, saturate(f * 0.6 + fres * fres * 0.6));"),
])
# lower headland cliffs near the bay
rw('src/world/heightfield.js', [
    ("""  h += smoothstep(55, 165, dx) * 46 * wallN + smoothstep(140, 320, dx) * 40 * wallN;""",
     """  const nearCoast = 1 - 0.55 * smoothstep(-220, -420, z);
  h += (smoothstep(55, 165, dx) * 46 * wallN + smoothstep(140, 320, dx) * 40 * wallN) * nearCoast;"""),
])
s = open(R + 'src/world/islands.js', encoding='utf-8').read()
a = s.index('  const ISL = [')
b = s.index('  ];', a) + 4
s = s[:a] + """  const ISL = [
    // x, y, z, radius, depth, waterfall
    [-228, 96, -765, 40, 46, 1], [380, 130, -911, 52, 56, 1], [-221, 89, -498, 14, 18, 0], [-178, 156, -1944, 70, 70, 1], [532, 268, -2388, 60, 60, 0],
  ];""" + s[b:]
a = s.index('  const STK = [')
b = s.index('];', a) + 2
s = s[:a] + "  const STK = [[-142, -405, 10.5, 62], [176, -455, 9, 44]];" + s[b:]
s = s.replace("""      const t = -y; // 0 rim .. 1 bottom
      const prof = t < 0.22 ? 1 - 0.25 * t : Math.pow(Math.max(0, (1 - t) / 0.78), 0.55) * 0.945;""",
"""      const t = -y; // 0 rim .. 1 bottom
      const prof = Math.pow(Math.max(0, 1 - Math.pow(t, 1.8)), 0.55);""")
s = s.replace("const m = applyMat(new THREE.Mesh(islandGeometry(R, D * 0.85, k * 3.1 + 1)), near);", "const m = applyMat(new THREE.Mesh(islandGeometry(R, D, k * 3.1 + 1)), near);")
s = s.replace("treeLists[kind].push({ x: x + lx * Math.cos(th) + lz * Math.sin(th), y: ty, z: z - lx * Math.sin(th) + lz * Math.cos(th), s: 0.6 + rand(i, k * 10 + 4) * 0.5,",
              "treeLists[kind].push({ x: x + lx * Math.cos(th) + lz * Math.sin(th), y: ty, z: z - lx * Math.sin(th) + lz * Math.cos(th), s: (1.1 + rand(i, k * 10 + 4) * 0.8) * Math.min(1.6, R / 25),")
s = s.replace("    const nt = Math.round(R * 0.9);", "    const nt = Math.round(R * 0.55);")
s = s.replace("    for (let i = 0; i < 2; i++) stl['bush'].push(", "    for (let i = 0; i < 0; i++) stl['bush'].push(")
open(R + 'src/world/islands.js', 'w', encoding='utf-8').write(s)

rw('src/world/world.js', [
    ("    if (!ok(jx, jz, 6.5)) continue;", "    if (!ok(jx, jz, 9.0)) continue;"),
])
rw('src/world/trees.js', [
    ("forest: { trunkLen: 11.0, trunkRad: 0.38, depth: 3, kids0: 5, kids: 2, start: 0.62, spread: 0.65, lenScale: 0.55, radScale: 0.5, wobble: 0.25, upTend: 0.35, clusterR: 2.1, cards: 10,",
     "forest: { trunkLen: 11.0, trunkRad: 0.38, depth: 3, kids0: 5, kids: 2, start: 0.62, spread: 0.65, lenScale: 0.55, radScale: 0.5, wobble: 0.25, upTend: 0.35, clusterR: 2.1, cards: 8,"),
    ("forest2: { trunkLen: 13.0, trunkRad: 0.42, depth: 3, kids0: 6, kids: 2, start: 0.66, spread: 0.6, lenScale: 0.5, radScale: 0.5, wobble: 0.2, upTend: 0.4, clusterR: 2.3, cards: 10,",
     "forest2: { trunkLen: 13.0, trunkRad: 0.42, depth: 3, kids0: 6, kids: 2, start: 0.66, spread: 0.6, lenScale: 0.5, radScale: 0.5, wobble: 0.2, upTend: 0.4, clusterR: 2.3, cards: 8,"),
])
rw('src/world/life.js', [
    ("writeGlow(uSunColor * vec3(1.0, 0.95, 0.75) * across * along * vI * 0.2);", "writeGlow(uSunColor * vec3(1.0, 0.95, 0.75) * across * along * vI * 0.11);"),
])
s = open(R + 'src/timeline.js', encoding='utf-8').read()
s = s.replace("gLit: '#c8d84a', gShade: '#3c7466', warmth: 0.25 },", "gLit: '#c8d84a', gShade: '#4a8068', warmth: 0.25 },")
a = s.index("  { t: 31.0, pos: [-10.5, 38.8, -261.0]")
b = s.index('];', a)
s = s[:a] + """  { t: 31.0, pos: [-10.5, 38.8, -261.0], look: [-1.5, 42.0, -293], fov: 50, roll: -0.01 },
  { t: 34.0, pos: [-11.5, 39.2, -256.0], look: [-2.5, 42.5, -296], fov: 46, roll: 0.0 },
  { t: 37.0, pos: [-9.5, 39.4, -251.0], look: [-3.0, 42.5, -298], fov: 42, roll: 0.0 },
  { t: 40.0, pos: [-8.0, 39.6, -246.5], look: [-3.5, 42.5, -300], fov: 38, roll: 0.0 },
""" + s[b:]
open(R + 'src/timeline.js', 'w', encoding='utf-8').write(s)
print('ok')
