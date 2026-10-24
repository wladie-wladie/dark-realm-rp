# Единая линейка размеров: человек 1,75 м ≈ 68 px мира → 39 px мира на метр.
# Постройки — по деталям картинки (двери, наковальня), остальное — по высоте в метрах.
# Запускать после любого импорта графики.
import json
from PIL import Image
PPM = 39.0
m = json.load(open("assets/manifest.json"))
size = lambda k: Image.open("assets/" + m[k]["file"]).size
BLD = {"prop_house3_0": 80, "prop_house2_0": 80, "prop_house2_1": 57, "prop_tavern2_0": 64, "prop_smithy2_0": 111}  # пикселей картинки на метр
for k, mpx in BLD.items():
    if k not in m: continue
    w, h = size(k); W = w / mpx * PPM; n = max(2, round(W / 64)); ox = m[k].get("ox", 0.5)
    fw = max(1, round(n * ox)); fh = max(1, n - fw)
    m[k]["foot"] = [fw, fh]; m[k]["k"] = round(W / (n * 64), 3)
HM = {"prop_stall2_0": 7.04, "prop_stall2_1": 7.04, "prop_well2_0": 4.68, "prop_lamp2_0": 3.0, "prop_board_0": 2.1, "prop_barrels_0": 1.0, "prop_crates_0": 0.9,
      "prop_cart2_0": 1.3, "prop_banner_0": 4.0, "prop_signpost2_0": 2.2, "prop_bench_0": 0.9, "prop_fence2_0": 1.2,
      "prop_oak_0": 7.0, "prop_oak_1": 4.2, "prop_oak_2": 7.0, "prop_pine_0": 8.0, "prop_pine_1": 8.5, "prop_pine_2": 7.5, "prop_pine_3": 8.0,
      "prop_bush_0": 1.1, "prop_bush_1": 1.0, "prop_bush_2": 1.2, "prop_boulder_0": 1.5, "prop_boulder_1": 1.3, "prop_rock_0": 0.8, "prop_rock_1": 0.7, "prop_rock_2": 0.9,
      "prop_stump_0": 0.6, "prop_tuft_0": 0.5, "prop_tuft_1": 0.45, "prop_tuft_2": 0.55, "prop_fern_0": 0.7, "prop_fern_1": 0.65, "prop_log_0": 0.7}
for k, hm in HM.items():
    if k in m: m[k].pop("w", None); m[k]["h"] = round(hm * PPM, 1)
json.dump(m, open("assets/manifest.json", "w"), ensure_ascii=False, indent=1)
print("размеры выставлены")
