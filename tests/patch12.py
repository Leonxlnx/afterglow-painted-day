import re
R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:90])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

# ---------------- palettes: deeper sunset values, real dusk ----------------
s = open(R + 'src/timeline.js', encoding='utf-8').read()
a = s.index("export const TOD_KEYS = [")
b = s.index("];", a) + 2
s = s[:a] + """export const TOD_KEYS = [
  { t: 0, name: 'day', amb: 0.5, fogMax: 0.85, az: 70, el: 31, sunI: 2.8, sun: '#fff0d8', shadowTint: '#6a80c8', ambTop: '#6488c6', ambBottom: '#4e5e36',
    zen: '#1c66de', mid: '#3a92f0', hor: '#aed6f4', sunGlow: '#fff0d0', hGlow: '#ffe6c0', hGlowAmt: 0.14, anti: '#d8e4ff', antiAmt: 0.0, disk: 4,
    cLit: '#ffffff', cShade: '#9eaee0', cRim: '#ffffff', cover: 0.38, stars: 0, fog: 0.0009, fogTint: '#ffffff',
    gLit: '#b8dc4a', gShade: '#2f6e60', warmth: 0 },
  { t: 11, name: 'afternoon', amb: 0.5, fogMax: 0.85, az: 62, el: 30, sunI: 2.7, sun: '#ffe8c4', shadowTint: '#7a86cc', ambTop: '#6e8cc6', ambBottom: '#52603a',
    zen: '#2264d6', mid: '#4f94ea', hor: '#d6e2ea', sunGlow: '#ffe2b8', hGlow: '#ffd2a0', hGlowAmt: 0.25, anti: '#e0d8f0', antiAmt: 0.1, disk: 4,
    cLit: '#fff6ea', cShade: '#96a2da', cRim: '#fff2d8', cover: 0.42, stars: 0, fog: 0.001, fogTint: '#ffffff',
    gLit: '#c4dc4c', gShade: '#2f5a4a', warmth: 0.25 },
  { t: 18.5, name: 'golden', amb: 0.4, fogMax: 0.8, az: 28, el: 13, sunI: 2.6, sun: '#ffcf8f', shadowTint: '#5a5cb4', ambTop: '#7a74c0', ambBottom: '#4e4438',
    zen: '#3458c0', mid: '#7a86d8', hor: '#ffbf8a', sunGlow: '#ffc070', hGlow: '#ff9850', hGlowAmt: 0.6, anti: '#e0a0c4', antiAmt: 0.35, disk: 3.0,
    cLit: '#ffd0a4', cShade: '#6a66b8', cRim: '#ffe0a8', cover: 0.44, stars: 0, fog: 0.0008, fogTint: '#fff0e4',
    gLit: '#dcc04a', gShade: '#28485e', warmth: 0.65 },
  { t: 25, name: 'sunset', amb: 0.28, fogMax: 0.62, az: 6, el: 3.0, sunI: 2.5, sun: '#ff9a50', shadowTint: '#2a2d6b', ambTop: '#4a3f8f', ambBottom: '#2a2238',
    zen: '#3a3a8a', mid: '#6a58b8', hor: '#ff6a2a', sunGlow: '#ffb060', hGlow: '#ff4a2a', hGlowAmt: 0.95, anti: '#c86aa8', antiAmt: 0.5, disk: 3.2,
    cLit: '#ffb070', cShade: '#4a3f8f', cRim: '#ffd07a', cover: 0.4, stars: 0, fog: 0.0006, fogTint: '#ffe0d8',
    gLit: '#e0a040', gShade: '#1f2a4e', warmth: 1 },
  { t: 32, name: 'late sunset', amb: 0.26, fogMax: 0.6, az: 2, el: 0.3, sunI: 2.0, sun: '#ff7444', shadowTint: '#22245e', ambTop: '#3e3484', ambBottom: '#221c34',
    zen: '#2a2c78', mid: '#5a48a8', hor: '#ff5a3a', sunGlow: '#ff8040', hGlow: '#ff3a3a', hGlowAmt: 1.0, anti: '#b05a9c', antiAmt: 0.55, disk: 2.6,
    cLit: '#ff8a6a', cShade: '#3a3080', cRim: '#ffa060', cover: 0.42, stars: 0.1, fog: 0.0007, fogTint: '#ffd0d8',
    gLit: '#a8604a', gShade: '#181f40', warmth: 1 },
  { t: 37, name: 'dusk', amb: 0.3, fogMax: 0.6, az: -2, el: -3.5, sunI: 0.6, sun: '#ff5a50', shadowTint: '#181a40', ambTop: '#2a2860', ambBottom: '#141228',
    zen: '#141838', mid: '#2a2660', hor: '#d8506a', sunGlow: '#ff5040', hGlow: '#e0485a', hGlowAmt: 0.55, anti: '#6a4a90', antiAmt: 0.35, disk: 0,
    cLit: '#9a4a7a', cShade: '#221e50', cRim: '#d86a6a', cover: 0.4, stars: 1.1, fog: 0.0007, fogTint: '#c8b0f0',
    gLit: '#3a3a5a', gShade: '#10142e', warmth: 0.9 },
  { t: 40, name: 'dusk2', amb: 0.3, fogMax: 0.6, az: -3, el: -5, sunI: 0.45, sun: '#ff5050', shadowTint: '#141638', ambTop: '#24225a', ambBottom: '#100e22',
    zen: '#0e1230', mid: '#20204e', hor: '#a83a5e', sunGlow: '#ff4a40', hGlow: '#c03a5a', hGlowAmt: 0.45, anti: '#5a4080', antiAmt: 0.3, disk: 0,
    cLit: '#6a3a64', cShade: '#1a1840', cRim: '#b05a6a', cover: 0.4, stars: 1.3, fog: 0.0007, fogTint: '#b8a0e8',
    gLit: '#2a2a48', gShade: '#0c1028', warmth: 0.9 },
];""" + s[b:]
# style: lower black level, more contrast; sunset sat down, dusk exposure ramp; grass painterly
a = s.index("export const STYLE_KEYS = [")
b = s.index("];", a) + 2
s = s[:a] + """export const STYLE_KEYS = [
  { t: 0, A: [66, 0.5, 0.8, 0.42], B: [24, 0.5, 0.9, 0.3], impasto: 0.38, kuw: 3.8, baseMix: 0.62, detail: 0.03, flow: 0.9,
    bloom: 0.09, bloomT: 0.95, rays: 0.4, rayLen: 0.55, rayT: 0.55, exposure: 1.0, sat: 1.06, contrast: 1.12, vignette: 0.2 },
  { t: 12, A: [74, 0.5, 0.85, 0.5], B: [24, 0.5, 0.9, 0.35], impasto: 0.45, kuw: 3.9, baseMix: 0.66, detail: 0.032, flow: 0.95,
    bloom: 0.11, bloomT: 0.9, rays: 0.75, rayLen: 0.6, rayT: 0.5, exposure: 1.0, sat: 1.08, contrast: 1.16, vignette: 0.24 },
  { t: 14.5, A: [80, 0.5, 0.9, 0.55], B: [24, 0.5, 0.92, 0.38], impasto: 0.5, kuw: 4.0, baseMix: 0.68, detail: 0.033, flow: 0.97,
    bloom: 0.12, bloomT: 0.85, rays: 0.8, rayLen: 0.65, rayT: 0.45, exposure: 1.06, sat: 1.1, contrast: 1.2, vignette: 0.26 },
  { t: 22, A: [92, 0.5, 0.95, 0.72], B: [26, 0.5, 0.95, 0.45], impasto: 0.85, kuw: 4.3, baseMix: 0.75, detail: 0.035, flow: 1.0,
    bloom: 0.1, bloomT: 0.95, rays: 0.6, rayLen: 0.62, rayT: 0.5, exposure: 1.0, sat: 1.02, contrast: 1.24, vignette: 0.24 },
  { t: 30, A: [104, 0.5, 1.0, 0.8], B: [28, 0.5, 1.0, 0.5], impasto: 1.0, kuw: 4.5, baseMix: 0.8, detail: 0.038, flow: 1.0,
    bloom: 0.11, bloomT: 0.9, rays: 0.6, rayLen: 0.62, rayT: 0.45, exposure: 1.0, sat: 1.0, contrast: 1.26, vignette: 0.26 },
  { t: 34, A: [100, 0.5, 1.0, 0.75], B: [28, 0.5, 1.0, 0.5], impasto: 0.95, kuw: 4.5, baseMix: 0.8, detail: 0.038, flow: 1.0,
    bloom: 0.14, bloomT: 0.7, rays: 0.4, rayLen: 0.6, rayT: 0.45, exposure: 0.92, sat: 1.0, contrast: 1.24, vignette: 0.3 },
  { t: 40, A: [96, 0.5, 1.0, 0.7], B: [28, 0.5, 1.0, 0.5], impasto: 0.85, kuw: 4.5, baseMix: 0.8, detail: 0.038, flow: 1.0,
    bloom: 0.22, bloomT: 0.45, rays: 0.2, rayLen: 0.6, rayT: 0.4, exposure: 0.62, sat: 1.05, contrast: 1.2, vignette: 0.38 },
];""" + s[b:]
s = s.replace("    lift: new THREE.Vector3(0.0, 0.0, 0.015), gain: new THREE.Vector3(1, 1, 1),", "    lift: new THREE.Vector3(0.0, 0.0, 0.004), gain: new THREE.Vector3(1, 1, 1),")
# frame 0: lower over the water
s = s.replace("  { t: 0.0, pos: [5.0, 1.7, 46], look: [-1, 3.0, -30], fov: 50, roll: 0.0 },", "  { t: 0.0, pos: [5.0, 1.15, 46], look: [-1, 3.2, -30], fov: 52, roll: 0.012 },")
s = s.replace("  { t: 3.5, pos: [2.0, 1.5, 6], look: [-3, 3.5, -70], fov: 50, roll: -0.02 },", "  { t: 3.5, pos: [2.0, 1.2, 6], look: [-3, 3.8, -70], fov: 52, roll: -0.02 },")
open(R + 'src/timeline.js', 'w', encoding='utf-8').write(s)

