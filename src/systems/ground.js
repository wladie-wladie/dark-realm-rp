// Земля в изометрии: текстуры в полном разрешении, чёткие края у мостовой и дорог, трава нависает на край.
// Рисуется кусками вокруг камеры (чтобы хватало памяти телефона), лишние куски выгружаются.
import { TERRAIN } from "../art/registry.js";
import { TILE } from "../data/zones.js";
import { isoMatrix, isoSize, tt, tw, ELEV } from "../core/iso.js";
import { canvas } from "../art/paint.js";
import { mulberry32, makeNoise } from "../core/rng.js";
import { ZONES } from "../data/zones.js";

const CH = 256;                    // кусок мира; плотность пикселей = масштабу камеры (1 пиксель текстуры на пиксель экрана)
let RES = 2;
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
    if (this.gen.raised) {
      const pts = [[cx * CH, cy * CH], [(cx + 1) * CH, cy * CH], [cx * CH, (cy + 1) * CH + ELEV], [(cx + 1) * CH, (cy + 1) * CH + ELEV]].map(([x, y]) => tt(x, y));
      const x0 = Math.floor(Math.min(...pts.map(p => p[0]))) - 1, x1 = Math.ceil(Math.max(...pts.map(p => p[0]))) + 1;
      const y0 = Math.floor(Math.min(...pts.map(p => p[1]))) - 1, y1 = Math.ceil(Math.max(...pts.map(p => p[1]))) + 1;
      this.relief(ctx, cx, cy, x0, y0, x1, y1, base);
    }
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

  cliffPattern(ctx) {
    let src = TERRAIN.src && TERRAIN.src.cliff;
    if (!src) {
      // запасная скала, пока нет картинки
      src = this._cliff || (this._cliff = (() => { const c = canvas(256, 128), g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#8a7a62"); gr.addColorStop(1, "#4a3e30"); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); g.strokeStyle = "rgba(30,22,14,0.5)"; g.lineWidth = 3; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(i * 30 + 8, 0); g.lineTo(i * 30 + 14, 70); g.lineTo(i * 30 + 6, 128); g.stroke(); } return c; })());
    }
    const p = ctx.createPattern(src, "repeat"), k = (ELEV * 1.0) / src.height;
    if (p.setTransform) p.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
    return p;
  }

  // скалы: поднятые клетки — верх с травой и отвесная стена к проходу
  relief(ctx, cx, cy, x0, y0, x1, y1, base) {
    const { W, H, raised, lowered } = this.gen, S = TILE;
    const R = (x, y) => x >= 0 && y >= 0 && x < W && y < H && raised[y * W + x];
    const Lo = (x, y) => lowered && x >= 0 && y >= 0 && x < W && y < H && lowered[y * W + x];
    // низина перед проходом: затемнённая земля и обрыв от края прохода вниз
    if (lowered) {
      const low = new Path2D(), dfaces = [];
      for (let y = Math.max(0, y0 - 2); y <= Math.min(H - 1, y1 + 2); y++) for (let x = Math.max(0, x0 - 2); x <= Math.min(W - 1, x1 + 2); x++) {
        if (Lo(x, y)) { low.rect(x * S - 0.5, y * S - 0.5, S + 1, S + 1); continue; }
        if (R(x, y)) continue;
        if (Lo(x + 1, y)) dfaces.push([tw(x + 1, y), tw(x + 1, y + 1), 1, x + y]);
        if (Lo(x, y + 1)) dfaces.push([tw(x, y + 1), tw(x + 1, y + 1), 0, x + y]);
      }
      ctx.save(); ctx.setTransform(RES, 0, 0, RES, -cx * CH * RES, -cy * CH * RES); ctx.transform(...this.M);
      ctx.fillStyle = this.pattern(ctx, base); ctx.fill(low);
      ctx.fillStyle = "rgba(14,20,10,0.55)"; ctx.fill(low);
      ctx.restore();
      ctx.save(); ctx.setTransform(RES, 0, 0, RES, -cx * CH * RES, -cy * CH * RES);
      // обрезаем стену по низине, чтобы не залезала на соседей
      ctx.save(); ctx.transform(...this.M); ctx.clip(low); ctx.setTransform(RES, 0, 0, RES, -cx * CH * RES, -cy * CH * RES);
      const cp = this.cliffPattern(ctx);
      dfaces.sort((a, b) => a[3] - b[3]);
      for (const [A, B, side] of dfaces) {
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(B[0], B[1] + ELEV); ctx.lineTo(A[0], A[1] + ELEV); ctx.closePath();
        ctx.fillStyle = cp; ctx.fill();
        ctx.fillStyle = side ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.1)"; ctx.fill();
        // тень у подножия
        ctx.beginPath(); ctx.moveTo(A[0], A[1] + ELEV); ctx.lineTo(B[0], B[1] + ELEV); ctx.lineTo(B[0], B[1] + ELEV + 16); ctx.lineTo(A[0], A[1] + ELEV + 16); ctx.closePath();
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fill();
      }
      ctx.restore();
      // кромка обрыва
      ctx.strokeStyle = "rgba(255,240,200,0.35)"; ctx.lineWidth = 1.5;
      for (const [A, B] of dfaces) { ctx.beginPath(); ctx.moveTo(A[0], A[1] - 1); ctx.lineTo(B[0], B[1] - 1); ctx.stroke(); }
      ctx.strokeStyle = "rgba(20,14,8,0.7)"; ctx.lineWidth = 2.5;
      for (const [A, B] of dfaces) { ctx.beginPath(); ctx.moveTo(A[0], A[1] + 1); ctx.lineTo(B[0], B[1] + 1); ctx.stroke(); }
      ctx.restore();
    }
    const faces = [], tops = new Path2D(), lips = new Path2D();
    let any = false;
    for (let y = Math.max(0, y0 - 2); y <= Math.min(H - 1, y1 + 2); y++) for (let x = Math.max(0, x0 - 2); x <= Math.min(W - 1, x1 + 2); x++) {
      if (!R(x, y)) continue;
      any = true;
      tops.rect(x * S - 0.5, y * S - 0.5, S + 1, S + 1);
      if (!R(x + 1, y)) { faces.push([tw(x + 1, y), tw(x + 1, y + 1), 1, x + y]); lips.moveTo((x + 1) * S, y * S); lips.lineTo((x + 1) * S, (y + 1) * S); }
      if (!R(x, y + 1)) { faces.push([tw(x, y + 1), tw(x + 1, y + 1), 0, x + y]); lips.moveTo(x * S, (y + 1) * S); lips.lineTo((x + 1) * S, (y + 1) * S); }
    }
    if (!any) return;
    ctx.setTransform(RES, 0, 0, RES, -cx * CH * RES, -cy * CH * RES);
    // тень у подножия
    ctx.fillStyle = "rgba(10,8,4,0.32)";
    for (const [A, B] of faces) { ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(B[0] + 10, B[1] + 12); ctx.lineTo(A[0] + 10, A[1] + 12); ctx.closePath(); ctx.fill(); }
    // стены
    const cp = this.cliffPattern(ctx);
    faces.sort((a, b) => a[3] - b[3]);
    for (const [A, B, side] of faces) {
      ctx.beginPath(); ctx.moveTo(A[0], A[1] - ELEV); ctx.lineTo(B[0], B[1] - ELEV); ctx.lineTo(B[0], B[1]); ctx.lineTo(A[0], A[1]); ctx.closePath();
      ctx.fillStyle = cp; ctx.fill();
      ctx.fillStyle = side ? "rgba(0,0,0,0.28)" : "rgba(255,230,190,0.05)"; ctx.fill();
      ctx.strokeStyle = "rgba(20,14,8,0.55)"; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // верх скал
    ctx.save(); ctx.translate(0, -ELEV); ctx.transform(...this.M);
    ctx.fillStyle = this.pattern(ctx, base); ctx.fill(tops);
    ctx.strokeStyle = "rgba(24,18,10,0.85)"; ctx.lineWidth = 3.5; ctx.stroke(lips);
    ctx.strokeStyle = "rgba(255,240,200,0.25)"; ctx.lineWidth = 1.2; ctx.translate(-1.5, -1.5); ctx.stroke(lips);
    ctx.restore();
  }

  update(force = false) {
    const cam = this.s.cameras.main, v = cam.worldView;
    if (!v.width) return;
    // плотность текстуры = масштаб камеры: пиксель в пиксель, без мыла и ряби
    const want = Math.max(1.25, Math.min(2.5, Math.round(cam.zoom * 4) / 4));
    if (want !== this.res) { this.res = want; RES = want; this.destroy(); force = true; }
    RES = this.res;
    const m = CH * 0.25;
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
