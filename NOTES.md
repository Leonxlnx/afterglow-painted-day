# opusart3d — working notes (Claude)

## Brief
Three.js painterly world in the browser + 40 s 4K video (catchy from frame 1, for X).
Style study (NOT content): (A) digital impasto oil sunsets — huge skies, low horizon, palette-knife dabs with bristle
grooves, complementary violet/blue vs orange/magenta, silhouetted trees, flower dabs; (B) flat-light anime gouache —
cerulean flat sky, yellow-green sunlit grass, crisp cast shadows, teal shadows, god rays, overgrown ruins, tiny figures
seen from behind, drifting petals/butterflies.
Audio: ONLY free professional online sources (Mixkit / Pixabay / CC0), credits in audio/CREDITS.md.

## Concept — "Follow the red kite" (one continuous take, a day passing in 40 s)
- 0–8 s  late-morning meadow glide low over grass/flowers along a river; red kite far ahead above a hill; viaduct ruin.
- ~8 s   fly through a viaduct arch (shadow → light pop).
- 9–19 s rising meadow → sunlit forest (god rays, dappled light, butterflies, dust), light warms.
- ~20 s  burst out above the canopy edge → reveal: hilltop, sea, floating islands, sunset sky blazing.
- 22–34  climax: arc around hilltop: great tree, child flying the red kite, petals swirling, birds, impasto sky.
- 34–40  dusk: sun dips, violet/magenta afterglow, fireflies rise, first stars, final composed frame.
Style morphs with time of day: day = gouache/anime (smaller strokes, flat), sunset = impasto oil (big strokes, ridges).

## Tech
- three r181, plain ES modules + importmap, `node render/server.mjs` serves; `render/render.mjs` = puppeteer-core +
  system Chrome (ANGLE D3D11 on Radeon 780M) → raw RGBA POST → ffmpeg.
- Main pass: MRT (att0 RGBA16F color, att1 RGBA32F: paint-space P.xy, region id, view depth), MSAA 4x.
- Post: structure tensor + anisotropic Kuwahara (half res) → anchored stroke pass (strokes live in per-surface paint
  space P, so they stick to the world; 2 layers x 2 octaves; stroke colour sampled at stroke centre) → impasto emboss,
  bloom, god rays, grading, soft tonemap, dither. Pixel sizes scale with uPxScale = height/2160.
- Custom cascaded sun shadow maps (2 cascades), custom toon lighting with coloured shadows, aerial perspective via
  shared skyColor().
- Heavy passes tiled with scissor to avoid Windows TDR on the iGPU.

## Files
- src/main.js (modes: ?mode=demo|still, w,h,q) · src/timeline.js (CAM_KEYS, TOD_KEYS palettes, STYLE_KEYS)
- src/render/{materials.js (U uniforms, lighting GLSL, makeMaterial MRT, writeOut/writeGlow), post.js (Painter), shadows.js}
- src/world/{heightfield.js (terrain fn, coastZ, RIVER/FOOTPATH, hNear grid), terrain, sky (dome + cumulus spheres),
  water (planar refl), grass (blades+flowers), trees (generator, leaf atlas, createFoliage), ruins (viaduct, drums, vines),
  islands (floating islands, sea stacks, ridge), life (petals, fireflies, dust, beams, butterflies, birds, kid, kite), world.js}
- render/render.mjs: `node render/render.mjs stills --times 0,8 --w 960 --h 540 --out out/x --tag a` ;
  `seq --from 0 --to 40 --fps 30 --w 3840 --h 2160 --out out/v.mp4`. render/contact.py <dir> <prefix> <out> [cols] [w]
- Python patches in tests/patchN.py (write python to a file; inline heredocs with quotes broke bash once).
- World build ~45 s, 1080p frame ~0.5 s render.

