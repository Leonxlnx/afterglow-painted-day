import subprocess, numpy as np, os
D = 'E:/fable/opusart3d/audio/raw/mixkit/sfx/'
SR = 22050
for f in sorted(os.listdir(D)):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', D + f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    hop = SR // 50
    n = len(x) // hop
    r = np.array([np.sqrt(np.mean(x[i*hop:(i+1)*hop]**2) + 1e-12) for i in range(n)])
    db = 20*np.log10(r + 1e-9)
    pk = np.argmax(r) * hop / SR
    # onset of biggest jump
    d = np.diff(db)
    j = (np.argmax(d) + 1) * hop / SR
    print('%-48s dur %6.2fs peak@%.2fs (%.1f dB)  biggest jump@%.2fs  mean %.1f dB' % (f, len(x)/SR, pk, db.max(), j, 20*np.log10(np.sqrt(np.mean(x**2))+1e-9)))
