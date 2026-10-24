// Генерация локации по описанию: земля, дороги, вода, деревья, ресурсы, точки появления монстров.
import { RNG, makeNoise } from "../core/rng.js";
import { TILE } from "../data/zones.js";
import { tw, setIsoZone } from "../core/iso.js";
import { PROPS } from "../art/props.js";
import { G } from "../core/G.js";
const footOf = (key, v) => { const m = G.art && G.art[`prop_${key}_${v}`]; return (m && m.foot) || (PROPS[key] && PROPS[key].foot) || null; };

export function generateZone(id, z) {
  const [W, H] = z.size;
  setIsoZone(W, H);
  const rng = new RNG(z.seed * 1000 + 7);
  const ter = new Array(W * H).fill(z.base);
  const free = new Uint8Array(W * H).fill(1); // 1 — можно ставить препятствия
  const water = new Uint8Array(W * H);
  const idx = (x, y) => y * W + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const noise = makeNoise(z.seed, 8);

  const stampCircle = (cx, cy, r, fn) => {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      if (!inb(x, y)) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= r) fn(x, y, d);
    }
  };

  // площади
  for (const p of z.plazas || []) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const nx = (x + 0.5 - p.x) / p.rx, ny = (y + 0.5 - p.y) / p.ry;
      const d = Math.sqrt(nx * nx + ny * ny) + (noise(x * 0.4, y * 0.4) - 0.5) * 0.3;
      if (d < 1) { ter[idx(x, y)] = p.t; free[idx(x, y)] = 0; }
      else if (d < 1.4) free[idx(x, y)] = 0;
    }
  }
  // дороги
  const pathTiles = [];
  for (const p of z.paths || []) {
    for (let i = 0; i < p.pts.length - 1; i++) {
      const [ax, ay] = p.pts[i], [bx, by] = p.pts[i + 1];
      const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 3);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = ax + (bx - ax) * t + (noise(s * 0.2 + i, 3) - 0.5) * 1.2, y = ay + (by - ay) * t + (noise(5, s * 0.2 + i) - 0.5) * 1.2;
        stampCircle(x, y, p.w * 0.5, (tx, ty) => { ter[idx(tx, ty)] = p.t; pathTiles.push([tx, ty]); });
        stampCircle(x, y, p.w * 0.5 + 1.6, (tx, ty) => { free[idx(tx, ty)] = 0; });
      }
    }
  }
  // вода
  for (const w of z.water || []) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const nx = (x + 0.5 - w.x) / w.rx, ny = (y + 0.5 - w.y) / w.ry;
      const d = Math.sqrt(nx * nx + ny * ny) + (noise(x * 0.5 + 9, y * 0.5) - 0.5) * 0.4;
      if (d < 1) { ter[idx(x, y)] = w.t || "water"; water[idx(x, y)] = 1; free[idx(x, y)] = 0; }
      else if (d < 1.25) free[idx(x, y)] = 0;
    }
  }
  // выходы и стоянки — без препятствий
  for (const e of z.exits || []) stampCircle(e.x, e.y, 4, (x, y) => (free[idx(x, y)] = 0));
  if (z.spawn) stampCircle(z.spawn[0], z.spawn[1], 3, (x, y) => (free[idx(x, y)] = 0));
  if (z.boss) stampCircle(z.boss.x, z.boss.y, 4, (x, y) => (free[idx(x, y)] = 0));

  const props = [];
  const occupied = new Set();
  const place = (key, x, y, v = null, extra = {}) => {
    const def = PROPS[key]; if (!def) return null;
    const variant = v ?? rng.int(0, def.v - 1);
    const [px, py] = tw(x, y);
    const pr = { key, v: variant, x: px, y: py, tx: x, ty: y, col: def.col, block: def.block, flat: def.flat, w: def.w, h: def.h, ...extra };
    props.push(pr); return pr;
  };

  // фиксированные объекты
  const solidT = new Uint8Array(W * H); // клетки под постройками — непроходимы
  for (const f of z.fixed || []) {
    const [key, x, y, v] = f;
    const foot = footOf(key, v ?? 0);
    if (foot) {
      // (x, y) — верхняя клетка основания; ставим картинку в нижний угол основания
      const pr = place(key, x + foot[0], y + foot[1], v ?? 0, { foot, fx: x, fy: y, block: null, col: 0 });
      for (let ty = y; ty < y + foot[1]; ty++) for (let tx = x; tx < x + foot[0]; tx++) if (inb(tx, ty)) { solidT[idx(tx, ty)] = 1; }
      stampCircle(x + foot[0] / 2, y + foot[1] / 2, Math.max(foot[0], foot[1]) / 2 + 1, (tx, ty) => (free[idx(tx, ty)] = 0));
      continue;
    }
    place(key, x, y, v ?? 0);
    const def = PROPS[key];
    const r = Math.max(1, Math.ceil(Math.max(def.w, def.h * 0.5) / TILE / 2));
    stampCircle(x, y, r + 0.5, (tx, ty) => (free[idx(tx, ty)] = 0));
  }

  if (z.walk) return walkZone();

  // ---------- земли из проходов: всё вне проходов — рельеф (скалы сзади, лес спереди) ----------
  function walkZone() {
    const walk = new Uint8Array(W * H), lot = new Uint8Array(W * H);
    for (const p of z.walk.paths || []) {
      for (let i = 0; i < p.pts.length - 1; i++) {
        const [ax, ay] = p.pts[i], [bx, by] = p.pts[i + 1];
        const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 3);
        for (let s = 0; s <= steps; s++) { const t = s / steps; stampCircle(ax + (bx - ax) * t, ay + (by - ay) * t, p.w / 2, (x, y) => (walk[idx(x, y)] = 1)); }
      }
    }
    for (const r of [...(z.walk.rooms || []), ...(z.plazas || [])]) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot((x + 0.5 - r.x) / r.rx, (y + 0.5 - r.y) / r.ry) < 1) walk[idx(x, y)] = 1;
    }
    for (const e of z.exits || []) stampCircle(e.x, e.y, (e.w || 3) / 2 + 0.5, (x, y) => (walk[idx(x, y)] = 1));
    // участки построек — на уровне земли
    for (const pr of props) if (pr.foot) {
      for (let y = pr.fy - 1; y < pr.fy + pr.foot[1] + 1; y++) for (let x = pr.fx - 1; x < pr.fx + pr.foot[0] + 1; x++) if (inb(x, y) && !walk[idx(x, y)]) lot[idx(x, y)] = 1;
    }
    // вокруг домов можно ходить (кроме самого здания)
    for (let i = 0; i < W * H; i++) if (lot[i] && !solidT[i]) walk[i] = 1;
    for (let i = 0; i < W * H; i++) if (water[i] || solidT[i]) walk[i] = 0;
    for (let i = 0; i < W * H; i++) if (solidT[i]) lot[i] = 1; else lot[i] = 0;
    // перед проходом (ближе к камере) — обрыв вниз; за проходом — скала вверх
    const front = new Uint8Array(W * H), raised = new Uint8Array(W * H);
    const isW = (x, y) => inb(x, y) && walk[idx(x, y)];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y); if (walk[i] || lot[i] || water[i]) continue;
      let f = false;
      for (let d = 1; d <= 2 && !f; d++) f = isW(x - d, y) || isW(x, y - d) || isW(x - d, y - d);
      if (f) front[i] = 1; else raised[i] = 1;
    }
    // земля в проходах — из описания (дорожки/площади уже проставлены в ter), остальное — основа
    const rr = rng;
    // деревья на скалах (поднятые)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!raised[idx(x, y)] || !rr.chance(z.walk.topTrees ?? 0.18)) continue;
      place(rr.pick(z.walk.trees || ["oak"]), x + rr.range(0.3, 0.7), y + rr.range(0.4, 0.8), null, { elev: 1, col: 0, block: null });
    }
    // непроходимо всё вне проходов (физика — только по краю прохода)
    const solid = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y); if (walk[i]) continue;
      if (isW(x - 1, y) || isW(x + 1, y) || isW(x, y - 1) || isW(x, y + 1) || isW(x - 1, y - 1) || isW(x + 1, y + 1) || isW(x - 1, y + 1) || isW(x + 1, y - 1)) solid[i] = 1;
    }
    for (let i = 0; i < W * H; i++) if (solidT[i]) solid[i] = 1;
    // ресурсы — у краёв прохода, монстры — в проходах
    const walkCells = [], edgeCells = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!walk[idx(x, y)] || water[idx(x, y)]) continue;
      const exitNear = (z.exits || []).some(e => Math.hypot(x - e.x, y - e.y) < 6);
      if (!exitNear) walkCells.push([x, y]);
      if (!exitNear && (!isW(x - 1, y) || !isW(x, y - 1) || !isW(x + 1, y) || !isW(x, y + 1))) edgeCells.push([x, y]);
    }
    const nodes = [];
    for (const [key, n] of z.nodes || []) for (let i = 0; i < n && edgeCells.length; i++) {
      const [x, y] = edgeCells.splice(rng.int(0, edgeCells.length - 1), 1)[0];
      const pr = place(key, x + 0.5, y + 0.6, 0, { node: key.replace("node_", "") }); nodes.push(pr);
    }
    for (const s of z.scatter || []) for (const [x, y] of walkCells) if (ter[idx(x, y)] === z.base && rng.chance(s.d)) place(s.p, x + rng.range(0.1, 0.9), y + rng.range(0.3, 1), s.v);
    const spawnPts = [];
    for (const s of z.spawns || []) {
      let pool = walkCells;
      if (s.area) pool = walkCells.filter(([x, y]) => Math.hypot(x - s.area[0], y - s.area[1]) < s.area[2]);
      for (let i = 0; i < s.n && pool.length; i++) { const [x, y] = rng.pick(pool); const [px, py] = tw(x + 0.5, y + 0.5); spawnPts.push({ m: s.m, x: px, y: py }); }
    }
    for (const p of props) if (p.elev) p.depthY = p.y; // глубина — по основанию на скале
    return { id, W, H, ter, water, solidT: solid, walk, raised, lowered: front, props, nodes, spawnPts, rngSeed: z.seed };
  }

  // кромка из деревьев/камней по краям (кроме выходов)
  const nearExit = (x, y) => (z.exits || []).some(e => Math.hypot(x - e.x, y - e.y) < 3.2);
  const bd = z.border;
  if (bd) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (edge >= bd.depth || nearExit(x, y)) continue;
      if (water[idx(x, y)]) continue;
      if (rng.chance(0.85)) place(rng.pick(bd.props), x + 0.5 + rng.range(-0.3, 0.3), y + 0.7 + rng.range(-0.3, 0.3));
      free[idx(x, y)] = 0;
    }
  }

  // деревья/препятствия кучками по шуму
  if (z.trees) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!free[idx(x, y)]) continue;
      const n = noise(x * 0.25 + 30, y * 0.25 + 30);
      const p = z.trees.d * (0.3 + n * 1.8);
      if (rng.chance(p)) {
        place(rng.pick(z.trees.p), x + rng.range(0.2, 0.8), y + rng.range(0.4, 0.9));
        free[idx(x, y)] = 0; occupied.add(idx(x, y));
      }
    }
  }

  // ресурсы — на свободных клетках поближе к тропам
  const nodes = [];
  const freeCells = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (free[idx(x, y)] && !occupied.has(idx(x, y))) freeCells.push([x, y]);
  for (const [key, n] of z.nodes || []) {
    for (let i = 0; i < n && freeCells.length; i++) {
      const k = rng.int(0, freeCells.length - 1);
      const [x, y] = freeCells.splice(k, 1)[0];
      const pr = place(key, x + 0.5, y + 0.7, 0, { node: key.replace("node_", "") });
      nodes.push(pr); free[idx(x, y)] = 0;
    }
  }

  // мелкий декор (проходимый)
  for (const s of z.scatter || []) {
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (water[idx(x, y)]) continue;
      const t = ter[idx(x, y)];
      if (t === "road" || t === "cobble") continue;
      const blocking = PROPS[s.p].col > 0;
      if (blocking && !free[idx(x, y)]) continue;
      if (rng.chance(s.d)) place(s.p, x + rng.range(0.1, 0.9), y + rng.range(0.3, 1), s.v);
    }
  }
  for (const s of z.waterScatter || []) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (water[idx(x, y)] && rng.chance(s.d)) place(s.p, x + rng.range(0.2, 0.8), y + rng.range(0.2, 0.8));
  }

  // точки появления монстров
  const spawnPts = [];
  const walk = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (water[idx(x, y)] || solidT[idx(x, y)] || occupied.has(idx(x, y))) continue;
    const exitNear = (z.exits || []).some(e => Math.hypot(x - e.x, y - e.y) < 9);
    if (!exitNear) walk.push([x, y]);
  }
  for (const s of z.spawns || []) {
    let pool = walk;
    if (s.area) pool = walk.filter(([x, y]) => Math.hypot(x - s.area[0], y - s.area[1]) < s.area[2]);
    for (let i = 0; i < s.n && pool.length; i++) {
      const [x, y] = rng.pick(pool);
      const [px, py] = tw(x + 0.5, y + 0.5); spawnPts.push({ m: s.m, x: px, y: py });
    }
  }

  return { id, W, H, ter, water, solidT, props, nodes, spawnPts, rngSeed: z.seed };
}