## Music decision (analysis only, can't listen)
Track: audio/raw/mixkit/music/we-will-get-it_eugenio-mininni.mp3 (Mixkit free license, no attribution).
Onsets/bars: 4-beat bar = 3.11 s (77 BPM). Near-silent breath 179.5–183.5 s, massive hit at 183.87 s.
Plan: video start S = 164.39 (strong onset) → silence = video 15.1–19.1 (forest), DROP at video 19.48 (forest exit/reveal),
post-drop accents at video 21.8, 22.6, 25.73, 28.82, 31.95, 34.27, 38.2. Arch pass onset ~8.59. Fade out 36.5–40.
SFX: reverse impact swell into the drop; wind/birds/stream ambience; whooshes at arch.

## Progress log
- 01:05 project set up, capability probe OK (RGBA32F MSAA x4/x8 ok, max tex 16384).
- 03:05 full world + timeline working, contact sheets out/sheet1..4.png. Remaining: forest too dark, sun disk hard,
  right headland cliff looks like a curtain, ending composition, time-warp for music sync, 4K tests, audio mix.
- 02:45 art-direction review applied (patch12/13): deeper sunset values, real dusk, pink blossom tree, painted kid,
  sky strokes sweep toward sun, far strokes horizontal, birds burst on the drop, hero cumulus towers, end fade.
  NOTE: machine is shared with another project (Blender weapon build + 3 puppeteer tools/shot.mjs harbor renders)
  -> my renders ~3x slower. Don't kill their processes. Final 4K: decide 30 vs 60 fps by measured throughput.
  render/final.mjs = full pipeline (render 4K, mix, mux master, X 4K + X 1080p versions).
- Final plan: iterate visuals until ~06:30, then render 4K60 in 4 chunks (render.mjs seq --from/--to per 10 s),
  concat with ffmpeg concat demuxer, mux audio, make X versions. Re-render single chunks if needed.
- 03:15 capture rewritten: window.__renderRange renders the whole range in-page, uploads pipelined (3 in flight),
  server re-orders by frame index; h264_amf (VCN) encoding (--codec amf). 540p: 0.42 s/f. Chunk 0 restarted 03:14.
  Ending reframed (kid lower third). Birds = dark silhouettes. Poster: deliver/poster_4k_t30.png
- 04:52 v1 assembled: out/final/afterglow_master_4k60.mp4 (4.1 GB), afterglow_X_4k60.mp4 (229 MB), afterglow_X_1080p60.mp4 (121 MB).
  Review #2 score 6.5/10 -> v3 patch14: no waterfalls (ghost pillars), lit islands, crisper forest shafts, kid x1.25 + rim,
  big sky strokes in day, painted V-sprite birds (+ opening flyover), pink blossom tree, petals stream to kid, grass detail
  threshold up at sunset, faster opening, framing 31-34 s. 05:15 v3 render started -> out/final_v3 (OUTDIR env).
  Assemble: PYTHON=E:\fable\motionvideo\.venv\Scripts\python.exe OUTDIR=out/final_v3 node render/chunks.mjs assemble

## HOW TO CONTINUE (if context was compacted)
- State 05:05: v1 delivered as fallback (deliver/afterglow_v1_X_1080p60.mp4, poster). v3 rendering (bg) into out/final_v3.
- After v3 chunks: `PYTHON=E:\fable\motionvideo\.venv\Scripts\python.exe OUTDIR=out/final_v3 node render/chunks.mjs assemble`
  -> afterglow_master_4k60.mp4, afterglow_X_4k60.mp4, afterglow_X_1080p60.mp4 in out/final_v3. Copy best to deliver/.
- Snapshots (1/s, 4K PNG) land in <OUTDIR>/frames; contact: `python render/contact.py <dir> f0 out/x.png 5 384`.
- Reviews: spawn opus subagent (effort high) with references images 1-15 (C:\Users\User\AppData\Local\Temp\claude\
  d3c424448859fa48\89d536ff-e019-43a2-a1a3-25f3ee073de8\images\N.jpg) + frames; it saves my context.
