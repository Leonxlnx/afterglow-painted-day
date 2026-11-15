import subprocess, numpy as np
F = 'E:/fable/opusart3d/audio/raw/mixkit/music/we-will-get-it_eugenio-mininni.mp3'
SR = 22050
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', F, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
hop = 220  # ~10 ms
win = 1024
n = (len(x) - win) // hop
spec_prev = None
flux = np.zeros(n); rms = np.zeros(n)
w = np.hanning(win)
for i in range(n):
    seg = x[i*hop:i*hop+win] * w
    S = np.log1p(np.abs(np.fft.rfft(seg)) * 10)
    if spec_prev is not None: flux[i] = np.maximum(S - spec_prev, 0).sum()
    spec_prev = S
    rms[i] = np.sqrt(np.mean(seg**2))
t = np.arange(n) * hop / SR
def region(a, b):
    m = (t >= a) & (t < b); return t[m], flux[m], rms[m]
# tempo from autocorrelation over 100-180s (full section)
tt, ff, rr = region(100, 178)
f0 = ff - np.convolve(ff, np.ones(50)/50, mode='same')
ac = np.correlate(f0, f0, mode='full')[len(f0)-1:]
lags = np.arange(len(ac)) * hop / SR
m = (lags > 0.35) & (lags < 1.0)
best = lags[m][np.argmax(ac[m])]
print('beat period %.4f s -> %.2f BPM' % (best, 60/best))
# refine with finer search
period = best
# phase: fold onsets
phases = np.linspace(0, period, 200, endpoint=False)
score = [np.sum(np.interp((np.arange(100, 178, period) + p), t, flux)) for p in phases]
ph = phases[int(np.argmax(score))]
print('beat phase (first beat after 100s): %.3f' % (100 + ph))
# strongest onsets 150-210
tt, ff, rr = region(150, 210)
idx = np.argsort(-ff)[:40]
print('strongest onsets 150-210s:', ' '.join('%.2f' % v for v in sorted(tt[idx])))
# rms every 0.5 s 175-190
for a in np.arange(176, 190, 0.5):
    m = (t >= a) & (t < a + 0.5)
    print('%.1f rms %.1f dB flux %.1f' % (a, 20*np.log10(rms[m].mean()+1e-9), flux[m].max()))
# beats grid 160-205
beats = 100 + ph + period * np.arange(0, 200)
beats = beats[(beats > 160) & (beats < 206)]
print('beats 160-206:', ' '.join('%.2f' % b for b in beats))
