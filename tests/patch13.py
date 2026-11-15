R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:90])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

# --- two flocks: far crossing + a burst out of the forest on the drop ---
rw('src/world/life.js', [
    ("""  float t = uTime;
  float T = (t - 22.5 - iB.x * 1.5) / 14.0;
  vec3 A = vec3(150.0, 92.0, -360.0), Bp = vec3(-190.0, 72.0, -420.0);
  vec3 c = mix(A, Bp, T) + iA.xyz * vec3(9.0, 4.0, 9.0) + vec3(0.0, sin(T * 6.0 + iA.w * 9.0) * 1.5, 0.0);
  vec3 vel = normalize(Bp - A);""", """  float t = uTime;
  vec3 A, Bp; float T; vec3 spread;
  if (iB.w < 0.5) {
    T = (t - 22.5 - iB.x * 1.5) / 14.0;
    A = vec3(150.0, 92.0, -360.0); Bp = vec3(-190.0, 72.0, -420.0); spread = vec3(9.0, 4.0, 9.0);
  } else {
    // burst: birds lift out of the last trees as the music drops and sail toward the sunset
    T = (t - 17.75 - iB.x * 0.6) / 7.5;
    A = vec3(4.0, 38.0, -224.0); Bp = vec3(-26.0, 84.0, -400.0); spread = vec3(6.0, 2.5, 5.0) * (0.6 + T * 2.2);
  }
  float Te = T * T * (3.0 - 2.0 * T) * 0.4 + T * 0.6;
  vec3 c = mix(A, Bp, Te) + iA.xyz * spread + vec3(0.0, sin(T * 6.0 + iA.w * 9.0) * 1.5, 0.0);
  vec3 vel = normalize(Bp - A);"""),
    ("""  const NBd = 26, ia = new Float32Array(NBd * 4), ib = new Float32Array(NBd * 4);
  for (let i = 0; i < NBd; i++) {
    const row = Math.floor(Math.sqrt(i)), off = i - row * row;
    ia.set([(off - row) * 0.9 + (rand(i, 71) - 0.5), (rand(i, 72) - 0.5), row * 0.9 + (rand(i, 73) - 0.5), rand(i, 74)], i * 4);
    ib.set([rand(i, 75), rand(i, 76), rand(i, 77), 0], i * 4);
  }""", """  const NB0 = 26, NB1 = 34, NBd = NB0 + NB1, ia = new Float32Array(NBd * 4), ib = new Float32Array(NBd * 4);
  for (let i = 0; i < NBd; i++) {
    if (i < NB0) {
      const row = Math.floor(Math.sqrt(i)), off = i - row * row;
      ia.set([(off - row) * 0.9 + (rand(i, 71) - 0.5), (rand(i, 72) - 0.5), row * 0.9 + (rand(i, 73) - 0.5), rand(i, 74)], i * 4);
      ib.set([rand(i, 75), rand(i, 76), rand(i, 77), 0], i * 4);
    } else {
      ia.set([(rand(i, 81) - 0.5) * 2, (rand(i, 82) - 0.5) * 2, (rand(i, 83) - 0.5) * 2, rand(i, 84)], i * 4);
      ib.set([rand(i, 85), rand(i, 86), rand(i, 87), 1], i * 4);
    }
  }"""),
    ("      LU.uBirds.value = t > 22 && t < 38 ? 1 : 0;", "      LU.uBirds.value = t > 17.5 && t < 38 ? 1 : 0;"),
    # kid: gentle sway
    ("""  vec3 p = position;
  // scarf / hair flutter in the wind (flutter = distance along the scarf)""", """  vec3 p = position;
  p.x += sin(uTime * 1.3) * 0.018 * p.y; p.z += sin(uTime * 0.9 + 1.0) * 0.012 * p.y;
  // scarf / hair flutter in the wind (flutter = distance along the scarf)"""),
])
# --- wider waterfalls ---
rw('src/world/islands.js', [
    ("      const len = 60 + D * 1.4, w = R * 0.16;", "      const len = 60 + D * 1.4, w = R * 0.32;"),
])
# --- hero cumulus beside the sun + more lumps ---
rw('src/world/sky.js', [
    ("""    [200, -1500, 520, 420, 160, 12], [-500, -1300, 560, 380, 140, 10],
  ];""", """    [200, -1500, 520, 420, 160, 12], [-500, -1300, 560, 380, 140, 10],
    // hero towers flanking the sunset
    [-1500, -3300, 280, 1700, 1700, 70], [1900, -4300, 300, 1500, 1400, 60],
  ];"""),
])
print('ok')
