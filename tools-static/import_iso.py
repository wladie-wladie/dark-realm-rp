# Импорт изометрического набора: текстуры земли (бесшовные) и постройки с пурпурного фона.
# Для постройки задаём размер основания в клетках (сумма сторон); точка опоры — нижний угол основания.
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from chroma import parts
from import_sheets import seamless
from quilt import seamless_quilt

man_path = "assets/manifest.json"
man = json.load(open(man_path))
os.makedirs("assets/props", exist_ok=True); os.makedirs("assets/ground", exist_ok=True)

TEX = {"tex_cobble": "cobble", "tex_grass": "grass", "tex_dirt": "dirt", "s_cobble": "cobble", "s_grass": "grass", "s_dirt": "dirt"}
# лист → [(ключ объекта, вариант, сумма сторон основания в клетках | None для мелочи, ширина в мире для мелочи)]
SHEETS = {
    "s_house": [("house3", 0, 7, None)],
    "town_bld1": [("house2", 0, 7, None), ("house2", 1, 7, None)],
    "town_bld2": [("smithy2", 0, 7, None), ("tavern2", 0, 9, None)],
    "town_bld3": [("stall2", 0, None, 150), ("stall2", 1, None, 150), ("well2", 0, None, 130)],
    "town_props": [("lamp2", 0, None, 46), ("board", 0, None, 80), ("barrels", 0, None, 80), ("crates", 0, None, 80),
                   ("cart2", 0, None, 150), ("banner", 0, None, 50), ("signpost2", 0, None, 70), ("bench", 0, None, 90)],
    "town_walls": [("wall_a", 0, None, 140), ("wall_b", 0, None, 140), ("wpillar", 0, None, 44), ("palisade_a", 0, None, 140), ("palisade_b", 0, None, 140), ("stairs", 0, None, 170)],
}

# где на картинке нижний угол основания (доля ширины), если крыльцо/ступени сбивают автоматику
OX = {("house3", 0): 0.6, ("house2", 0): 0.58, ("house2", 1): 0.57, ("smithy2", 0): 0.5, ("tavern2", 0): 0.6}

def base_x(im):
    a = np.array(im)[..., 3] > 60
    ys, xs = np.where(a)
    bottom = ys.max(); band = ys >= bottom - max(4, int(a.shape[0] * 0.03))
    return float(np.median(xs[band])) / a.shape[1]

def save_prop(im, key, v):
    im = im.copy(); im.thumbnail((720, 720), Image.LANCZOS)
    fn = f"props/iso_{key}_{v}.webp"; im.save("assets/" + fn, "WEBP", quality=92, method=6)
    return fn, im

# простой стиль: одна картинка → несколько ключей/вариантов
MULTI = {
    "s_trees": [("oak", [0], None, 190), ("pine", [0, 1, 2, 3], None, 135), ("oak", [2], None, 160), ("oak", [1], None, 150)],
    "s_nature": [("bush", [0, 2], None, 78), ("bush", [1], None, 78), ("boulder", [0, 1], None, 110), ("rock", [0, 1, 2], None, 80),
                 ("stump", [0], None, 60), ("tuft", [0, 1, 2], None, 44), ("fern", [0, 1], None, 64), ("log", [0], None, 120)],
    "s_bld_a": [("tavern2", [0], 9, None), ("smithy2", [0], 7, None)],
    "s_bld_b": [("house2", [1], 7, None), ("stall2", [0, 1], None, 160), ("well2", [0], None, 120)],
    "s_props": [("lamp2", [0], None, 44), ("board", [0], None, 84), ("barrels", [0], None, 76), ("crates", [0], None, 80),
                ("cart2", [0], None, 140), ("banner", [0], None, 50), ("signpost2", [0], None, 66), ("fence2", [0], None, 120)],
}
OX.update({("tavern2", 0): 0.62, ("smithy2", 0): 0.55, ("house2", 1): 0.6})
TEX["s_cliff"] = "cliff"

for name in sys.argv[1:]:
    if name in MULTI:
        ps = parts(f"assets/raw/iso/{name}.png"); spec = MULTI[name]
        if len(ps) != len(spec): print(name, "найдено", len(ps), "ожидалось", len(spec)); continue
        for p, (key, vs, n, wworld) in zip(ps, spec):
            fn, im = save_prop(p["img"], key + "_s", vs[0])
            for v in vs:
                if n:
                    ox = OX.get((key, v)) or base_x(im); fw = max(1, round(n * ox)); fh = max(1, n - fw)
                    man[f"prop_{key}_{v}"] = {"file": fn, "foot": [fw, fh], "ox": round(ox, 3)}
                else:
                    man[f"prop_{key}_{v}"] = {"file": fn, "w": wworld}
        print(name, "ok"); continue
    src = f"assets/raw/iso/{name}.png"
    if name == "s_cliff":
        from quilt import _cut_cols
        A = np.array(Image.open(src).convert("RGB")); W2 = A.shape[1]; o = W2 // 8
        A = np.concatenate([_cut_cols(A[:, W2 - o:], A[:, :o]), A[:, o:W2 - o]], 1)
        t = Image.fromarray(A).resize((1024, 512), Image.LANCZOS)
        fn = "ground/simple_cliff.webp"; t.save("assets/" + fn, "WEBP", quality=90, method=6)
        man["ter_cliff"] = {"file": fn}; print("cliff"); continue
    if name in TEX:
        t = Image.open(src).convert("RGB")
        w, h = t.size; m = int(min(w, h) * 0.04)
        t = t.crop((m, m, w - m, h - m))
        t = seamless_quilt(t).resize((1024, 1024), Image.LANCZOS)
        fn = f"ground/{'simple' if name.startswith('s_') else 'iso'}_{TEX[name]}.webp"; t.save("assets/" + fn, "WEBP", quality=90, method=6)
        man["ter_" + TEX[name]] = {"file": fn}
        print("texture", name); continue
    spec = SHEETS[name]; ps = parts(src)
    if len(ps) != len(spec): print(name, "найдено", len(ps), "ожидалось", len(spec)); continue
    for p, (key, v, n, wworld) in zip(ps, spec):
        fn, im = save_prop(p["img"], key, v)
        if n:
            ox = OX.get((key, v)) or base_x(im); fw = max(1, round(n * ox)); fh = max(1, n - fw)
            man[f"prop_{key}_{v}"] = {"file": fn, "foot": [fw, fh], "ox": round(ox, 3)}
        else:
            man[f"prop_{key}_{v}"] = {"file": fn, "w": wworld}
    print(name, "ok")
json.dump(man, open(man_path, "w"), ensure_ascii=False, indent=1)
