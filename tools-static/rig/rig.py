# Cutout-риг: персонаж собирается из отдельных частей (ChatGPT рисует детали),
# кости вращаются, кадры рендерятся в обычный лист 320×300.
import math, os
from PIL import Image

HERE = os.path.dirname(__file__)

class Part:
    def __init__(self, folder, name, p, d, darken=0.0, pts=None, scale=1.0):
        im = Image.open(os.path.join(HERE, folder, name + ".png")).convert("RGBA")
        if scale != 1:
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
            p = (p[0] * scale, p[1] * scale); d = (d[0] * scale, d[1] * scale)
        if darken:
            r, g, b, a = im.split()
            f = lambda v: int(v * (1 - darken))
            im = Image.merge("RGBA", (r.point(f), g.point(f), b.point(f), a))
        self.name, self.im, self.p, self.d, self.pts = name, im, p, d, pts or {}
        self.a0 = math.degrees(math.atan2(d[1] - p[1], d[0] - p[0]))
        self._cache = {}

class Canvas:
    def __init__(self, w, h, k, margin=600):
        self.k, self.m = k, margin
        self.im = Image.new("RGBA", (w + 2 * margin, h + 2 * margin))
        self.w, self.h = w, h
        self.placed = {}

    def put(self, part, at, ang):
        """Деталь: точка p в at (координаты кадра), направление p→d под углом ang (0 вправо, 90 вниз)."""
        k = self.k
        key = (round(ang * 4),)
        rot = ang - part.a0
        if k not in part._cache:
            im = part.im.resize((max(1, round(part.im.width * k)), max(1, round(part.im.height * k))), Image.LANCZOS)
            pad = int(math.hypot(im.width, im.height)) + 4
            big = Image.new("RGBA", (pad * 2, pad * 2))
            big.paste(im, (round(pad - part.p[0] * k), round(pad - part.p[1] * k)))
            part._cache[k] = (big, pad)
        big, pad = part._cache[k]
        r = big.rotate(-rot, resample=Image.BICUBIC, center=(pad, pad))
        self.im.alpha_composite(r, (round(at[0] - pad + self.m), round(at[1] - pad + self.m)))
        self.placed[part.name] = (part, at, rot)

    def world(self, part, q, at, ang):
        """Где окажется точка q детали, если деталь положить put(part, at, ang)."""
        rot = math.radians(ang - part.a0)
        dx, dy = (q[0] - part.p[0]) * self.k, (q[1] - part.p[1]) * self.k
        return (at[0] + dx * math.cos(rot) - dy * math.sin(rot), at[1] + dx * math.sin(rot) + dy * math.cos(rot))

    def result(self):
        return self.im.crop((self.m, self.m, self.m + self.w, self.m + self.h))
