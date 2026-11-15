R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:80])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

rw('src/render/post.js', [
    ("""uniform float uFade; // 0..1 fade to black (start/end)""", """uniform float uFade; // 0..1 fade to black (start/end)
uniform mat4 uInvViewProj; uniform vec3 uCamPos; uniform mat4 uVPa; uniform mat4 uVPb; uniform float uBlur;"""),
    ("""  ivec2 ip = ivec2(gl_FragCoord.xy);
  vec4 pc = P(ip);
  vec3 col = pc.rgb;""", """  ivec2 ip = ivec2(gl_FragCoord.xy);
  vec4 pc = P(ip);
  vec3 col = pc.rgb;
  // ---- camera motion blur (shutter interval reprojected through the painted image) ----
  if (uBlur > 0.0) {
    vec4 ax = texelFetch(tAux, ip, 0);
    vec4 pw = uInvViewProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec3 dir = normalize(pw.xyz / pw.w - uCamPos);
    vec3 wp = uCamPos + dir * max(ax.w, 0.1);
    vec4 ca = uVPa * vec4(wp, 1.0), cb = uVPb * vec4(wp, 1.0);
    if (ca.w > 0.01 && cb.w > 0.01) {
      vec2 dv = ((cb.xy / cb.w) - (ca.xy / ca.w)) * 0.5 * uRes * uBlur;
      float L = length(dv);
      if (L > 1.0) {
        dv *= min(1.0, 160.0 * uPxScale / L);
        int N = int(min(32.0, ceil(length(dv) / (1.5 * max(uPxScale, 0.5)))) );
        vec3 acc = vec3(0.0); float wsum = 0.0;
        float jit = h21(gl_FragCoord.xy + uFrame) - 0.5;
        for (int i = 0; i < 32; i++) {
          if (i >= N) break;
          float f = (float(i) + 0.5 + jit) / float(N) - 0.5;
          vec2 sp = gl_FragCoord.xy + dv * f;
          float w = 1.0 - abs(f) * 0.6;
          acc += P(ivec2(sp)).rgb * w; wsum += w;
        }
        col = acc / wsum;
      }
    }
  }"""),
    ("""        uVignette: { value: 0.22 }, uGrain: { value: 0.006 }, uFade: { value: 0 },""", """        uVignette: { value: 0.22 }, uGrain: { value: 0.006 }, uFade: { value: 0 },
        uInvViewProj: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() }, uVPa: { value: new THREE.Matrix4() }, uVPb: { value: new THREE.Matrix4() }, uBlur: { value: 0 },"""),
    ("""  render(sceneRT, P, { sunUv = new THREE.Vector2(0.5, 0.9), sunVisible = 0, frame = 0, time = 0, tiles = 1 } = {}) {""", """  render(sceneRT, P, { sunUv = new THREE.Vector2(0.5, 0.9), sunVisible = 0, frame = 0, time = 0, tiles = 1, blur = null } = {}) {"""),
    ("""    c.uVignette.value = P.vignette; c.uGrain.value = P.grain; c.uFade.value = P.fade || 0;""", """    c.uVignette.value = P.vignette; c.uGrain.value = P.grain; c.uFade.value = P.fade || 0;
    if (blur) { c.uInvViewProj.value.copy(blur.invVP); c.uCamPos.value.copy(blur.camPos); c.uVPa.value.copy(blur.vpA); c.uVPb.value.copy(blur.vpB); c.uBlur.value = blur.amount; }
    else c.uBlur.value = 0;"""),
])
rw('src/main.js', [
    ("""const tmpV = new THREE.Vector3();
function renderAt(tv, frame = 0) {""", """const tmpV = new THREE.Vector3();
const blurCam = new THREE.PerspectiveCamera();
let SHUTTER = { fps: +(params.get('fps') || 60), angle: +(params.get('shutter') || 180) };
window.__setShutter = (fps, angle) => { SHUTTER = { fps, angle }; };
function vpAt(tv, out) {
  blurCam.aspect = camera.aspect; cameraAt(animTime(tv), blurCam);
  blurCam.updateMatrixWorld(); blurCam.updateProjectionMatrix();
  return out.multiplyMatrices(blurCam.projectionMatrix, blurCam.matrixWorldInverse);
}
function renderAt(tv, frame = 0) {"""),
    ("""  painter.render(mainRT, style, { sunUv, sunVisible, frame, time: t, tiles: QUALITY === 'demo' ? 1 : 4 });""", """  let blur = null;
  if (SHUTTER.angle > 0 && MODE !== 'demo') {
    const half = (SHUTTER.angle / 360) / SHUTTER.fps / 2;
    const invVP = new THREE.Matrix4().multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse);
    blur = { invVP, camPos: camera.position.clone(), vpA: vpAt(tv - half, new THREE.Matrix4()), vpB: vpAt(tv + half, new THREE.Matrix4()), amount: 1 };
  }
  painter.render(mainRT, style, { sunUv, sunVisible, frame, time: t, tiles: QUALITY === 'demo' ? 1 : 4, blur });"""),
])
print('ok')
