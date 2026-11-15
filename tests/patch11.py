R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:80])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

# "drop" punch at the reveal (anim time 18.0): FOV breathes out, tiny shake; exposure bloom flash
rw('src/timeline.js', [
    ("""  cam.position.set(p[0] + sx, p[1] + sy, p[2]);
  cam.up.set(0, 1, 0);
  cam.lookAt(l[0], l[1], l[2]);
  cam.rotateZ(roll + Math.sin(t * 0.7) * 0.004);
  cam.fov = fov; cam.updateProjectionMatrix();""", """  const dt = t - DROP_T;
  const kick = dt > 0 ? Math.exp(-dt * 7.0) : 0;
  const shx = kick * (Math.sin(dt * 61) * 0.05 + Math.sin(dt * 37) * 0.03);
  const shy = kick * (Math.sin(dt * 53 + 1) * 0.04);
  cam.position.set(p[0] + sx + shx, p[1] + sy + shy, p[2]);
  cam.up.set(0, 1, 0);
  cam.lookAt(l[0], l[1], l[2]);
  cam.rotateZ(roll + Math.sin(t * 0.7) * 0.004 + kick * Math.sin(dt * 29) * 0.006);
  const breathe = dt > 0 ? 6.0 * (1 - Math.exp(-dt * 10)) * Math.exp(-dt * 1.1) : 0;
  cam.fov = fov + breathe; cam.updateProjectionMatrix();"""),
    ("export const DURATION = 40;", "export const DURATION = 40;\nexport const DROP_T = 18.0; // animation time of the music drop (reveal)\nexport const ARCH_T = 7.55;"),
    ("""    rayColor: new THREE.Color(1, 0.86, 0.62),
  };""", """    rayColor: new THREE.Color(1, 0.86, 0.62),
  };"""),
])
s = open(R + 'src/timeline.js', encoding='utf-8').read()
s = s.replace("""export function styleAt(t) {
  const [a, b, u] = lerpKeys(STYLE_KEYS, t);
  const L = (x, y) => x + (y - x) * u;""", """export function styleAt(t) {
  const [a, b, u] = lerpKeys(STYLE_KEYS, t);
  const L = (x, y) => x + (y - x) * u;
  const dd = t - DROP_T;
  const flash = dd > 0 ? Math.exp(-dd * 2.2) * (1 - Math.exp(-dd * 25)) : 0;""")
s = s.replace("""    rayThreshold: L(a.rayT, b.rayT), exposure: L(a.exposure, b.exposure), saturation: L(a.sat, b.sat), contrast: L(a.contrast, b.contrast),""",
              """    rayThreshold: L(a.rayT, b.rayT), exposure: L(a.exposure, b.exposure) * (1 + 0.18 * flash), saturation: L(a.sat, b.sat) * (1 + 0.08 * flash), contrast: L(a.contrast, b.contrast),""")
s = s.replace("""    bloom: L(a.bloom, b.bloom), bloomThreshold: L(a.bloomT, b.bloomT), rays: L(a.rays, b.rays),""", """    bloom: L(a.bloom, b.bloom) * (1 + 1.2 * flash), bloomThreshold: L(a.bloomT, b.bloomT), rays: L(a.rays, b.rays) * (1 + 0.8 * flash),""")
open(R + 'src/timeline.js', 'w', encoding='utf-8').write(s)
print('ok')
