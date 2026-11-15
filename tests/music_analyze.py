import subprocess, numpy as np, os, sys
D = 'E:/fable/opusart3d/audio/raw/mixkit/music/'
SR = 22050
def load(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', D + f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
hop = SR // 4  # 0.25 s
for f in sorted(os.listdir(D)):
    x = load(f)
    n = len(x) // hop
    rms = np.array([np.sqrt(np.mean(x[i*hop:(i+1)*hop]**2) + 1e-12) for i in range(n)])
    db = 20*np.log10(rms + 1e-9)
    # spectral centroid & high-band energy
    cent = []; hi = []; flux = []; prev = None
    for i in range(n):
        seg = x[i*hop:(i+1)*hop] * np.hanning(hop)
        S = np.abs(np.fft.rfft(seg))
        fr = np.fft.rfftfreq(hop, 1/SR)
        cent.append((S*fr).sum()/(S.sum()+1e-9))
        hi.append(20*np.log10(S[fr > 4000].sum()+1e-9))
        if prev is not None: flux.append(np.maximum(S - prev, 0).sum())
        else: flux.append(0)
        prev = S
    cent = np.array(cent); hi = np.array(hi); flux = np.array(flux)
    sm = np.convolve(db, np.ones(8)/8, mode='same')
    lift = sm[8:] - sm[:-8]
    top = np.argsort(-lift)[:6]
    print('==', f, 'dur %.1fs' % (len(x)/SR))
    print('   biggest 2s lifts at (s):', ', '.join('%.1f(+%.1fdB)' % ((i+8)*0.25, lift[i]) for i in sorted(top)))
    # print 1-second summary: db, centroid
    sec = [(int(round(np.mean(db[i:i+4]))), int(np.mean(cent[i:i+4])/100)) for i in range(0, n-3, 4)]
    print('   per-second dB/centroid(100Hz):')
    for k in range(0, len(sec), 20):
        print('   %3d: ' % k + ' '.join('%d/%d' % s for s in sec[k:k+20]))
