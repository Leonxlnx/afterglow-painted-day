R = 'E:/fable/opusart3d/'
p = R + 'src/world/islands.js'
s = open(p, encoding='utf-8').read()
a = s.index('  const ISL = [')
b = s.index('  ];', a) + 4
s = s[:a] + """  const ISL = [
    // x, y, z, radius, depth, waterfall
    [-195, 110, -735, 36, 60, 1], [329, 186, -871, 46, 80, 1], [-234, 190, -552, 14, 26, 0], [-209, 195, -1738, 60, 90, 1],
    [395, 337, -2112, 55, 90, 0], [167, 102, -452, 12, 24, 1], [-520, 260, -1250, 40, 70, 0], [700, 240, -1500, 38, 70, 1],
  ];""" + s[b:]
a = s.index('  const STK = [')
b = s.index('];', a) + 2
s = s[:a] + "  const STK = [[-72, -332, 6.5, 46], [58, -362, 4.8, 30], [-142, -405, 8.5, 60], [150, -425, 7.5, 40]];" + s[b:]
s = s.replace("""    const ridge = Math.abs(fbm(i * 0.035 + seed, seed, 5, seed));
    const h = hMax * (0.25 + 0.9 * Math.pow(1 - ridge * 1.6, 2) * (0.6 + 0.4 * Math.sin(i * 0.02 + seed)));""",
"""    const u = i / segs;
    const ridge = 1 - Math.abs(fbm(u * 9 + seed, seed, 5, seed)) * 1.7;
    const massif = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(u * Math.PI * 3.0 + seed)), 2);
    const h = hMax * (0.12 + 0.88 * Math.max(0, ridge) ** 2 * massif);""")
s = s.replace("""  const r1 = applyMat(new THREE.Mesh(ridgeGeometry(4200, -1.15, 1.15, 420, 3.3)), far);
  const r2 = applyMat(new THREE.Mesh(ridgeGeometry(7200, -1.25, 1.25, 900, 7.1)), far);
  r1.position.z = r2.position.z = -260;
  group.add(r1, r2);""", """  const r2 = applyMat(new THREE.Mesh(ridgeGeometry(7000, -1.2, 1.2, 760, 7.1, 520)), far);
  r2.position.z = -260;
  group.add(r2);""")
s = s.replace("uniforms: { uBob: { value: 0 }, uRockA: { value: new THREE.Color('#6e6a8a') }, uRockB: { value: new THREE.Color('#8f8aa6') }, uFar: { value: 1 } } });",
              "uniforms: { uBob: { value: 0 }, uRockA: { value: new THREE.Color('#4e4e7e') }, uRockB: { value: new THREE.Color('#6c6898') }, uFar: { value: 1 } } });")
open(p, 'w', encoding='utf-8').write(s)
print('ok')
