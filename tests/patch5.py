R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:80])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

rw('src/world/islands.js', [
    ("    const ridge = 1 - Math.abs(fbm(u * 9 + seed, seed, 5, seed)) * 1.7;", "    const ridge = 1 - Math.abs(fbm(u * 3.2 + seed, seed, 3, seed)) * 1.5;"),
])
rw('src/world/heightfield.js', [
    ("""  if (z < cz + 4) {
    const t = smoothstep(cz + 4, cz - 16, z);""", """  const shoreW = 16 + 150 * smoothstep(110, 230, Math.abs(x));
  if (z < cz + 4) {
    const t = smoothstep(cz + 4, cz - shoreW, z);"""),
])
rw('src/world/world.js', [
    ("""    const d = forestDensity(jx, jz);
    if (rand(n, 3) > d * 0.78) continue;""", """    const d = forestDensity(jx, jz) * (0.45 + 0.55 * Math.min(1, Math.max(0, (routeD(jx, jz) - 10) / 14)));
    if (rand(n, 3) > d * 0.78) continue;"""),
])
rw('src/world/life.js', [
    ("""  for (let k = 0; k < 240; k++) {
    const p = routeForest[Math.floor(rand(k, 41) * routeForest.length)];
    const x = p.x + (rand(k, 42) - 0.5) * 50, z = p.z + (rand(k, 43) - 0.5) * 40;""", """  for (let k = 0; k < 420; k++) {
    const p = routeForest[Math.floor(rand(k, 41) * routeForest.length)];
    const x = p.x + (rand(k, 42) - 0.5) * 34, z = p.z + (rand(k, 43) - 0.5) * 30;"""),
    ("""  float dist = length(c - cameraPosition);
  size = max(size, dist * 0.0009);""", """  float dist = length(c - cameraPosition);
  size = max(size, dist * 0.0009);
  I *= smoothstep(1.2, 3.5, dist);"""),
])
s = open(R + 'src/timeline.js', encoding='utf-8').read()
s = s.replace("hGlow: '#ff9e5c', hGlowAmt: 0.6, anti: '#e9a8c8', antiAmt: 0.35, disk: 16,", "hGlow: '#ff9e5c', hGlowAmt: 0.6, anti: '#e9a8c8', antiAmt: 0.35, disk: 6,")
s = s.replace("hGlow: '#ff4a32', hGlowAmt: 0.95, anti: '#ea8fc4', antiAmt: 0.7, disk: 18,", "hGlow: '#ff4a32', hGlowAmt: 0.95, anti: '#ea8fc4', antiAmt: 0.7, disk: 7,")
s = s.replace("hGlow: '#ff3a40', hGlowAmt: 1.0, anti: '#d878b8', antiAmt: 0.8, disk: 14,", "hGlow: '#ff3a40', hGlowAmt: 1.0, anti: '#d878b8', antiAmt: 0.8, disk: 5,")
a = s.index("  { t: 31.0, pos: [-10.5, 38.8, -261.0]")
b = s.index('];', a)
s = s[:a] + """  { t: 31.0, pos: [-10.5, 38.8, -261.0], look: [-1.5, 42.0, -293], fov: 50, roll: -0.01 },
  { t: 34.0, pos: [-10.0, 39.0, -258.0], look: [-3.0, 43.0, -296], fov: 46, roll: 0.0 },
  { t: 37.0, pos: [-8.5, 39.2, -255.5], look: [-3.5, 43.5, -298], fov: 43, roll: 0.0 },
  { t: 40.0, pos: [-7.5, 39.3, -253.5], look: [-3.8, 44.0, -300], fov: 41, roll: 0.0 },
""" + s[b:]
# time warp: video time -> animation time (music sync); anchors filled in later
s = s.replace("export const DURATION = 40;", """export const DURATION = 40;

// video time -> animation time, monotone piecewise-cubic through anchors [video, anim]
export let WARP = [[0, 0], [40, 40]];
export function setWarp(w) { WARP = w; }
export function animTime(v) {
  const W = WARP;
  if (v <= W[0][0]) return W[0][1] + (v - W[0][0]);
  if (v >= W[W.length - 1][0]) return W[W.length - 1][1] + (v - W[W.length - 1][0]);
  let i = 0; while (W[i + 1][0] < v) i++;
  const sl = k => (W[k + 1][1] - W[k][1]) / (W[k + 1][0] - W[k][0]);
  const m = k => {
    if (k === 0) return sl(0);
    if (k === W.length - 1) return sl(k - 1);
    const a = sl(k - 1), b = sl(k);
    return a * b <= 0 ? 0 : 2 / (1 / a + 1 / b);
  };
  const x0 = W[i][0], x1 = W[i + 1][0], y0 = W[i][1], y1 = W[i + 1][1], h = x1 - x0, u = (v - x0) / h;
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  return h00 * y0 + h10 * h * m(i) + h01 * y1 + h11 * h * m(i + 1);
}""")
open(R + 'src/timeline.js', 'w', encoding='utf-8').write(s)
rw('src/main.js', [
    ("import { cameraAt, todAt, styleAt, DURATION } from './timeline.js';", "import { cameraAt, todAt, styleAt, DURATION, animTime } from './timeline.js';"),
    ("""function renderAt(t, frame = 0) {
  U.uTime.value = t;""", """function renderAt(tv, frame = 0) {
  const t = animTime(tv);
  U.uTime.value = t;"""),
])
print('ok')
