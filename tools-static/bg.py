# Удаление «нарисованного» шахматного/белого фона, если ChatGPT не дал настоящую прозрачность.
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

def to_rgba(path):
    im = Image.open(path)
    if im.mode == "RGBA" and (np.array(im)[:, :, 3] < 24).mean() > 0.2:
        return im
    rgb = np.array(im.convert("RGB")).astype(np.int16)
    mx, mn = rgb.max(2), rgb.min(2)
    bgish = ((mx - mn) < 14) & (mx > 170)          # светлые серые/белые клетки
    lab, n = ndimage.label(bgish)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    # замкнутые участки шахматки (например, внутри натянутого лука): смесь светлых и серых клеток
    val = mx
    for i, sl in enumerate(ndimage.find_objects(lab)):
        k = i + 1
        if k in border or sl is None: continue
        m = lab[sl] == k
        n = m.sum()
        if n < 300: continue
        v = val[sl][m]
        sub = val[sl]
        alt = ((np.abs(np.diff(sub, axis=1)) > 25) & m[:, 1:] & m[:, :-1]).sum() / n  # чередование клеток
        if (v >= 248).mean() > 0.25 and alt > 0.05: bg[sl] |= m
    bg = ndimage.binary_opening(bg, iterations=1)
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    a = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    out = Image.fromarray(rgb.astype(np.uint8)).convert("RGBA"); out.putalpha(a)
    return out
