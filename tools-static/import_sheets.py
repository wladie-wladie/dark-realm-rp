# Импорт спрайт-листов из ChatGPT: нарезка по сетке, выравнивание по ступням, единый размер кадра.
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

def cells(path, rows, cols, dilate=5, min_px=300):
    im = Image.open(path).convert("RGBA"); A = np.array(im)
    a = A[:, :, 3] > 24
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=dilate))
    H, W = a.shape
    groups = {}
    for i, sl in enumerate(ndimage.find_objects(lab)):
        m = (lab == i + 1) & a
        cnt = m.sum()
        if cnt < min_px: continue
        cy, cx = ndimage.center_of_mass(m)
        r, c = min(rows - 1, int(cy / H * rows)), min(cols - 1, int(cx / W * cols))
        groups.setdefault((r, c), []).append(m)
    out = {}
    for (r, c), ms in groups.items():
        m = np.logical_or.reduce(ms)
        ys, xs = np.where(m)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = A[y0:y1, x0:x1].copy(); crop[:, :, 3] = np.where(m[y0:y1, x0:x1], crop[:, :, 3], 0)
        # опорная точка: центр масс нижних 18% силуэта (ступни/лапы)
        sub = m[y0:y1, x0:x1]; hh = sub.shape[0]; low = sub[int(hh * 0.82):]
        fx = ndimage.center_of_mass(low)[1] if low.any() else sub.shape[1] / 2
        out[(r, c)] = dict(img=Image.fromarray(crop), fx=fx, h=y1 - y0, w=x1 - x0)
    return out

def pack(frames_order, cells_, fw, fh, foot_y, scale, flip=False):
    sheet = Image.new("RGBA", (fw * len(frames_order[0]), fh * len(frames_order)), (0, 0, 0, 0))
    for ri, row in enumerate(frames_order):
        for ci, key in enumerate(row):
            if key not in cells_: print("missing", key); continue
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
    # одна картинка с жителями в ряд → у каждого лист, где все кадры — стоящая фигура
    from slice import slice_sheet
    parts = sorted(slice_sheet(src, min_px=2000), key=lambda p: p["x"])
    hs = [p["img"].height for p in parts]; med = float(np.median(hs))
    FW, FH, foot = 192, 240, 222
    for p, nid in zip(parts, NPC_IDS):
        im = p["img"]; sc = 176 / med; im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
        frame = Image.new("RGBA", (FW, FH)); frame.alpha_composite(im, (max(0, (FW - im.width) // 2), max(0, foot - im.height)))
        sheet = Image.new("RGBA", (FW * 8, FH * 3))
        for r in range(3):
            for c in range(8): sheet.alpha_composite(frame, (c * FW, r * FH))
        fn = f"chars/npc_{nid}.webp"; sheet.save("assets/" + fn, "WEBP", quality=90, method=6)
        man["npc_" + nid] = {"file": fn, "type": "hsheet", "fw": FW, "fh": FH}
    print("npcs", len(parts))

TITLES = {}  # ключ листа → название облика в редакторе
if os.path.exists("tools-static/titles.json"): TITLES = json.load(open("tools-static/titles.json"))
BEASTS = {"wolf": 210}  # звери в профиль: ширина бега в кадре

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
