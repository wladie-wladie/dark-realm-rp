# Вырезка спрайтов с пурпурного фона (#FF00FF): прозрачность, очистка розовой каймы, нарезка на объекты.
import numpy as np
from PIL import Image
from scipy import ndimage

def key_magenta(path):
    A = np.array(Image.open(path).convert("RGB")).astype(np.float32)
    r, g, b = A[..., 0], A[..., 1], A[..., 2]
    # «пурпурность»: красный и синий высокие, зелёный низкий
    mag = np.clip((np.minimum(r, b) - g) / 255.0, 0, 1)
    alpha = np.clip(1 - (mag - 0.25) / 0.35, 0, 1)          # чистый фон → 0, объект → 1
    # подавляем розовый ореол на краях: убираем избыток красного/синего над зелёным
    spill = np.clip(np.minimum(r, b) - g, 0, None) * (1 - alpha)
    out = A.copy()
    out[..., 0] -= spill * 0.9; out[..., 2] -= spill * 0.9
    a8 = (alpha * 255).astype(np.uint8)
    # мелкий мусор и одиночные пиксели
    solid = a8 > 40
    solid = ndimage.binary_opening(solid, iterations=1)
    a8 = np.where(solid, a8, 0).astype(np.uint8)
    # край чуть сжимаем, чтобы не оставалось каймы
    er = ndimage.binary_erosion(a8 > 0, iterations=1)
    a8 = np.where(er, a8, (a8 * 0.4).astype(np.uint8))
    rgba = np.dstack([np.clip(out, 0, 255).astype(np.uint8), a8])
    return Image.fromarray(rgba, "RGBA")

def parts(path, min_px=1500, dilate=6):
    im = key_magenta(path); A = np.array(im); a = A[..., 3] > 30
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=dilate))
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        m = (lab == i + 1) & a
        if m.sum() < min_px: continue
        ys, xs = np.where(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = A[y0:y1, x0:x1].copy(); crop[..., 3] = np.where(m[y0:y1, x0:x1], crop[..., 3], 0)
        out.append(dict(img=Image.fromarray(crop), x=(x0 + x1) / 2, y=(y0 + y1) / 2, w=x1 - x0, h=y1 - y0))
    # порядок: по строкам сверху вниз, в строке слева направо
    if out:
        hmed = np.median([p["h"] for p in out])
        out.sort(key=lambda p: (round(p["y"] / (hmed * 0.8)), p["x"]))
    return out
