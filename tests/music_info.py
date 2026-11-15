import json, os
c = json.load(open('E:/fable/opusart3d/audio/catalog.json'))
for e in c:
    if e.get('type') != 'music':
        continue
    env = e.get('envelopePerSecond') or []
    s = int(e.get('suggestedWindowStart') or 0)
    print(e.get('rank'), os.path.basename(e['file']), 'dur', round(e.get('duration', 0)), 'bpm', e.get('bpmEstimate'), 'start', s)
    print('   window env:', ' '.join(str(int(round(v))) for v in env[s:s + 42]))
