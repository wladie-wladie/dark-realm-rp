// Генерация локации по описанию: земля, дороги, вода, деревья, ресурсы, точки появления монстров.
import { RNG, makeNoise } from "../core/rng.js";
import { TILE } from "../data/zones.js";
import { PROPS } from "../art/props.js";

export function generateZone(id, z) {
  const [W, H] = z.size;
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
    const pr = { key, v: variant, x: x * TILE, y: y * TILE, col: def.col, block: def.block, flat: def.flat, w: def.w, h: def.h, ...extra };
    props.push(pr); return pr;
  };

  // фиксированные объекты
  for (const f of z.fixed || []) {
    const [key, x, y, v] = f;
    place(key, x, y, v ?? 0);
    const def = PROPS[key];
    const r = Math.max(1, Math.ceil(Math.max(def.w, def.h * 0.5) / TILE / 2));
    stampCircle(x, y, r + 0.5, (tx, ty) => (free[idx(tx, ty)] = 0));
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
    if (water[idx(x, y)] || occupied.has(idx(x, y))) continue;
    const exitNear = (z.exits || []).some(e => Math.hypot(x - e.x, y - e.y) < 9);
    if (!exitNear) walk.push([x, y]);
  }
  for (const s of z.spawns || []) {
    let pool = walk;
    if (s.area) pool = walk.filter(([x, y]) => Math.hypot(x - s.area[0], y - s.area[1]) < s.area[2]);
    for (let i = 0; i < s.n && pool.length; i++) {
      const [x, y] = rng.pick(pool);
      spawnPts.push({ m: s.m, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
    }
  }

  return { id, W, H, ter, water, props, nodes, spawnPts, rngSeed: z.seed };
}