- Other project shares the machine (Blender + tools/shot.mjs + tools/render.mjs) — never kill those.
- Waiting loops: never grep chunks.log for FAILED (old entries) — wait for "video written" lines in the per-run log.
- Remaining TODO: test browser demo (node render/server.mjs, port 8787, built-in browser) when GPU is free;
  final summary to user in German; SendUserFile the X 1080p + poster (status proactive).
- User budget: weekly limit can be used heavily (user wants ~1-2% left); deadline ~14:00 local.
- 06:10 v3 chunks done (out/final_v3), assembling. v4 = v3 + blossom-branch opening (world.js "opening hook") + kid arm tug
  (life.js flutter<0). v4 chunk 0 rendering into out/final_v4. Review #3 running. Chunk ports: 8790+i -> use 8788 for stills.
- 06:40 review #3: 7.5/10. v4 patch15: gull sprite birds (banked, capped size), dusk blue-violet + yellow-green fireflies,
  petals off at dusk, end push-in, warmer forest + light pools, island trees lighter (isl_* kinds), pom-pom island removed,
  blossom mostly pink, sturdier legs, pier stone contrast, flowers not glowing at dusk. v4 render started 06:40 -> out/final_v4.
  Poster recommendation: frame f01560 (26 s).
- 07:20 v4 assembled (out/final_v4, copied to deliver/afterglow_v4_*). Review #4: 8.0/10.
- 07:55 v5 (patch16 + bough opening): few warm-dark gull birds (RID_GLOW, no stroke grain), tiny low fireflies,
  no dusk petals, darker dusk flowers, bluer dusk zenith, fully pink blossom tree (uPale for sakura boughs), opening
  bough (TubeGeometry + pale blossoms). v5 render+assemble running -> out/final_v5 (bztu8gy6x).
  DON'T edit src/ while chunks render (each chunk reloads code).
- 08:30 v5 assembled (deliver/afterglow_v5_X_1080p60.mp4). Review #5: 8.0 (birds/tree fixed; boughs looked like poles; fireflies invisible).
- 08:45 v6 (patch17): organic kinked tapered boughs + pale sakura along them; fireflies = post-paint overlay scene
  (world.overlay rendered after painter.render, occluded via aux distance); dusk clouds more opaque.
  Rendering only chunks 0 and 3 into out/final_v6, chunks 1-2 copied from v5; then assemble.
- 09:04 v6 assembled (deliver/afterglow_v6_X_1080p60.mp4). Review #6: 8.0 (opening good; ghost = far island D; fireflies too small).
- 09:15 v7: island D removed, fireflies x1.6 size / 80 / more yellow-green, opening blossoms kept above y 3.1.
  Full re-render of all chunks -> out/final_v7 (b4g0xbebk). Then: poster from master at f01800 (30 s) and f01740,
  move older versions into deliver/older, final summary + SendUserFile.
- 10:05 FINAL v7 assembled: deliver/afterglow_X_4k60.mp4, afterglow_X_1080p60.mp4, posters (t30 recommended), LIESMICH.md.
  QA: chunk seams OK, drop at 19.41 s in final audio. Review #7 (sign-off) running.
- 10:25 sign-off review: 8.0, one fix: dusk "ghost cone" = far cumulus cluster edges -> clouds dissolve into sky after
  sunset (sky.js dusk*0.9). v8 = v7 chunks 0-2 + new chunk 3 -> out/final_v8 (b8o0yccuk). Debug URL params: noclouds=1.
  X caption idea: "Noon to dusk in 40 seconds: a river, a forgotten viaduct, and one red kite. #threejs"
- 10:45 DONE. Final = v8: deliver/afterglow_X_4k60.mp4, deliver/afterglow_X_1080p60.mp4, master out/final_v8/afterglow_master_4k60.mp4,
  posters (t30 recommended), LIESMICH.md. Demo verified headless (no errors, dynamic res). Superseded renders in
  out/final*, out/final_v3..v7 (~25 GB) can be deleted.
