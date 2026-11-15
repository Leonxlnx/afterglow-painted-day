R = 'E:/fable/opusart3d/'
def rw(p, pairs):
    s = open(R + p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, ':', a[:80])
        s = s.replace(a, b)
    open(R + p, 'w', encoding='utf-8').write(s)

rw('src/main.js', [
    ("""function startDemoUI() {
  const ui = document.getElementById('ui');
  ui.style.display = 'flex';
  const bar = document.getElementById('bar'), play = document.getElementById('play'), time = document.getElementById('time');
  let playing = true, t = +(params.get('t') || 0), last = performance.now();
  play.onclick = () => { playing = !playing; play.textContent = playing ? '❚❚' : '▶'; };
  bar.oninput = () => { t = +bar.value / 1000 * DURATION; };
  addEventListener('keydown', e => { if (e.code === 'Space') play.onclick(); });
  const loop = () => {
    const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (playing) { t += dt; if (t > DURATION) t = 0; }""", """function startDemoUI() {
  const ui = document.getElementById('ui');
  const bar = document.getElementById('bar'), play = document.getElementById('play'), time = document.getElementById('time');
  const audio = new Audio('./audio/soundtrack.m4a'); audio.preload = 'auto';
  let playing = false, t = +(params.get('t') || 0), last = performance.now();
  const setPlaying = (p) => {
    playing = p; play.textContent = playing ? '❚❚' : '▶';
    if (playing) { audio.currentTime = t; audio.play().catch(() => {}); } else audio.pause();
  };
  play.onclick = () => setPlaying(!playing);
  bar.oninput = () => { t = +bar.value / 1000 * DURATION; audio.currentTime = t; };
  addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); play.onclick(); } });
  const enter = document.getElementById('enter');
  if (enter) { enter.style.display = 'inline-block'; enter.onclick = () => { document.getElementById('loader').classList.add('done'); ui.style.display = 'flex'; setPlaying(true); }; }
  else { ui.style.display = 'flex'; setPlaying(true); }
  const loop = () => {
    const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (playing) {
      if (!audio.paused && audio.readyState >= 2) t = audio.currentTime; else t += dt;
      if (t >= DURATION - 0.02) { t = 0; audio.currentTime = 0; if (playing) audio.play().catch(() => {}); }
    }"""),
    ("""  world = await buildWorld({ scene, renderer, quality: QUALITY, log, progress });
  const loader = document.getElementById('loader'); if (loader) loader.classList.add('done');""", """  world = await buildWorld({ scene, renderer, quality: QUALITY, log, progress });
  const loader = document.getElementById('loader');
  if (loader && MODE !== 'demo') loader.classList.add('done');
  progress('Ready');"""),
])
rw('index.html', [
    ("""<div id="status">Mixing paint</div></div>""", """<div id="status">Mixing paint</div><button id="enter">Play with sound</button></div>"""),
    ("""  body.still #loader { display: none; }""", """  body.still #loader { display: none; }
  #enter { display: none; margin-top: 14px; padding: 12px 22px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.55);
           background: rgba(255,255,255,0.12); color: var(--ink); font: 500 14px/1 ui-sans-serif, system-ui, sans-serif; cursor: pointer;
           backdrop-filter: blur(6px); transition: background 0.2s ease, transform 0.2s ease; }
  #enter:hover { background: rgba(255,255,255,0.24); transform: translateY(-1px); }"""),
])
print('ok')
