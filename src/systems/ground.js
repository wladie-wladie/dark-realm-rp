// Земля в изометрии — рисует видеокарта: повторяющиеся текстуры в полном разрешении,
// вырезанные по форме дорог, площадей, воды и рельефа. Ничего не дорисовывается на ходу.
import { TERRAIN } from "../art/registry.js";
import { TILE, ZONES } from "../data/zones.js";
import { isoSize, tw, ELEV, IW, IH } from "../core/iso.js";
import { canvas } from "../art/paint.js";
import { mulberry32, makeNoise } from "../core/rng.js";

const PER = { cobble: 2.6, stone: 3 };   // период текстуры в клетках
const TUFT = { grass: 1, forest: 1, swampgrass: 1 };
const D = -100000;                       // глубина земли

// изометрическая версия бесшовной текстуры: прямоугольник 2S×S повторяется без швов
function isoTexture(scene, t) {
  const key = "isotex_" + t;
  if (scene.textures.exists(key)) return key;
  const src = (TERRAIN.src && TERRAIN.src[t]) || TERRAIN.tex[t] || TERRAIN.tex.grass;
  const S = (PER[t] || 4) * TILE, Wt = Math.min(2048, 2 ** Math.round(Math.log2(2 * S * 3))), k = Wt / (2 * S);
  const c = canvas(Wt, Wt / 2), ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.setTransform(k, 0, 0, k, 0, 0); ctx.transform(IW / 128, IH / 128, -IW / 128, IH / 128, 0, 0);
  const p = ctx.createPattern(src, "repeat"); const s = S / src.width;
  if (p.setTransform) p.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
  ctx.fillStyle = p; ctx.fillRect(-4 * S, -4 * S, 12 * S, 12 * S);
  scene.textures.addCanvas(key, c);
  scene.textures.get(key).setFilter && scene.textures.get(key).setFilter(0);
  return key;
}

export class Ground {
  constructor(scene, gen, zoneId) {
    this.s = scene; this.gen = gen; this.zoneId = zoneId; this.z = ZONES[zoneId];
    [this.Wpx, this.Hpx] = isoSize(gen.W, gen.H);
    this.objs = []; this.chunks = new Map(); this.res = 1;
    this.build();
    scene.events.once("shutdown", () => this.destroy());
  }
  P(x, y) { return tw(x / TILE, y / TILE); }               // точка «квадратного» мира (64 px на клетку) → мир
  layer(t, polys, depth, dy = 0) {
    if (!polys.length) return null;
    const key = isoTexture(this.s, t), S = (PER[t] || 4) * TILE, k = this.s.textures.get(key).getSourceImage().width / (2 * S);
    const ts = this.s.add.tileSprite(0, 0, this.Wpx, this.Hpx + ELEV * 2, key).setOrigin(0, 0).setDepth(D + depth);
    ts.setTileScale(1 / k, 1 / k);
    // привязка узора к началу «квадратного» мира
    const [ox, oy] = tw(0, 0);
    ts.tilePositionX = -ox * k; ts.tilePositionY = -(oy + dy) * k;
    const g = this.s.make.graphics({ add: false }); g.fillStyle(0xffffff);
    for (const poly of polys) g.fillPoints(poly.map(([x, y]) => ({ x, y: y + dy })), true);
    ts.setMask(g.createGeometryMask());
    this.objs.push(ts, g);
    return ts;
  }
  gfx(depth) { const g = this.s.add.graphics().setDepth(D + depth); this.objs.push(g); return g; }

