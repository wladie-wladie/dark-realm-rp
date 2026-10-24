// Земля в изометрии: текстуры в полном разрешении, чёткие края у мостовой и дорог, трава нависает на край.
// Рисуется кусками вокруг камеры (чтобы хватало памяти телефона), лишние куски выгружаются.
import { TERRAIN } from "../art/registry.js";
import { TILE } from "../data/zones.js";
import { isoMatrix, isoSize, tt } from "../core/iso.js";
import { canvas } from "../art/paint.js";
import { mulberry32, makeNoise } from "../core/rng.js";
import { ZONES } from "../data/zones.js";

const CH = 512, RES = 2;           // кусок мира и плотность пикселей (2 пикселя текстуры на пиксель мира)
const PERIOD = 4 * TILE;           // текстура повторяется раз в 4 клетки
const PER = { cobble: 2.6 * TILE, stone: 3 * TILE };  // мельче камни — ближе к образцу
// порядок: что выше — то рисуется позже и нависает краем на соседей
const ORDER = ["water", "swampwater", "mud", "ash", "stone", "dirt", "road", "cobble", "swampgrass", "forest", "grass"];
const STYLE = { grass: "tuft", forest: "tuft", swampgrass: "tuft", cobble: "curb", stone: "curb", dirt: "soft", road: "soft", mud: "soft", ash: "soft", water: "water", swampwater: "water" };

export class Ground {
  constructor(scene, gen, zoneId) {
    this.s = scene; this.gen = gen; this.zoneId = zoneId;
    [this.Wpx, this.Hpx] = isoSize(gen.W, gen.H);
    this.chunks = new Map(); this.patterns = {};
    this.M = isoMatrix();
    this.buildShapes(ZONES[zoneId]);
    scene.events.once("shutdown", () => this.destroy());
  }

