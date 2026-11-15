R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:80])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

# end fade + loading overlay progress
rw('src/main.js', [
    ("  style.fade = t < 0 ? 1 : Math.max(0, 1 - (DURATION - t) / 0.0001) * 0;", "  style.fade = THREE.MathUtils.smoothstep(tv, DURATION - 0.9, DURATION) * 0.92;"),
    ("  world = await buildWorld({ scene, renderer, quality: QUALITY, log });", """  const status = document.getElementById('status');
  const progress = (msg) => { if (status) status.textContent = msg; };
  world = await buildWorld({ scene, renderer, quality: QUALITY, log, progress });
  const loader = document.getElementById('loader'); if (loader) loader.classList.add('done');"""),
])
rw('src/world/world.js', [
    ("export async function buildWorld({ scene, renderer, quality, log }) {\n  const parts = [];", "export async function buildWorld({ scene, renderer, quality, log, progress = () => {} }) {\n  const parts = [];\n  const tick = (m) => { progress(m); return new Promise(r => setTimeout(r, 0)); };\n  await tick('Shaping the land');"),
    ("  log('terrain ok');", "  log('terrain ok');\n  await tick('Growing the meadow');"),
    ("  log(`grass ok: ${grass.totalB} blades, ${grass.totalF} flowers`);", "  log(`grass ok: ${grass.totalB} blades, ${grass.totalF} flowers`);\n  await tick('Planting trees');"),
    ("  log('ruins ok');", "  log('ruins ok');\n  await tick('Lifting the islands');"),
    ("  log('islands ok');", "  log('islands ok');\n  await tick('Waking the wind');"),
])
rw('index.html', [
    ("""<div id="ui">""", """<div id="loader"><div class="ld-title">Afterglow</div><div class="ld-sub">a painted day, rendered live</div><div id="status">Mixing paint</div></div>
<div id="ui">"""),
    ("""  #time { min-width: 44px; text-align: right; font-variant-numeric: tabular-nums; }""", """  #time { min-width: 44px; text-align: right; font-variant-numeric: tabular-nums; }
  #loader { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
            background: radial-gradient(120% 90% at 50% 100%, #ff8a5a 0%, #b45a9c 38%, #3b3a8c 75%, #1c1c46 100%); color: var(--ink);
            font: 400 15px/1.4 ui-serif, Georgia, serif; transition: opacity 1.2s ease; z-index: 5; }
  #loader.done { opacity: 0; pointer-events: none; }
  .ld-title { font-size: clamp(34px, 6vw, 64px); letter-spacing: 0.02em; font-style: italic; }
  .ld-sub { opacity: 0.8; }
  #status { margin-top: 18px; font: 500 12px/1 ui-sans-serif, system-ui, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.75; }
  body.still #loader { display: none; }"""),
])
print('ok')
