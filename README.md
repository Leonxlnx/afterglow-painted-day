# Afterglow — a painted day

A 40-second journey through a hand-painted-looking world, rendered live with three.js:
a river under an overgrown viaduct at noon, a sunlit forest, and a hilltop at sunset where a child flies a red kite
while floating islands drift over the sea. The look is built from scratch: a painterly post pipeline
(structure tensor → anisotropic Kuwahara → world-anchored brush strokes with impasto relief) on top of
toon lighting with coloured shadows, so the strokes stick to the world instead of swimming over it.

## Run the browser demo

```bash
node render/server.mjs
```

Then open http://localhost:8787 and press **Play with sound**. Space pauses, the slider scrubs.
Building the world takes 20–60 s on first load. `?scale=0.5` renders at half the window resolution on slower GPUs.

## Render the film

```bash
node render/render.mjs seq --from 0 --to 40 --fps 60 --w 3840 --h 2160 --out out/master_4k60_video.mp4
python render/mix_audio.py out/soundtrack.wav
```

Stills for look development: `node render/render.mjs stills --times 0,8,20 --w 1920 --h 1080 --out out/stills`.

## Audio

Music and sound effects are from Mixkit (free licence, no attribution required). Sources and licence links are in
`audio/CREDITS.md`. The cut starts the music at 164.39 s so that its breath lands in the forest and the big hit lands
on the reveal at 19.5 s.

## Layout

- `src/render/` — shared lighting, MRT material factory, shadows, painterly post (`post.js`)
- `src/world/` — terrain, sky, water, grass, trees, ruins, islands, living details
- `src/timeline.js` — camera keys, time-of-day palettes, painting style keys, music time-warp
- `render/` — static server, headless-Chrome renderer, audio mix
