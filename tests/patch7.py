R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:80])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

rw('src/world/life.js', [
    ("""  vec2 q = vQ; q.y += 0.25;
  float d = length(vec2(q.x * (1.0 + q.y * 0.6), q.y * 0.8));
  if (d > 0.85 || vFade < 0.02) discard;""", """  vec2 q = vQ;
  // rounded petal with a soft notch, fully inside the quad
  float w = 0.62 * (1.0 - 0.38 * q.y) * (1.0 - 0.25 * smoothstep(0.75, 1.0, q.y) * (1.0 - abs(q.x) * 4.0));
  float d = length(vec2(q.x / max(w, 0.05), q.y / 0.95));
  if (d > 1.0 || vFade < 0.02) discard;"""),
    ("""  vec3 pink = mix(vec3(1.0, 0.62, 0.78), vec3(1.0, 0.92, 0.95), iB.z);""", """  vec3 pink = mix(vec3(1.0, 0.52, 0.72), vec3(1.0, 0.82, 0.9), iB.z);"""),
])
rw('src/world/islands.js', [
    ("  group.add(r2);", "  // (distant ridge removed: read as a palisade at the horizon)"),
    ("[-221, 89, -498, 14, 18, 0]", "[-170, 95, -530, 14, 18, 0]"),
])
rw('src/render/post.js', [
    ("""  float grooves = vnoise(vec2(tq * 5.5 + bestR.x * 100.0, sq * 0.45 + bestR.y * 50.0)) - 0.5;
  grooves += 0.5 * (vnoise(vec2(tq * 13.0 + bestR.w * 40.0, sq * 0.9)) - 0.5);""", """  float grooves = vnoise(vec2(tq * 6.0 + bestR.x * 100.0, sq * 0.45 + bestR.y * 50.0)) - 0.5;
  grooves += 0.6 * (vnoise(vec2(tq * 15.0 + bestR.w * 40.0, sq * 0.9)) - 0.5);
  grooves *= 1.35;"""),
])
s = open(R + 'src/timeline.js', encoding='utf-8').read()
s = s.replace("{ t: 22, A: [92, 0.5, 0.95, 0.75], B: [26, 0.5, 0.95, 0.45], impasto: 0.6,", "{ t: 22, A: [92, 0.5, 0.95, 0.75], B: [26, 0.5, 0.95, 0.45], impasto: 0.72,")
s = s.replace("{ t: 30, A: [104, 0.5, 1.0, 0.85], B: [28, 0.5, 1.0, 0.5], impasto: 0.7,", "{ t: 30, A: [104, 0.5, 1.0, 0.85], B: [28, 0.5, 1.0, 0.5], impasto: 0.85,")
s = s.replace("{ t: 40, A: [100, 0.5, 1.0, 0.8], B: [28, 0.5, 1.0, 0.5], impasto: 0.68,", "{ t: 40, A: [100, 0.5, 1.0, 0.8], B: [28, 0.5, 1.0, 0.5], impasto: 0.8,")
open(R + 'src/timeline.js', 'w', encoding='utf-8').write(s)
print('ok')