# ---------------- sun disc smaller, warm white core ----------------
rw('src/world/sky.js', [
    ("uniforms: { uSunSize: { value: 0.022 } } });", "uniforms: { uSunSize: { value: 0.0135 } } });"),
    ("  col += uGlowFix(uSunGlow) * 0.0;", "  "),
    ("  col += uSunGlow * (sunCore * 0.8 + sunHalo * 0.6) * uSunDisk * (1.0 - dens * 0.6);",
     "  col += mix(uSunGlow, vec3(1.0, 0.94, 0.75), 0.55) * (sunCore * 0.9 + sunHalo * 0.35) * uSunDisk * (1.0 - dens * 0.6);"),
])

# ---------------- hero blossom tree: bigger, pink, glowing ----------------
rw('src/world/world.js', [
    ("export const HERO = { tree: { x: 12.5, z: -265 }, kid: { x: -5, z: -266 } };", "export const HERO = { tree: { x: 14.5, z: -263.5 }, kid: { x: -5, z: -266 } };"),
    ("z: HERO.tree.z, s: 0.66, r: 2.2 });", "z: HERO.tree.z, s: 0.95, r: 2.2 });"),
    ("blossom: 0.5 }),", "blossom: 0.8 }),"),
])
rw('src/world/trees.js', [
    ("""    vec3 bl = mix(vec3(1.0, 0.66, 0.78), vec3(1.0, 0.86, 0.9), tx.g) * (0.85 + 0.3 * var);
    vec3 bcol = mix(mix(bl * mix(uShadowTint, uAmbTop, 0.45) * 0.8, gs * 1.3, 0.35), bl * uSunColor * 0.6, lit);""",
     """    vec3 blLit = mix(vec3(0.95, 0.33, 0.55), vec3(1.0, 0.62, 0.74), tx.g);   // ~#f39ac0
    vec3 blSh = mix(vec3(0.26, 0.07, 0.26), vec3(0.4, 0.14, 0.36), tx.g);      // ~#8a4a8a
    blSh = mix(blSh, blSh * uAmbTop * 2.2, 0.35);
    vec3 bcol = mix(blSh * (0.85 + 0.3 * var), blLit * uSunColor * 0.55 * (0.85 + 0.3 * var), lit);
    // petals glow when the low sun shines through them
    vec3 Vb = normalize(cameraPosition - vWP);
    bcol += blLit * uSunColor * pow(saturate(dot(-Vb, uSunDir)), 3.0) * 0.45 * sh;"""),
])

