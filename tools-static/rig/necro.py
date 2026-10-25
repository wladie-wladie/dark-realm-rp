# Некромант (колдун-м) — сборка из деталей и анимации боковой строки.
import math, sys
from PIL import Image, ImageDraw
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from rig import Part, Canvas

F = "necro"
P = dict(
    head=Part(F, "head", (118, 186), (118, 20)),
    torso=Part(F, "torso", (110, 232), (112, 48), pts=dict(neck=(116, 58), shN=(104, 100), shF=(92, 96), hipN=(108, 236), hipF=(98, 232), capeA=(66, 52), skirtA=(112, 226))),
    uarmN=Part(F, "uarmN", (88, 56), (30, 146)),
    farmN=Part(F, "farmN", (34, 46), (168, 106)),
    uarmF=Part(F, "uarmF", (72, 40), (36, 132), darken=0.25),
    farmF=Part(F, "farmF", (28, 46), (160, 86), darken=0.25),
    thighN=Part(F, "thighN", (62, 30), (96, 190)),
    shinN=Part(F, "shinN", (64, 22), (74, 172)),
    thighF=Part(F, "thighF", (62, 30), (92, 190), darken=0.25),
    shinF=Part(F, "shinF", (66, 24), (80, 176), darken=0.25),
    skirt=Part(F, "skirt", (130, 34), (130, 280)),
    cape=Part(F, "cape", (190, 30), (150, 380), darken=0.1),
    scythe=Part(F, "scythe", (109, 470), (109, 10), scale=0.82),
)

NEUTRAL = dict(torso=-90, head=-90, uarmN=100, farmN=40, uarmF=95, farmF=60,
               thighN=92, shinN=92, thighF=88, shinF=88, cape=100, skirt=90, scythe=-80, hip=(0, 0))

def draw(pose, k, W, H, root, debug=False):
    c = Canvas(W, H, k)
    q = dict(NEUTRAL); q.update(pose)
    hip = (root[0] + q["hip"][0], root[1] + q["hip"][1])
    T = P["torso"]; ta = q["torso"]
    J = {n: c.world(T, T.pts[n], hip, ta) for n in T.pts}
    def leg(side):
        th, sh = P["thigh" + side], P["shin" + side]
        at = J["hip" + side]
        knee = c.world(th, th.d, at, q["thigh" + side])
        return [(th, at, q["thigh" + side]), (sh, knee, q["shin" + side])]
    def arm(side):
        ua, fa = P["uarm" + side], P["farm" + side]
        at = J["sh" + side]
        el = c.world(ua, ua.d, at, q["uarm" + side])
        hand = c.world(fa, fa.d, el, q["farm" + side])
        return [(ua, at, q["uarm" + side]), (fa, el, q["farm" + side])], hand
    armF, handF = arm("F"); armN, handN = arm("N")
    order = []
    order += [(P["cape"], J["capeA"], q["cape"])]
    order += armF
    order += leg("F")
    order += leg("N")
    order += [(T, hip, ta), (P["skirt"], J["skirtA"], q["skirt"])]
    order += [(P["head"], J["neck"], q["head"])]
    order += [(P["scythe"], handN, q["scythe"])]
    order += armN
    for part, at, ang in order:
        c.put(part, at, ang)
    im = c.result()
    if debug:
        d = ImageDraw.Draw(im)
        for n, v in J.items():
            d.ellipse([v[0] - 4, v[1] - 4, v[0] + 4, v[1] + 4], outline=(0, 255, 0))
    return im

if __name__ == "__main__":
    im = draw({}, 0.6, 700, 700, (350, 330), debug=True)
    bg = Image.new("RGBA", im.size, (70, 80, 70, 255)); bg.alpha_composite(im)
    bg.save(sys.argv[1] if len(sys.argv) > 1 else "/tmp/necro_t.png")
