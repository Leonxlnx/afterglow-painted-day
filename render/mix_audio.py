# Build the 40 s soundtrack: Mixkit music (trimmed so the drop lands on the reveal) + layered Mixkit SFX.
# usage: python render/mix_audio.py [out.wav]
import subprocess, sys
A = 'E:/fable/opusart3d/audio/raw/mixkit/'
M = A + 'music/we-will-get-it_eugenio-mininni.mp3'
S = A + 'sfx/'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'E:/fable/opusart3d/out/soundtrack.wav'
DUR = 40.0
MUSIC_START = 164.39   # strong onset; the breath (179.5-183.5) lands in the forest, the hit (183.87) at video 19.48

# (file, start_in_video, file_offset, length, gain, fade_in, fade_out, extra_filter)
layers = [
    ('music', 0.0, MUSIC_START, DUR, 1.0, 0.04, 5.0, 'musicfade'),
    (S + 'wind-blowing-ambience.wav', 0.0, 2.0, DUR, 0.30, 0.6, 3.0, ''),
    (S + 'stream-water-flowing-ambience-loop.wav', 0.0, 6.0, 11.5, 0.65, 0.3, 3.0, ''),
    (S + 'morning-birds.wav', 0.0, 30.0, 13.0, 0.40, 0.4, 3.0, ''),
    (S + 'forest-birds-ambience.wav', 11.0, 57.3, 10.5, 2.6, 2.0, 2.0, ''),
    (S + 'breeze-through-the-trees.wav', 12.0, 3.0, 8.5, 0.55, 1.5, 2.0, ''),
    (S + 'rustle-dry-leaves-rustling.wav', 12.4, 0.0, 1.3, 0.9, 0.01, 0.4, ''),
    (S + 'whoosh-deep-air-woosh.wav', 8.59 - 0.48, 0.0, 2.98, 0.75, 0.02, 1.0, ''),
    (S + 'impact-reverse-cinematic-impact-trailer.wav', 19.48 - 9.66, 0.0, 9.66, 0.55, 3.0, 0.02, 'areverse'),
    (S + 'impact-cinematic-impact-waves.wav', 19.48 - 0.18, 0.0, 7.78, 0.5, 0.01, 3.0, ''),
    (S + 'shimmer-magical-light-sweep.wav', 19.6, 0.0, 4.75, 0.55, 0.05, 1.5, ''),
    (S + 'whoosh-transition-windy-swoosh.wav', 25.73 - 1.02, 0.0, 3.2, 0.32, 0.05, 1.0, ''),
    (S + 'shimmer-relaxing-harp-sweep.wav', 31.95 - 1.92, 0.0, 6.33, 0.32, 0.3, 2.0, ''),
    (S + 'shimmer-magic-astral-sweep.wav', 34.27 - 0.42, 0.0, 4.03, 0.28, 0.05, 2.0, ''),
]

inputs, chains = [], []
for i, (f, start, off, length, gain, fin, fout, extra) in enumerate(layers):
    src = M if f == 'music' else f
    inputs += ['-i', src]
    flt = []
    if extra == 'areverse':
        # reverse the impact so its tail swells INTO the hit (classic reverse-cymbal), keep up to the transient
        flt.append('areverse')
        flt.append('atrim=start=%.3f:duration=%.3f' % (10.08 - length, length))
    else:
        flt.append('atrim=start=%.3f:duration=%.3f' % (off, length))
    flt.append('asetpts=PTS-STARTPTS')
    flt.append('aformat=sample_rates=48000:channel_layouts=stereo')
    flt.append('afade=t=in:st=0:d=%.3f' % fin)
    flt.append('afade=t=out:st=%.3f:d=%.3f:curve=%s' % (max(0, length - fout), fout, 'hsin' if extra == 'musicfade' else 'exp'))
    flt.append('volume=%.3f' % gain)
    flt.append('adelay=%d|%d' % (int(start * 1000), int(start * 1000)))
    flt.append('apad=whole_dur=%.3f' % DUR)
    chains.append('[%d:a]%s[a%d]' % (i, ','.join(flt), i))
mix = ''.join('[a%d]' % i for i in range(len(layers)))
graph = ';'.join(chains) + ';%samix=inputs=%d:normalize=0:dropout_transition=0,atrim=0:%.3f,loudnorm=I=-14:TP=-1.2:LRA=11:linear=true[out]' % (mix, len(layers), DUR)
cmd = ['ffmpeg', '-y', '-v', 'error'] + inputs + ['-filter_complex', graph, '-map', '[out]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', OUT]
r = subprocess.run(cmd, capture_output=True, text=True)
print(r.stderr[-2000:] if r.returncode else 'wrote ' + OUT)
# report loudness
r = subprocess.run(['ffmpeg', '-v', 'info', '-i', OUT, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
print('\n'.join(l for l in r.stderr.splitlines()[-14:] if l.strip()))