# ---------------- kid: warm shirt; kite: less glow ----------------
rw('src/world/life.js', [
    ("  const skin = '#f2c9a8', shirt = '#f4efe6', shorts = '#2b3350', hair = '#3a2a24', shoe = '#ece6dc', scarf = '#e23b3b';",
     "  const skin = '#f2c9a8', shirt = '#f2c46a', shorts = '#2b3350', hair = '#3a2a24', shoe = '#ece6dc', scarf = '#e23b3b';"),
    ("  vec3 col = vCol * (uSunColor * 0.32 + uAmbTop * 0.35) + vCol * uSunColor * back * 0.55; // kite fabric glows when backlit",
     "  vec3 col = vCol * (uSunColor * 0.3 + uAmbTop * 0.35) + vCol * uSunColor * back * 0.28; // kite fabric glows when backlit"),
    ("    wp = K + sv * position.x * 3.2 + uv2 * position.y * 3.2 - fwd * abs(position.x) * 0.7;", "    wp = K + sv * position.x * 3.6 + uv2 * position.y * 3.6 - fwd * abs(position.x) * 0.8;"),
    # fireflies: small, sharp cores
    ("  vec3 wp = c + (camRight() * position.x + camUp() * position.y) * size * 2.2;\n  vQ = position.xy; vI = I;", "  vec3 wp = c + (camRight() * position.x + camUp() * position.y) * size * 1.4;\n  vQ = position.xy; vI = I;"),
    ("  float g = exp(-r * r * 9.0) + 0.25 * exp(-r * r * 2.5);", "  float g = exp(-r * r * 18.0) * 1.6 + 0.12 * exp(-r * r * 3.0);"),
    # beams: start above ground, fade near the lens
    ("  vec3 mid = base + ax * len * 0.5;", "  base += ax * 2.0;\n  vec3 mid = base + ax * len * 0.5;"),
    ("  vI = lit * uBeams * flick * smoothstep(0.02, 0.15, uSunDir.y);", "  vI = lit * uBeams * flick * smoothstep(0.02, 0.15, uSunDir.y) * smoothstep(7.0, 16.0, length(mid - cameraPosition));"),
    # petals: fewer/smaller in the day
    ("    vec3 B = vec3(34.0, 14.0, 34.0);\n    vec3 p = iA.xyz * B", "    vec3 B = vec3(34.0, 14.0, 34.0);\n    size *= 0.8;\n    vec3 p = iA.xyz * B"),
    ("      LU.uPetals.value = 0.35 + 0.25 * k(0, 6, t) - 0.3 * k(10, 16, t) + 0.5 * k(21, 27, t) - 0.4 * k(34, 39, t);",
     "      LU.uPetals.value = 0.2 + 0.08 * k(0, 6, t) - 0.18 * k(10, 16, t) + 0.5 * k(21, 27, t) - 0.35 * k(34, 39, t);"),
])
# island A: no thin waterfall
rw('src/world/islands.js', [("[-228, 96, -765, 40, 46, 1]", "[-228, 96, -765, 40, 46, 0]")])

