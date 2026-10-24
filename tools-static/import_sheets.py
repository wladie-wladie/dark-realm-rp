# Импорт спрайт-листов из ChatGPT: нарезка по сетке, выравнивание по ступням, единый размер кадра.
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
from bg import to_rgba

def _cuts(proj, n, span):
    L = len(proj); cuts = [0]
    for k in range(1, n):
        e = int(k * L / n); lo, hi = max(1, e - span), min(L - 1, e + span)
        cuts.append(lo + int(np.argmin(proj[lo:hi])))
    return cuts + [L]

def cells(path, rows, cols, dilate=5, min_px=300):
    # режем лист по «просветам» около равномерной сетки, затем в каждой ячейке берём фигуру
    im = to_rgba(path); A = np.array(im)
    a = A[:, :, 3] > 24
    H, W = a.shape
    ry = _cuts(a.sum(1), rows, H // rows // 4); rx = _cuts(a.sum(0), cols, W // cols // 4)
    out = {}
    for r in range(rows):
        for c in range(cols):
            y0c, y1c, x0c, x1c = ry[r], ry[r + 1], rx[c], rx[c + 1]
            ac = a[y0c:y1c, x0c:x1c]
            lab, n = ndimage.label(ndimage.binary_dilation(ac, iterations=dilate))
            ms = [(lab == i + 1) & ac for i in range(n)]
            ms = [x for x in ms if x.sum() >= min_px]
            if not ms: continue
            big = max(x.sum() for x in ms)
            ms = [x for x in ms if x.sum() >= 0.1 * big]   # отбрасываем осколки и частицы
            m = np.logical_or.reduce(ms)
            ys, xs = np.where(m)
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            crop = A[y0c + y0:y0c + y1, x0c + x0:x0c + x1].copy(); crop[:, :, 3] = np.where(m[y0:y1, x0:x1], crop[:, :, 3], 0)
            # опорная точка: центр масс нижних 18% силуэта (ступни/лапы)
            sub = m[y0:y1, x0:x1]; hh = sub.shape[0]; low = sub[int(hh * 0.82):]
            fx = ndimage.center_of_mass(low)[1] if low.any() else sub.shape[1] / 2
            out[(r, c)] = dict(img=Image.fromarray(crop), fx=fx, h=y1 - y0, w=x1 - x0)
    return out

def pack(frames_order, cells_, fw, fh, foot_y, scale, flip=False):
    sheet = Image.new("RGBA", (fw * len(frames_order[0]), fh * len(frames_order)), (0, 0, 0, 0))
    for ri, row in enumerate(frames_order):
        for ci, key in enumerate(row):
            if key not in cells_:
                # нет кадра — берём «стоит» в той же строке или такой же кадр из соседней строки
                alt = [(key[0], 0)] + [(r, key[1]) for r in range(3) if r != key[0]]
                key = next((a for a in alt if a in cells_), None)
                if key is None: continue
            c = cells_[key]; im = c["img"]
            im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
            x = round(fw / 2 - c["fx"] * scale); y = round(foot_y - im.height)
            frame = Image.new("RGBA", (fw, fh), (0, 0, 0, 0)); frame.alpha_composite(im, (max(-im.width, x), max(0, y)) if y >= 0 else (x, 0))
            sheet.alpha_composite(frame, (ci * fw, ri * fh))
    return sheet

def seamless(tile):
    # бесшовность: смешиваем плитку с её сдвигом на половину по маске «расстояние до края»
    t = np.array(tile).astype(np.float32); h, w = t.shape[:2]
    sh = np.roll(np.roll(t, h // 2, 0), w // 2, 1)
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.minimum(np.minimum(xx, w - 1 - xx) / (w / 2), np.minimum(yy, h - 1 - yy) / (h / 2))
    m = np.clip(d * 3.2, 0, 1)[..., None]
    return Image.fromarray((t * m + sh * (1 - m)).astype(np.uint8))

man_path = "assets/manifest.json"
man = json.load(open(man_path)) if os.path.exists(man_path) else {}
os.makedirs("assets/chars", exist_ok=True); os.makedirs("assets/ground", exist_ok=True)

# --- герой: 3 строки (вниз, вверх, вбок) × 6 (стоит, 4 шага, удар) → 8 столбцов игры
def hero(src, key):
    c = cells(src, 3, 6)
    stand_h = np.median([c[(r, 0)]["h"] for r in range(3) if (r, 0) in c])
    FW, FH = 192, 240; foot = 222
    scale = 176 / stand_h
    order = [[(r, 1), (r, 2), (r, 3), (r, 4), (r, 0), (r, 5), (r, 5), (r, 0)] for r in range(3)]
    s = pack(order, c, FW, FH, foot, scale)
    fn = f"chars/{key}.webp"; s.save("assets/" + fn, "WEBP", quality=90, method=6)
    man[key] = {"file": fn, "type": "hsheet", "fw": FW, "fh": FH}

# --- зверь в профиль: 2 строки (4 бега, 4 атаки) → 7 столбцов игры
def beast(src, key, width_px=210):
    c = cells(src, 2, 4)
    run_w = np.median([c[(0, i)]["w"] for i in range(4) if (0, i) in c])
    FW, FH = 240, 192; foot = 162
    scale = width_px / run_w
    order = [[(0, 0), (0, 1), (0, 2), (0, 3), (1, 0), (1, 2), (1, 3)]]
    s = pack(order, c, FW, FH, foot, scale)
    fn = f"chars/{key}.webp"; s.save("assets/" + fn, "WEBP", quality=90, method=6)
    man[key] = {"file": fn, "type": "csheet", "fw": FW, "fh": FH}

def ground(src, names, cols=2, rows=2):
    im = Image.open(src).convert("RGB"); W, H = im.size
    for i, name in enumerate(names):
        if not name: continue
        r, c = divmod(i, cols)
        q = im.crop((c * W // cols + 6, r * H // rows + 6, (c + 1) * W // cols - 6, (r + 1) * H // rows - 6)).resize((512, 512), Image.LANCZOS)
        q = seamless(q)
        fn = f"ground/{name}.webp"; q.save("assets/" + fn, "WEBP", quality=88, method=6)
        man["ter_" + name] = {"file": fn}

NPC_IDS = ["elder", "smith", "trader", "alch", "mentor", "guard", "guard2"]

def npcs(src):
    # жители стоят в ряд: режем по «просветам» между фигурами около равных долей ширины
    im = to_rgba(src); A = np.array(im); a = A[:, :, 3] > 24
    W = a.shape[1]; n = len(NPC_IDS); colsum = a.sum(0)
    cuts = [0]
    for k in range(1, n):
        e = int(k * W / n); lo, hi = max(1, e - 80), min(W - 1, e + 80)
        cuts.append(lo + int(np.argmin(colsum[lo:hi])))
    cuts.append(W)
    figs = []
    for i in range(n):
        sub = A[:, cuts[i]:cuts[i + 1]]; m = sub[:, :, 3] > 24
        ys, xs = np.where(m)
        figs.append(Image.fromarray(sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1]))
    med = float(np.median([f.height for f in figs]))
    FW, FH, foot = 192, 240, 222
    for im2, nid in zip(figs, NPC_IDS):
        sc = 176 / med; im2 = im2.resize((round(im2.width * sc), round(im2.height * sc)), Image.LANCZOS)
        frame = Image.new("RGBA", (FW, FH)); frame.alpha_composite(im2, (max(0, (FW - im2.width) // 2), max(0, foot - im2.height)))
        sheet = Image.new("RGBA", (FW * 8, FH * 3))
        for r in range(3):
            for c in range(8): sheet.alpha_composite(frame, (c * FW, r * FH))
        fn = f"chars/npc_{nid}.webp"; sheet.save("assets/" + fn, "WEBP", quality=90, method=6)
        man["npc_" + nid] = {"file": fn, "type": "hsheet", "fw": FW, "fh": FH}
    print("npcs", len(figs))

TITLES = {}  # ключ листа → название облика в редакторе
if os.path.exists("tools-static/titles.json"): TITLES = json.load(open("tools-static/titles.json"))
BEASTS = {"wolf": 210, "mobc_boar": 200, "mobc_spider": 175, "mobc_cavespider": 185, "mobc_toad": 190, "mobc_bat": 150}  # звери в профиль: ширина бега в кадре

ICON_JOBS = {os.path.splitext(j["name"])[0]: j for j in json.load(open("tools-static/icon_jobs.json"))}

def icons(src, name, ids, cols, rows):
    # лист иконок: ровная сетка; срезаем внешние поля, приводим к 128 px на ячейку
    im = Image.open(src).convert("RGB"); A = np.array(im).astype(int)
    bgc = A[2, 2]; diff = np.abs(A - bgc).sum(2) > 40
    ys, xs = np.where(diff)
    if len(ys) and (ys.max() - ys.min()) > A.shape[0] * 0.8: im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    im = im.resize((cols * 128, rows * 128), Image.LANCZOS)
    os.makedirs("assets/icons", exist_ok=True)
    fn = f"icons/{name}.webp"; im.save("assets/" + fn, "WEBP", quality=88, method=6)
    man[name] = {"file": fn}
    ic = man.setdefault("_icons", {})
    for i, iid in enumerate(ids):
        if iid: r, c = divmod(i, cols); ic[iid] = [name, c, r, cols, rows]

if __name__ == "__main__":
    only = sys.argv[1:]
    for f in sorted(os.listdir("assets/raw")):
        name, ext = os.path.splitext(f)
        if ext != ".png" or (only and name not in only): continue
        src = "assets/raw/" + f
        if name.startswith("hero_"):
            hero(src, name)
            if name in TITLES: man[name]["title"] = TITLES[name]
        elif name == "npc_all":
            npcs(src)
        elif name.startswith("mobh_"):
            hero(src, "mob_" + name[5:])
        elif name in BEASTS or name.startswith("mobc_"):
            key = "mob_" + (name[5:] if name.startswith("mobc_") else name)
            beast(src, key, BEASTS.get(name, 210))
        elif name in ICON_JOBS:
            j = ICON_JOBS[name]; icons(src, name, j["ids"], j["grid"][0], j["grid"][1])
        elif name.startswith("ground_01"):
            ground(src, ["grass", "cobble", "dirt", "forest"])
        elif name.startswith("ground_02"):
            ground(src, ["mud", "swampgrass", "swampwater", "water", "stone", "ash"], 3, 2)
        else:
            continue
        print("imported", name)
    # одни и те же картинки для родственных существ
    ALIAS = {"mob_alpha": "mob_wolf", "mob_pet_wolf": "mob_wolf", "mob_heartgolem": "mob_golem", "mob_pet_golem": "mob_golem", "mob_pet_skeleton": "mob_skeleton", "mob_pet_shade": "hero_rogue_m"}
    for a, b in ALIAS.items():
        if b in man: man[a] = dict(man[b]); man[a].pop("title", None)
    json.dump(man, open(man_path, "w"), ensure_ascii=False, indent=1)