  // формы земли из описания зоны (в пикселях «квадратного» мира): плавные дороги, площади, водоёмы
  buildShapes(z) {
    const S = TILE, noise = makeNoise(z.seed, 8);
    this.paths = (z.paths || []).map(p => {
      const pts = [];
      for (let i = 0; i < p.pts.length - 1; i++) {
        const [ax, ay] = p.pts[i], [bx, by] = p.pts[i + 1];
        const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 3);
        for (let st = 0; st <= steps; st++) {
          const t = st / steps;
          const x = ax + (bx - ax) * t + (noise(st * 0.2 + i, 3) - 0.5) * 1.2, y = ay + (by - ay) * t + (noise(5, st * 0.2 + i) - 0.5) * 1.2;
          pts.push([x * S, y * S]);
        }
      }
      // сглаживание ломаной
      for (let k = 0; k < 3; k++) for (let i = 1; i < pts.length - 1; i++) pts[i] = [(pts[i - 1][0] + pts[i][0] * 2 + pts[i + 1][0]) / 4, (pts[i - 1][1] + pts[i][1] * 2 + pts[i + 1][1]) / 4];
      return { t: p.t, pts, w: p.w * S };
    });
    const blob = (e, amp, f) => {
      const poly = [];
      for (let i = 0; i < 96; i++) {
        const a = i / 96 * Math.PI * 2, cx = e.x + Math.cos(a) * e.rx, cy = e.y + Math.sin(a) * e.ry;
        const k = 1 - (noise(cx * f + (e.t === "water" || e.t === "swampwater" ? 9 : 0), cy * f) - 0.5) * amp;
        poly.push([(e.x + Math.cos(a) * e.rx * k) * S, (e.y + Math.sin(a) * e.ry * k) * S]);
      }
      return poly;
    };
    this.plazas = (z.plazas || []).map(p => ({ t: p.t, poly: blob(p, 0.3, 0.4) }));
    this.waters = (z.water || []).map(w => ({ t: w.t || "water", poly: blob(w, 0.4, 0.5) }));
    // трава, нависающая на края дорог
    const inPlaza = (x, y) => (z.plazas || []).some(p => Math.hypot((x / S - p.x) / p.rx, (y / S - p.y) / p.ry) < 1.02);
    const onRoad = (x, y, self) => this.paths.some(pp => pp !== self && pp.pts.some(q => Math.hypot(q[0] - x, q[1] - y) < pp.w / 2 - 3));
    this.tufts = [];
    const r = mulberry32(z.seed * 31 + 5);
    for (const p of this.paths) {
      let acc = 0;
      for (let i = 1; i < p.pts.length; i++) {
        const [ax, ay] = p.pts[i - 1], [bx, by] = p.pts[i], len = Math.hypot(bx - ax, by - ay); if (!len) continue;
        const nx = -(by - ay) / len, ny = (bx - ax) / len;
        acc += len;
        while (acc > 11) {
          acc -= 11;
          for (const side of [-1, 1]) {
            const off = p.w / 2 + (r() * 6 - 4), rad = 4 + r() * 7;
            const x = bx + nx * side * off, y = by + ny * side * off;
            if (inPlaza(x, y) || onRoad(x, y, p)) continue;
            this.tufts.push([x, y, rad, r() * 3]);
          }
        }
      }
    }
  }
  pattern(ctx, t) {
    const src = (TERRAIN.src && TERRAIN.src[t]) || TERRAIN.tex[t] || TERRAIN.tex.grass;
    const p = ctx.createPattern(src, "repeat");
    const k = (PER[t] || PERIOD) / src.width;
    if (p.setTransform) p.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
    return p;
  }
  ter(x, y) { const { W, H, ter } = this.gen; return x < 0 || y < 0 || x >= W || y >= H ? null : ter[y * W + x]; }

  bake(cx, cy) {
    const { W, H } = this.gen;
    const size = CH * RES, c = canvas(size, size), ctx = c.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#07060a"; ctx.fillRect(0, 0, size, size);
    ctx.setTransform(RES, 0, 0, RES, -cx * CH * RES, -cy * CH * RES);
    ctx.transform(...this.M);
    const z = ZONES[this.zoneId], base = z.base, S = TILE;
    // основа
    ctx.fillStyle = this.pattern(ctx, base); ctx.fillRect(0, 0, W * S, H * S);
    const polyPath = poly => { const p = new Path2D(); poly.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; };
    const linePath = pts => { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); return p; };
    // вода — ниже всего
    for (const w of this.waters) {
      const p = polyPath(w.poly);
      ctx.fillStyle = this.pattern(ctx, w.t); ctx.fill(p);
      ctx.save(); ctx.strokeStyle = "rgba(10,8,4,0.6)"; ctx.lineWidth = 7; ctx.stroke(p); ctx.restore();
    }
    // дороги: тень, полотно
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const p of this.paths) {
      const lp = linePath(p.pts);
      ctx.save(); ctx.strokeStyle = "rgba(20,14,6,0.35)"; ctx.lineWidth = p.w + 6; ctx.stroke(lp); ctx.restore();
      ctx.strokeStyle = this.pattern(ctx, p.t); ctx.lineWidth = p.w; ctx.stroke(lp);
    }
    // площади с бордюром
    for (const pl of this.plazas) {
      const p = polyPath(pl.poly);
      ctx.save(); ctx.translate(2, 3); ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fill(p); ctx.restore();
      ctx.fillStyle = this.pattern(ctx, pl.t); ctx.fill(p);
      ctx.save(); ctx.strokeStyle = "rgba(24,18,12,0.9)"; ctx.lineWidth = 4.5; ctx.stroke(p);
      ctx.strokeStyle = "rgba(220,200,160,0.35)"; ctx.lineWidth = 1.6; ctx.translate(-1.3, -1.3); ctx.stroke(p); ctx.restore();
    }
    // трава нависает на края дорог
    if (STYLE[base] === "tuft" && this.tufts.length) {
      const sh = new Path2D(), gr = new Path2D();
      for (const [x, y, rad, rot] of this.tufts) {
        sh.moveTo(x + rad + 1.5, y + 2.5); sh.ellipse(x + 1.5, y + 2.5, rad, rad * 0.8, rot, 0, Math.PI * 2);
        gr.moveTo(x + rad, y); gr.ellipse(x, y, rad, rad * 0.8, rot, 0, Math.PI * 2);
      }
      ctx.fillStyle = "rgba(12,10,4,0.4)"; ctx.fill(sh);
      ctx.fillStyle = this.pattern(ctx, base); ctx.fill(gr);
    }
    // кромка земли
    ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 6; ctx.strokeRect(0, 0, W * TILE, H * TILE);
    return c;
  }

  layer(ctx, t, x0, y0, x1, y1) {
    const style = STYLE[t] || "soft", S = TILE;
    const region = new Path2D(), edges = new Path2D();
    let any = false;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (this.ter(x, y) !== t) continue;
      any = true;
      region.rect(x * S - 0.5, y * S - 0.5, S + 1, S + 1);
      // стороны, где сосед — другая земля
      const sides = [[0, -1, x * S, y * S, x * S + S, y * S], [1, 0, x * S + S, y * S, x * S + S, y * S + S], [0, 1, x * S, y * S + S, x * S + S, y * S + S], [-1, 0, x * S, y * S, x * S, y * S + S]];
      for (const [dx, dy, ax, ay, bx, by] of sides) {
        const n = this.ter(x + dx, y + dy);
        if (n === t || n === null) continue;
        edges.moveTo(ax, ay); edges.lineTo(bx, by);
        if (style === "tuft" || style === "soft") {
          // выступы края (одинаковые в соседних кусках — сид от координат)
          const r = mulberry32((x * 73856093) ^ (y * 19349663) ^ ((dx + 2) * 83492791) ^ ((dy + 2) * 2654435761));
          const n2 = style === "tuft" ? 4 : 3;
          for (let i = 0; i < n2; i++) {
            const f = (i + 0.2 + r() * 0.6) / n2, rad = style === "tuft" ? 5 + r() * 7 : 4 + r() * 6;
            const px = ax + (bx - ax) * f + dx * rad * (0.2 + r() * 0.5), py = ay + (by - ay) * f + dy * rad * (0.2 + r() * 0.5);
            region.moveTo(px + rad, py); region.ellipse(px, py, rad, rad * (0.8 + r() * 0.4), r() * 3, 0, Math.PI * 2);
          }
        }
      }
    }
    if (!any) return;
    if (style === "water") {
      ctx.fillStyle = this.pattern(ctx, t); ctx.fill(region);
      ctx.save(); ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 5; ctx.stroke(edges); ctx.restore();
      return;
    }
    // тень под краем (приподнятость слоя)
    ctx.save(); ctx.translate(2.5, 3.5); ctx.fillStyle = style === "curb" ? "rgba(0,0,0,0.5)" : "rgba(10,8,4,0.38)"; ctx.fill(region); ctx.restore();
    ctx.fillStyle = this.pattern(ctx, t); ctx.fill(region);
    if (style === "curb") {
      // бордюр: тёмный шов и светлая грань камня
      ctx.save(); ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(20,16,12,0.85)"; ctx.lineWidth = 4; ctx.stroke(edges);
      ctx.strokeStyle = "rgba(210,190,150,0.35)"; ctx.lineWidth = 1.5; ctx.translate(-1.2, -1.2); ctx.stroke(edges);
      ctx.restore();
    }
  }

  update(force = false) {
    const cam = this.s.cameras.main, v = cam.worldView;
    if (!v.width) return;
    const m = CH * 0.5;
    const ax = Math.max(0, Math.floor((v.x - m) / CH)), bx = Math.min(Math.ceil(this.Wpx / CH) - 1, Math.floor((v.right + m) / CH));
    const ay = Math.max(0, Math.floor((v.y - m) / CH)), by = Math.min(Math.ceil(this.Hpx / CH) - 1, Math.floor((v.bottom + m) / CH));
    let baked = 0;
    for (let cy = ay; cy <= by; cy++) for (let cx = ax; cx <= bx; cx++) {
      const id = cx + "_" + cy;
      if (this.chunks.has(id)) continue;
      if (!force && baked >= 1) continue;
      const key = `gnd_${this.zoneId}_${id}`;
      if (this.s.textures.exists(key)) this.s.textures.remove(key);
      this.s.textures.addCanvas(key, this.bake(cx, cy));
      const img = this.s.add.image(cx * CH, cy * CH, key).setOrigin(0).setScale(1 / RES).setDepth(-100000);
      this.chunks.set(id, { img, key, cx, cy }); baked++;
    }
    // выгружаем далёкие куски
    for (const [id, ch] of this.chunks) {
      if (ch.cx < ax - 1 || ch.cx > bx + 1 || ch.cy < ay - 1 || ch.cy > by + 1) {
        ch.img.destroy(); const tex = this.s.textures.get(ch.key); const src = tex && tex.getSourceImage(); this.s.textures.remove(ch.key);
        if (src) { src.width = 0; src.height = 0; }
        this.chunks.delete(id);
      }
    }
  }
  destroy() { for (const ch of this.chunks.values()) { ch.img.destroy(); if (this.s.textures.exists(ch.key)) this.s.textures.remove(ch.key); } this.chunks.clear(); }
}