# ---------------- strokes: details painted, horizontal far field, sky radiates toward the sun ----------------
rw('src/render/post.js', [
    ("        uRidSize: { value: [2.1, 1.0, 0.85, 0.9, 1.3, 0.7, 0.5, 1] },\n        uRidDetail: { value: [2.2, 1.0, 1.0, 1.0, 1.4, 1.0, 1.0, 1.0] },",
     "        uRidSize: { value: [2.1, 1.0, 0.85, 0.9, 1.3, 0.7, 0.3, 1] },\n        uRidDetail: { value: [2.2, 1.5, 1.0, 1.0, 1.4, 1.0, 0.8, 1.0] },"),
    ("        uRidOn: { value: [1, 1, 1, 1, 1, 1, 0, 0] },", "        uRidOn: { value: [1, 1, 1, 1, 1, 1, 1, 0] },\n        uSunP: { value: new THREE.Vector2() },"),
    ("uniform vec2 uBaseDir[8]; uniform float uFieldFreq[8]; uniform float uFieldAmp[8]; uniform float uRidDetail[8];",
     "uniform vec2 uBaseDir[8]; uniform float uFieldFreq[8]; uniform float uFieldAmp[8]; uniform float uRidDetail[8]; uniform vec2 uSunP; float gDist;"),
    ("""    vec2 bd = uBaseDir[int(rid)];
    vec3 fl = flowAt(cpx / uRes);""", """    vec2 bd = uBaseDir[int(rid)];
    if (rid < 0.5) { // sky: sweep toward the sun, curling slightly
      vec2 toSun = uSunP - ctr * g; float ls = length(toSun);
      if (ls > 1e-3) bd = normalize(mix(toSun / ls, vec2(-toSun.y, toSun.x) / ls, 0.35));
    }
    // far away: strokes lie horizontal on screen (no barcode at the horizon)
    float farMix = smoothstep(220.0, 900.0, gDist) * step(0.5, rid);
    vec2 hz = J * vec2(1.0, 0.0); float hl2 = dot(hz, hz);
    if (farMix > 0.0 && hl2 > 1e-14) bd = normalize(mix(bd, hz * inversesqrt(hl2), farMix));
    vec3 fl = flowAt(cpx / uRes);
    fl.z *= 1.0 - farMix;"""),
    ("""  vec2 P = aux.xy; float rid = floor(aux.z + 0.5);""", """  vec2 P = aux.xy; float rid = floor(aux.z + 0.5); gDist = aux.w;"""),
    ("    if (P.fieldAmp) su.uFieldAmp.value = P.fieldAmp;", "    if (P.fieldAmp) su.uFieldAmp.value = P.fieldAmp;\n    if (P.sunP) su.uSunP.value.copy(P.sunP);"),
])
# P for the kid / details: vertical plane so strokes follow the figure
rw('src/world/life.js', [
    ("  col += vCol * uSunColor * pow(1.0 - saturate(dot(n, V)), 3.0) * pow(saturate(dot(-V, uSunDir)), 2.0) * 0.8; // rim\n  col = applyAtmos(col, vWP);\n  writeOut(col, vWP.xz, RID_DETAIL, vWP);",
     "  col += vCol * uSunColor * pow(1.0 - saturate(dot(n, V)), 3.0) * pow(saturate(dot(-V, uSunDir)), 2.0) * 0.8; // rim\n  col = applyAtmos(col, vWP);\n  writeOut(col, vec2(vWP.x * 0.8 + vWP.z * 0.6, vWP.y), RID_DETAIL, vWP);"),
])
rw('src/main.js', [
    ("  style.fade = THREE.MathUtils.smoothstep(tv, DURATION - 0.9, DURATION) * 0.92;", """  style.fade = THREE.MathUtils.smoothstep(tv, DURATION - 0.9, DURATION) * 0.92;
  { const d = U.uSunDir.value; const yy = Math.max(d.y, 0) + 0.09; style.sunP = new THREE.Vector2(d.x / yy * 260, d.z / yy * 260); }"""),
])
print('ok')
