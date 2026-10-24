# Нарезает лист объектов деревни и раскладывает спрайты в assets/props + manifest.json.
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from slice import slice_sheet

NAMES = ["house_big", "house_thatch", "well", "pine", "oak", "deadtree", "bush", "boulder", "lantern", "fence", "barrel", "crate", "rock", "cart", "stall", "stump"]
# какие игровые объекты заменяет каждый спрайт и их ширина в мире (px)
USE = {
  "house_big": [("tavern_0", 360), ("smithy_0", 300), ("shop_0", 280), ("house_0", 270)],
  "house_thatch": [("house_1", 260), ("herbhut_0", 240), ("hut_0", 220)],
  "well": [("well_0", 110)], "pine": [("pine_0", 150), ("pine_1", 135), ("pine_2", 160), ("pine_3", 145)],
  "oak": [("oak_0", 200), ("oak_1", 185), ("oak_2", 215)], "deadtree": [("deadtree_0", 150), ("deadtree_1", 140), ("deadtree_2", 165)],
  "bush": [("bush_0", 80), ("bush_1", 72), ("bush_2", 88)], "boulder": [("boulder_0", 130), ("boulder_1", 115)],
  "lantern": [("lantern_0", 52)], "fence": [("fence_0", 95)], "barrel": [("barrel_0", 40)], "crate": [("crate_0", 50)],
  "rock": [("rock_0", 75), ("rock_1", 65), ("rock_2", 85)], "cart": [("cart_0", 150)], "stall": [("stall_0", 150), ("stall_1", 150)], "stump": [("stump_0", 60)],
}
sheet = sys.argv[1]
parts = slice_sheet(sheet)
assert len(parts) == len(NAMES), len(parts)
os.makedirs("assets/props", exist_ok=True)
man_path = "assets/manifest.json"
man = json.load(open(man_path)) if os.path.exists(man_path) else {}
for p, name in zip(parts, NAMES):
    im = p["img"]; im.thumbnail((512, 512))
    fn = f"props/{name}.webp"
    im.save("assets/" + fn, "WEBP", quality=90, method=6)
    for key, w in USE[name]:
        man["prop_" + key] = {"file": fn, "w": w}
json.dump(man, open(man_path, "w"), ensure_ascii=False, indent=1)
print("ok", len(man))
