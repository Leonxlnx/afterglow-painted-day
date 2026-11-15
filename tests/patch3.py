R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:80])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

# bigger kite + longer tail
rw('src/world/life.js', [
    ("    wp = K + sv * position.x * 1.5 + uv2 * position.y * 1.5 - fwd * abs(position.x) * 0.35;",
     "    wp = K + sv * position.x * 3.2 + uv2 * position.y * 3.2 - fwd * abs(position.x) * 0.7;"),
    ("    vec3 c = K - upV * 1.4 + down * s * 9.0 + sideW * sin(uTime * 4.0 - s * 9.0) * s * 1.2 + (-fwd) * sin(uTime * 3.0 - s * 7.0) * s * 0.6;",
     "    vec3 c = K - upV * 2.7 + down * s * 17.0 + sideW * sin(uTime * 3.4 - s * 9.0) * s * 2.2 + (-fwd) * sin(uTime * 2.6 - s * 7.0) * s * 1.1;"),
    ("    wp = c + wv * position.x * (0.09 + 0.18 * step(0.5, fract(s * 10.0)) * step(fract(s * 10.0), 0.62));",
     "    wp = c + wv * position.x * (0.16 + 0.34 * step(0.5, fract(s * 10.0)) * step(fract(s * 10.0), 0.62));"),
    ("    wp = c + wv * position.x * max(0.008, d * 0.0005);", "    wp = c + wv * position.x * max(0.012, d * 0.00075);"),
])
# hero tree smaller and further right; kid
rw('src/world/world.js', [
    ("export const HERO = { tree: { x: 7.5, z: -267.5 }, kid: { x: -5, z: -266 } };", "export const HERO = { tree: { x: 12.5, z: -265 }, kid: { x: -5, z: -266 } };"),
    ("z: HERO.tree.z, s: 0.82, r: 2.2 });", "z: HERO.tree.z, s: 0.66, r: 2.2 });"),
])
# islands: deeper rocky undersides + rim light; no trees on sea stacks
rw('src/world/islands.js', [
    ("const m = applyMat(new THREE.Mesh(islandGeometry(R, D * 0.55, k * 3.1 + 1)), near);", "const m = applyMat(new THREE.Mesh(islandGeometry(R, D * 0.85, k * 3.1 + 1)), near);"),
    ("""  vec3 col = paintLight(rock, n, lit, 1.0);
  float grassM""", """  vec3 col = paintLight(rock, n, lit, 1.0);
  vec3 Vv = normalize(cameraPosition - vWP);
  col += mix(uCloudRim, uSunColor * 0.5, 0.5) * pow(1.0 - saturate(dot(n, Vv)), 3.0) * pow(saturate(dot(-Vv, uSunDir)), 1.5) * 0.9;
  float grassM"""),
    ("    for (let i = 0; i < 3; i++) stl[i ? 'bush' : 'young'].push(", "    for (let i = 0; i < 2; i++) stl['bush'].push("),
])
# jagged coastline + strata for cliffs
rw('src/world/heightfield.js', [
    ("""  const cz = coastZ(x);
  if (z < cz + 4) {
    const t = smoothstep(cz + 4, cz - 16, z);""", """  const cz = coastZ(x) + 14 * fbm(x * 0.03, z * 0.03, 3, 41);
  if (z < cz + 4) {
    const t = smoothstep(cz + 4, cz - 16, z);"""),
])
rw('src/world/terrain.js', [
    ("""  float strata = gnoise(vec2(wp.y * 1.3, (wp.x + wp.z) * 0.05)) * 0.5 + 0.5;""",
     """  float strata = gnoise(vec2(wp.y * 0.9 + gnoise(wp.xz * 0.05) * 1.5, (wp.x + wp.z) * 0.02)) * 0.5 + 0.5;
  strata = floor(strata * 4.0 + 0.5) / 4.0;"""),
])
# sun swings from behind-right (front-lit anime day) to ahead (sunset)
s = open(R + 'src/timeline.js', encoding='utf-8').read()
s = s.replace("name: 'day', amb: 0.55, fogMax: 0.9, az: 58, el: 40,", "name: 'day', amb: 0.55, fogMax: 0.9, az: 96, el: 42,")
s = s.replace("name: 'afternoon', amb: 0.55, fogMax: 0.9, az: 40, el: 32,", "name: 'afternoon', amb: 0.55, fogMax: 0.9, az: 70, el: 33,")
s = s.replace("name: 'golden', amb: 0.45, fogMax: 0.85, az: 18, el: 14,", "name: 'golden', amb: 0.45, fogMax: 0.85, az: 30, el: 14,")
open(R + 'src/timeline.js', 'w', encoding='utf-8').write(s)
print('ok')
