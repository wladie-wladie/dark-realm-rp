# Импорт листов объектов земель: порядок объектов как в задании ChatGPT → игровые ключи и ширина в мире.
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from slice import slice_sheet

SHEETS = {
 "props_forest": [
   ("fern", [("fern_0", 70), ("fern_1", 62)]), ("tuft", [("tuft_0", 44), ("tuft_1", 40), ("tuft_2", 48), ("drytuft_0", 44), ("drytuft_1", 40)]),
   ("mushrooms", [("mushrooms_0", 50)]), ("mushrooms_glow", [("mushrooms_1", 50)]), ("log", [("log_0", 125)]), ("pebble", [("pebble_0", 40), ("pebble_1", 34), ("pebble_2", 46)]),
   ("birch", [("node_wood1_0", 110)]), ("ash", [("node_wood2_0", 110)]), ("darkspruce", [("node_wood3_0", 110)]),
   ("ore_copper", [("node_ore1_0", 80)]), ("ore_iron", [("node_ore2_0", 80)]), ("ore_silver", [("node_ore3_0", 80)]),
   ("herb_red", [("node_herb1_0", 60)]), ("herb_blue", [("node_herb2_0", 60)]), ("herb_yellow", [("node_herb3_0", 60)]),
   ("flax", [("node_fiber1_0", 60)]), ("hemp", [("node_fiber2_0", 60)]), ("portal", [("portal_0", 150)]), ("signpost", [("signpost_0", 70)]), ("campfire", [("campfire_0", 70)]),
 ],
 "props_swamp": [
   ("swamptree", [("swamptree_0", 175)]), ("swamptree2", [("swamptree_1", 170)]), ("deadwater", []), ("reeds", [("reeds_0", 60), ("reeds_1", 54), ("reeds_2", 66)]),
   ("lily", [("lily_0", 70), ("lily_1", 64)]), ("stilthut", [("hut_0", 230)]), ("bones", [("bones_0", 50), ("bones_1", 44)]), ("rotstump", []), ("boat", []), ("hummock", []),
 ],
 "props_tract": [
   ("grave1", [("grave_0", 50)]), ("grave2", [("grave_1", 50)]), ("cross", [("grave_2", 46)]), ("ruinwall", [("ruinwall_0", 165), ("ruinwall_1", 150)]),
   ("pillar", [("pillar_0", 60), ("pillar_1", 56)]), ("brokencart", []), ("tent", []), ("crates", []), ("campfirepot", []), ("palisade", []), ("signpost2", []), ("roadtree", []),
 ],
 "props_mine": [
   ("mineentrance", [("mine_0", 170)]), ("beam", [("beam_0", 95)]), ("minecart", [("minecart_0", 95)]), ("crystal_blue", [("crystal_0", 70)]), ("crystal_purple", [("crystal_1", 70)]),
   ("caveboulder", []), ("caverocks", []), ("cobweb", [("cobweb_0", 60)]), ("minelantern", []), ("rails", []), ("stalagmite", []),
 ],
}
# ручная разметка, когда ChatGPT нарисовал иначе (номер найденного объекта → имя и использования)
MANUAL = {
 "props_forest": {0: ("fern", [("fern_0", 70), ("fern_1", 62)]), 1: ("tuft", [("tuft_0", 44), ("tuft_1", 40), ("tuft_2", 48), ("drytuft_0", 44), ("drytuft_1", 40)]),
   2: ("mushrooms", [("mushrooms_0", 50)]), 3: ("mushrooms_glow", [("mushrooms_1", 50)]), 4: ("birch", [("node_wood1_0", 110)]), 5: ("ash", [("node_wood2_0", 110)]),
   6: ("darkspruce", [("node_wood3_0", 110)]), 7: ("log", [("log_0", 125)]), 8: ("pebble", [("pebble_0", 40), ("pebble_1", 34), ("pebble_2", 46)]),
   9: ("ore_copper", [("node_ore1_0", 80)]), 10: ("ore_iron", [("node_ore2_0", 80)]), 11: ("ore_silver", [("node_ore3_0", 80)]),
   12: ("herb_red", [("node_herb1_0", 60)]), 13: ("herb_blue", [("node_herb2_0", 60)]), 14: ("herb_yellow", [("node_herb3_0", 60)]),
   15: ("hemp", [("node_fiber2_0", 60)]), 16: ("portal", [("portal_0", 150)]), 18: ("signpost", [("signpost_0", 70)]), 19: ("flax", [("node_fiber1_0", 60)]), 20: ("campfire", [("campfire_0", 70)])},
 "props_swamp": {0: ("swamptree", [("swamptree_0", 175)]), 1: ("swamptree2", [("swamptree_1", 170)]), 3: ("reeds", [("reeds_0", 60), ("reeds_1", 54), ("reeds_2", 66)]),
   4: ("lily", [("lily_0", 70), ("lily_1", 64)]), 5: ("bones", [("bones_0", 50), ("bones_1", 44)]), 6: ("rotstump", []), 7: ("hummock", [])},
}

