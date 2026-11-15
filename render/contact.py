# usage: python render/contact.py <dir> <prefix> <out.png> [cols] [thumbW]
import sys, os
from PIL import Image, ImageDraw
d, prefix, out = sys.argv[1], sys.argv[2], sys.argv[3]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 4
tw = int(sys.argv[5]) if len(sys.argv) > 5 else 640
files = sorted(f for f in os.listdir(d) if f.startswith(prefix) and f.endswith('.png'))
ims = [Image.open(os.path.join(d, f)).convert('RGB') for f in files]
th = int(ims[0].height * tw / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + 4), rows * (th + 4)), 'white')
dr = ImageDraw.Draw(sheet)
for i, (im, f) in enumerate(zip(ims, files)):
    x, y = (i % cols) * (tw + 4), (i // cols) * (th + 4)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y))
    dr.rectangle([x, y, x + 70, y + 16], fill='black'); dr.text((x + 3, y + 2), f.replace(prefix, '').replace('.png', ''), fill='white')
sheet.save(out)
print(out, sheet.size)
