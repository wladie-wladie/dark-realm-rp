# Анимации некроманта из риг-деталей → кадры боковой строки.
import math, sys
from PIL import Image
sys.path.insert(0, __file__.rsplit("/", 1)[0])
import necro
from necro import draw, P
from rig import Canvas

FW, FH, FOOT = 320, 300, (160, 282)
K = 0.244          # масштаб: рост тела как у прежнего листа
SS = 2             # рендер с запасом и сглаживание

def sin(x): return math.sin(2 * math.pi * x)
def cos(x): return math.cos(2 * math.pi * x)

def root_for(k):
    # где должен быть таз, чтобы подошва ближней ноги в нейтральной позе стояла в FOOT
    c = Canvas(10, 10, k); q = necro.NEUTRAL; T = P["torso"]
    hip = (0, 0)
    at = c.world(T, T.pts["hipN"], hip, q["torso"])
    th, sh = P["thighN"], P["shinN"]
    knee = c.world(th, th.d, at, q["thighN"])
    sole = c.world(sh, (sh.p[0], sh.im.height - 4), knee, q["shinN"])
    return (FOOT[0] - sole[0] + 6 * k, FOOT[1] - sole[1])

def walk(t):
    def leg(ph):
        th = 90 - 26 * sin(ph)
        bend = 4 + 50 * max(0.0, cos(ph)) ** 1.6
        return th, th + bend
    tn, sn = leg(t); tf, sf = leg(t + 0.5)
    return dict(
        thighN=tn, shinN=sn, thighF=tf, shinF=sf,
        torso=-87 + 1.0 * sin(2 * t), head=-89,
        hip=(0, -2.0 * abs(cos(t)) * 0 - 1.6 * (1 - abs(sin(t)))),
        uarmF=95 - 24 * sin(t), farmF=70 - 24 * sin(t) - 10,
        uarmN=102 + 7 * sin(t), farmN=42 + 5 * sin(t), scythe=-80 + 3 * sin(t),
        cape=104 + 5 * cos(2 * t), skirt=90 + 3 * sin(t),
    )

def idle(t):
    return dict(torso=-90 + 0.8 * sin(t), head=-90 + 1.2 * sin(t), hip=(0, 0.8 * (1 - cos(t)) / 2),
                uarmF=96 + 2 * sin(t), cape=100 + 2 * sin(t), scythe=-80 + 1.0 * sin(t))

STANCE = dict(thighN=72, shinN=96, thighF=108, shinF=104, hip=(0, 6))
ATTACK = [
    dict(STANCE, torso=-97, head=-94, uarmN=200, farmN=150, scythe=-140, uarmF=130, farmF=110, cape=112),   # замах назад
    dict(STANCE, torso=-100, head=-96, uarmN=-120, farmN=-150, scythe=-175, uarmF=150, farmF=120, cape=118), # над головой
    dict(STANCE, torso=-82, head=-86, uarmN=-30, farmN=-15, scythe=-10, uarmF=40, farmF=10, cape=104),      # удар
    dict(STANCE, torso=-76, head=-82, uarmN=40, farmN=30, scythe=40, uarmF=60, farmF=40, cape=96),          # проводка
    dict(STANCE, torso=-84, head=-88, uarmN=80, farmN=40, scythe=-30, uarmF=80, farmF=60, cape=100),        # возврат
]
CAST = dict(thighN=80, shinN=94, thighF=100, shinF=98, hip=(0, 3), torso=-86, head=-88,
            uarmF=-5, farmF=-15, uarmN=110, farmN=60, scythe=-85, cape=108)

def frame(pose):
    k = K * SS
    r = root_for(K)
    im = draw(pose, k, FW * SS, FH * SS, (r[0] * SS, r[1] * SS))
    return im.resize((FW, FH), Image.LANCZOS)

def side_frames(nwalk=8):
    out = {}
    out["walk"] = [frame(walk(i / nwalk)) for i in range(nwalk)]
    out["attack"] = [frame(p) for p in ATTACK]
    out["cast"] = [frame(CAST)]
    out["idle"] = [frame(idle(0)), frame(idle(0.5))]
    return out

if __name__ == "__main__":
    S = sys.argv[1]
    fr = side_frames()
    allf = fr["walk"] + fr["attack"] + fr["cast"] + fr["idle"]
    sheet = Image.new("RGBA", (FW * 8, FH * 2), (70, 80, 70, 255))
    for i, f in enumerate(allf):
        sheet.alpha_composite(f, ((i % 8) * FW, (i // 8) * FH))
    sheet.save(S + "/rig_sheet.png")
    # gif: ходьба + атака
    def bg(f):
        b = Image.new("RGBA", f.size, (92, 104, 84, 255)); b.alpha_composite(f); return b.convert("RGB")
    seq = fr["walk"] * 3 + fr["idle"] * 2 + fr["attack"] + fr["idle"]
    dur = [70] * 24 + [400] * 4 + [60] * 5 + [300] * 2
    big = [bg(f).resize((FW * 2, FH * 2), Image.LANCZOS) for f in seq]
    big[0].save(S + "/rig.gif", save_all=True, append_images=big[1:], duration=dur, loop=0)