  build() {
    const z = this.z, S = TILE, { W, H } = this.gen, base = z.base;
    const noise = makeNoise(z.seed, 8);
    // фон за пределами карты и основа
    const bg = this.s.add.rectangle(-2000, -2000, this.Wpx + 4000, this.Hpx + 4000, 0x07060a).setOrigin(0).setDepth(D - 10); this.objs.push(bg);
    const diamond = [tw(0, 0), tw(W, 0), tw(W, H), tw(0, H)];
    this.layer(base, [diamond], 0);
    // формы из описания зоны
    const pathPolys = [], caps = [];
    const paths = (z.paths || []).map(p => {
      const pts = [];
      for (let i = 0; i < p.pts.length - 1; i++) {
        const [ax, ay] = p.pts[i], [bx, by] = p.pts[i + 1], steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 3);
        for (let st = 0; st <= steps; st++) { const t = st / steps; pts.push([(ax + (bx - ax) * t + (noise(st * 0.2 + i, 3) - 0.5) * 1.2) * S, (ay + (by - ay) * t + (noise(5, st * 0.2 + i) - 0.5) * 1.2) * S]); }
      }
      for (let k = 0; k < 3; k++) for (let i = 1; i < pts.length - 1; i++) pts[i] = [(pts[i - 1][0] + pts[i][0] * 2 + pts[i + 1][0]) / 4, (pts[i - 1][1] + pts[i][1] * 2 + pts[i + 1][1]) / 4];
      return { t: p.t, pts, w: p.w * S };
    });
    const buffer = p => {
      const L = [], R = [], n = p.pts.length;
      for (let i = 0; i < n; i++) {
        const a = p.pts[Math.max(0, i - 1)], b = p.pts[Math.min(n - 1, i + 1)];
        let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        const [x, y] = p.pts[i]; L.push([x - dy * p.w / 2, y + dx * p.w / 2]); R.push([x + dy * p.w / 2, y - dx * p.w / 2]);
      }
      const circ = ([x, y]) => Array.from({ length: 14 }, (_, k) => [x + Math.cos(k / 14 * 6.283) * p.w / 2, y + Math.sin(k / 14 * 6.283) * p.w / 2]);
      return [[...L, ...R.reverse()], circ(p.pts[0]), circ(p.pts[n - 1])];
    };
    const proj = poly => poly.map(([x, y]) => this.P(x, y));
    const blob = (e, amp, f) => Array.from({ length: 72 }, (_, i) => {
      const a = i / 72 * Math.PI * 2, cx = e.x + Math.cos(a) * e.rx, cy = e.y + Math.sin(a) * e.ry;
      const kk = 1 - (noise(cx * f + (e.t === "water" || e.t === "swampwater" ? 9 : 0), cy * f) - 0.5) * amp;
      return [(e.x + Math.cos(a) * e.rx * kk) * S, (e.y + Math.sin(a) * e.ry * kk) * S];
    });
    // вода
    const byT = {};
    for (const w of z.water || []) (byT[w.t || "water"] = byT[w.t || "water"] || []).push(proj(blob(w, 0.4, 0.5)));
    let d = 1;
    for (const [t, polys] of Object.entries(byT)) { this.layer(t, polys, d++); const g = this.gfx(d++); g.lineStyle(6, 0x0a0804, 0.6); polys.forEach(p => g.strokePoints(p.map(([x, y]) => ({ x, y })), true)); }
    // дороги: тень и полотно
    const roads = {};
    for (const p of paths) for (const poly of buffer(p)) (roads[p.t] = roads[p.t] || []).push(proj(poly));
    const sh = this.gfx(d++); sh.fillStyle(0x140e06, 0.3);
    for (const polys of Object.values(roads)) polys.forEach(poly => sh.fillPoints(poly.map(([x, y]) => ({ x: x + 2, y: y + 4 })), true));
    for (const [t, polys] of Object.entries(roads)) this.layer(t, polys, d++);
    // площади с бордюром
    const plazas = {};
    for (const p of z.plazas || []) (plazas[p.t] = plazas[p.t] || []).push(proj(blob(p, 0.3, 0.4)));
    const psh = this.gfx(d++); psh.fillStyle(0x000000, 0.45);
    for (const polys of Object.values(plazas)) polys.forEach(poly => psh.fillPoints(poly.map(([x, y]) => ({ x: x + 2, y: y + 4 })), true));
    for (const [t, polys] of Object.entries(plazas)) this.layer(t, polys, d++);
    const curb = this.gfx(d++);
    for (const polys of Object.values(plazas)) for (const poly of polys) {
      curb.lineStyle(4, 0x18120c, 0.9); curb.strokePoints(poly.map(([x, y]) => ({ x, y })), true);
      curb.lineStyle(1.5, 0xdcc8a0, 0.35); curb.strokePoints(poly.map(([x, y]) => ({ x: x - 1.3, y: y - 1.3 })), true);
    }
    // трава нависает на края дорог
    if (TUFT[base]) {
      const r = mulberry32(z.seed * 31 + 5), tufts = [];
      const inPlaza = (x, y) => (z.plazas || []).some(p => Math.hypot((x / S - p.x) / p.rx, (y / S - p.y) / p.ry) < 1.02);
      const onRoad = (x, y, self) => paths.some(pp => pp !== self && pp.pts.some(q => Math.hypot(q[0] - x, q[1] - y) < pp.w / 2 - 3));
      for (const p of paths) {
        let acc = 0;
        for (let i = 1; i < p.pts.length; i++) {
          const [ax, ay] = p.pts[i - 1], [bx, by] = p.pts[i], len = Math.hypot(bx - ax, by - ay); if (!len) continue;
          const nx = -(by - ay) / len, ny = (bx - ax) / len; acc += len;
          while (acc > 11) {
            acc -= 11;
            for (const side of [-1, 1]) {
              const off = p.w / 2 + (r() * 6 - 4), rad = 4 + r() * 7, x = bx + nx * side * off, y = by + ny * side * off;
              if (inPlaza(x, y) || onRoad(x, y, p)) continue;
              const rot = r() * 3;
              tufts.push(proj(Array.from({ length: 9 }, (_, k) => { const a = k / 9 * 6.283; return [x + Math.cos(a) * rad * Math.cos(rot) - Math.sin(a) * rad * 0.8 * Math.sin(rot), y + Math.cos(a) * rad * Math.sin(rot) + Math.sin(a) * rad * 0.8 * Math.cos(rot)]; })));
            }
          }
        }
      }
      const tsh = this.gfx(d++); tsh.fillStyle(0x0c0a04, 0.4); tufts.forEach(p => tsh.fillPoints(p.map(([x, y]) => ({ x: x + 1.5, y: y + 2.5 })), true));
      this.layer(base, tufts, d++);
    }
    this.relief(d, base);
  }

  // рельеф: обрыв вниз перед проходом, скала вверх за ним
  relief(d, base) {
    const { W, H, raised, lowered } = this.gen;
    if (!raised) return;
    const R = (x, y) => x >= 0 && y >= 0 && x < W && y < H && raised[y * W + x];
    const Lo = (x, y) => lowered && x >= 0 && y >= 0 && x < W && y < H && lowered[y * W + x];
    const diam = (x, y, dy = 0) => [tw(x, y), tw(x + 1, y), tw(x + 1, y + 1), tw(x, y + 1)].map(([a, b]) => [a, b + dy]);
    const lowT = [], dF = [], uF = [], tops = [], lipsD = [], lipsU = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (Lo(x, y)) { lowT.push(diam(x, y)); continue; }
      if (R(x, y)) {
        tops.push(diam(x, y, -ELEV));
        if (!R(x + 1, y)) { const A = tw(x + 1, y), B = tw(x + 1, y + 1); uF.push([[A[0], A[1] - ELEV], [B[0], B[1] - ELEV], B, A, 1]); lipsU.push([A, B]); }
        if (!R(x, y + 1)) { const A = tw(x, y + 1), B = tw(x + 1, y + 1); uF.push([[A[0], A[1] - ELEV], [B[0], B[1] - ELEV], B, A, 0]); lipsU.push([A, B]); }
        continue;
      }
      if (Lo(x + 1, y)) { const A = tw(x + 1, y), B = tw(x + 1, y + 1); dF.push([A, B, [B[0], B[1] + ELEV], [A[0], A[1] + ELEV], 1]); lipsD.push([A, B]); }
      if (Lo(x, y + 1)) { const A = tw(x, y + 1), B = tw(x + 1, y + 1); dF.push([A, B, [B[0], B[1] + ELEV], [A[0], A[1] + ELEV], 0]); lipsD.push([A, B]); }
    }
    // низина: затемнение
    const low = this.gfx(d++); low.fillStyle(0x0e140a, 0.55); lowT.forEach(p => low.fillPoints(p.map(([x, y]) => ({ x, y })), true));
    // обрыв вниз (стена под краем прохода) — обрезаем низиной
    const quads = f => f.map(q => q.slice(0, 4));
    this.cliff(quads(dF), d++);
    const dsh = this.gfx(d++);
    for (const q of dF) { dsh.fillStyle(0x000000, q[4] ? 0.3 : 0.1); dsh.fillPoints(q.slice(0, 4).map(([x, y]) => ({ x, y })), true); }
    dsh.fillStyle(0x000000, 0.35);
    for (const q of dF) { const [A, B] = q; dsh.fillPoints([{ x: A[0], y: A[1] + ELEV }, { x: B[0], y: B[1] + ELEV }, { x: B[0], y: B[1] + ELEV + 14 }, { x: A[0], y: A[1] + ELEV + 14 }], true); }
    dsh.lineStyle(2.5, 0x140e08, 0.7); lipsD.forEach(([A, B]) => dsh.lineBetween(A[0], A[1] + 1, B[0], B[1] + 1));
    dsh.lineStyle(1.5, 0xfff0c8, 0.35); lipsD.forEach(([A, B]) => dsh.lineBetween(A[0], A[1] - 1, B[0], B[1] - 1));
    // скала вверх: тень у подножия, стена, верх с травой
    const ush = this.gfx(d++); ush.fillStyle(0x0a0804, 0.32);
    for (const q of uF) { const A = q[3], B = q[2]; ush.fillPoints([{ x: A[0], y: A[1] }, { x: B[0], y: B[1] }, { x: B[0] + 10, y: B[1] + 12 }, { x: A[0] + 10, y: A[1] + 12 }], true); }
    this.cliff(quads(uF), d++);
    const us = this.gfx(d++);
    for (const q of uF) { us.fillStyle(q[4] ? 0x000000 : 0xffe6be, q[4] ? 0.28 : 0.05); us.fillPoints(q.slice(0, 4).map(([x, y]) => ({ x, y })), true); }
    this.layer(base, tops, d++);
    const lip = this.gfx(d++);
    lip.lineStyle(3.5, 0x18120a, 0.85); lipsU.forEach(([A, B]) => lip.lineBetween(A[0], A[1] - ELEV, B[0], B[1] - ELEV));
    lip.lineStyle(1.2, 0xfff0c8, 0.25); lipsU.forEach(([A, B]) => lip.lineBetween(A[0] - 1.5, A[1] - ELEV - 1.5, B[0] - 1.5, B[1] - ELEV - 1.5));
  }
  cliff(polys, depth) {
    if (!polys.length) return;
    const src = TERRAIN.src && TERRAIN.src.cliff;
    let key = "cliffwall";
    if (!this.s.textures.exists(key)) {
      if (src) this.s.textures.addImage(key, src);
      else { const c = canvas(256, 128), g = c.getContext("2d"); g.fillStyle = "#6a5a46"; g.fillRect(0, 0, 256, 128); this.s.textures.addCanvas(key, c); }
    }
    const img = this.s.textures.get(key).getSourceImage(), k = ELEV / img.height;
    const ts = this.s.add.tileSprite(0, -ELEV * 2, this.Wpx, this.Hpx + ELEV * 4, key).setOrigin(0).setDepth(D + depth).setTileScale(k, k);
    const g = this.s.make.graphics({ add: false }); g.fillStyle(0xffffff);
    polys.forEach(p => g.fillPoints(p.map(([x, y]) => ({ x, y })), true));
    ts.setMask(g.createGeometryMask());
    this.objs.push(ts, g);
  }
  update() {}
  destroy() { for (const o of this.objs) o.destroy(); this.objs = []; }
}
