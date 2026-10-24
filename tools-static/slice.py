# Нарезка листа спрайтов (прозрачный фон) на отдельные объекты.
import sys, json
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage

def slice_sheet(path, min_px=400, dilate=6):
    sys.path.insert(0, __import__("os").path.dirname(__file__))
    from bg import to_rgba
    im = to_rgba(path)
    a = np.array(im)[:, :, 3] > 24
    mask = ndimage.binary_dilation(a, iterations=dilate)
    lab, n = ndimage.label(mask)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        ys, xs = sl
        sub = (lab[ys, xs] == i + 1) & a[ys, xs]
        if sub.sum() < min_px: continue
        crop = np.array(im)[ys, xs].copy()
        crop[:, :, 3] = np.where(sub, crop[:, :, 3], 0)
        # обрезка до непрозрачных пикселей
        yy, xx = np.where(crop[:, :, 3] > 8)
        crop = crop[yy.min():yy.max() + 1, xx.min():xx.max() + 1]
        out.append(dict(x=xs.start + int(xx.min()), y=ys.start + int(yy.min()), img=Image.fromarray(crop)))
    out.sort(key=lambda o: (o["y"] // 150, o["x"]))
    return out

if __name__ == "__main__":
    parts = slice_sheet(sys.argv[1])
    W = 1400; sheet = Image.new("RGBA", (W, 1100), (60, 60, 70, 255)); d = ImageDraw.Draw(sheet)
    x = y = 10; rowh = 0
    for i, p in enumerate(parts):
        im = p["img"]; im.thumbnail((240, 240))
        if x + im.width > W: x = 10; y += rowh + 30; rowh = 0
        sheet.alpha_composite(im, (x, y)); d.text((x + 2, y + im.height + 2), f"{i} {p['img'].size}", fill="white")
        x += im.width + 20; rowh = max(rowh, im.height)
    sheet.save(sys.argv[2]); print(len(parts))
