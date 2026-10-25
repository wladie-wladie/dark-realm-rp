# Собирает лист hero_warlock_m в раскладке r16: на каждое направление 2 строки по 8 кадров
# (0–7 ходьба, 8–12 атака, 13 каст, 14–15 покой). Бок — из рига, перед/спина — из прежнего листа.
import sys, shutil, os
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from anim import side_frames, FW, FH
SRC = "assets/raw/concepts/hero_warlock_m_old.webp"
if not os.path.exists(SRC): shutil.copy("assets/chars/hero_warlock_m.webp", SRC)
old = Image.open(SRC).convert("RGBA")
cell = lambda r, c: old.crop((c * FW, r * FH, c * FW + FW, r * FH + FH))
sheet = Image.new("RGBA", (FW * 8, FH * 6))
put = lambda d, i, im: sheet.alpha_composite(im, ((i % 8) * FW, (d * 2 + i // 8) * FH))
MAP = [0, 0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7, 4, 4]
for d in (0, 1):
    for i, c in enumerate(MAP): put(d, i, cell(d, c))
fr = side_frames(8)
for i, im in enumerate(fr["walk"] + fr["attack"] + fr["cast"] + fr["idle"]): put(2, i, im)
sheet.save("assets/chars/hero_warlock_m.webp", "WEBP", quality=92, method=6)
print(sheet.size, os.path.getsize("assets/chars/hero_warlock_m.webp"))