def dewhite(im):
    # остатки «шахматки»: почти белые пиксели, связанные с прозрачностью, тоже делаем прозрачными
    import numpy as np
    from scipy import ndimage
    A = np.array(im); a = A[:, :, 3] > 24
    wh = (A[:, :, :3].min(2) > 200) & a
    lab, n = ndimage.label(wh | ~a)
    keep = set(np.unique(lab[~a])) - {0}
    kill = np.isin(lab, list(keep)) & wh
    A[:, :, 3][kill] = 0
    # замкнутые серо-белые пятна (клетки фона внутри листвы): нейтральные и светлые
    rgb = A[:, :, :3].astype(int); neutral = (rgb.min(2) > 185) & (rgb.max(2) - rgb.min(2) < 22) & (A[:, :, 3] > 24)
    lab, n = ndimage.label(neutral)
    sizes = ndimage.sum(neutral, lab, range(1, n + 1))
    big = np.isin(lab, [i + 1 for i, z in enumerate(sizes) if z >= 12])
    A[:, :, 3][ndimage.binary_dilation(big, iterations=1)] = 0
    from PIL import Image
    return Image.fromarray(A)

man_path = "assets/manifest.json"
man = json.load(open(man_path))
os.makedirs("assets/props", exist_ok=True)
SINGLE = {"prop_stilthut": ("stilthut", [("hut_0", 230)]), "prop_boat": ("boat", [("boat_0", 130)])}
for sheet in sys.argv[1:]:
    if sheet in SINGLE:
        parts = slice_sheet(f"assets/raw/{sheet}.png", min_px=600)
        name, uses = SINGLE[sheet]
        from PIL import Image
        im = dewhite(parts[0]["img"]) if len(parts) == 1 else None
        if im is None:  # склеиваем все куски в одну картинку по исходным координатам
            src = __import__("bg").to_rgba(f"assets/raw/{sheet}.png"); bb = src.getbbox(); im = dewhite(src.crop(bb))
        im.thumbnail((512, 512))
        fn = f"props/{name}.webp"; im.save("assets/" + fn, "WEBP", quality=90, method=6)
        for key, w in uses: man["prop_" + key] = {"file": fn, "w": w}
        print(sheet, "ok", len(parts)); continue
    spec = SHEETS[sheet]
    parts = slice_sheet(f"assets/raw/{sheet}.png", min_px=600)
    if sheet in MANUAL and len(parts) != len(spec):
        for i, (name, uses) in MANUAL[sheet].items():
            im = dewhite(parts[i]["img"]); im.thumbnail((512, 512))
            fn = f"props/{name}.webp"; im.save("assets/" + fn, "WEBP", quality=90, method=6)
            for key, w in uses: man["prop_" + key] = {"file": fn, "w": w}
        print(sheet, "ok (ручная разметка)"); continue
    if len(parts) != len(spec):
        print(f"{sheet}: найдено {len(parts)} объектов, ожидалось {len(spec)} — пропускаю, нужна ручная разметка"); continue
    for p, (name, uses) in zip(parts, spec):
        im = p["img"]; im.thumbnail((512, 512))
        fn = f"props/{name}.webp"; im.save("assets/" + fn, "WEBP", quality=90, method=6)
        for key, w in uses: man["prop_" + key] = {"file": fn, "w": w}
    print(sheet, "ok")
json.dump(man, open(man_path, "w"), ensure_ascii=False, indent=1)
