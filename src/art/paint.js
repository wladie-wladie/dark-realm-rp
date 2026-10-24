// Базовые инструменты «живописной» процедурной графики.
import { makeNoise, mulberry32 } from "../core/rng.js";

export function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  return c;
}

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r, g, b) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}
// amt > 0 — светлее, < 0 — темнее
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  if (amt >= 0) return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  return rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}
export function mix(h1, h2, t) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}
export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// Бесшовная текстура из шума: palette — массив цветов от тёмного к светлому.
export function noiseTexture(size, seed, palette, opts = {}) {
  const c = canvas(size, size), ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  const per = opts.period || 8;
  const ns = [makeNoise(seed, per), makeNoise(seed + 1, per * 2), makeNoise(seed + 2, per * 4), makeNoise(seed + 3, per * 8)];
  const cols = palette.map(hexToRgb);
  const rnd = mulberry32(seed + 9);
  const grain = opts.grain ?? 0.06;
  const contrast = opts.contrast ?? 1.4;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    let n = ns[0](u * per, v * per) * 0.5 + ns[1](u * per * 2, v * per * 2) * 0.25 +
      ns[2](u * per * 4, v * per * 4) * 0.15 + ns[3](u * per * 8, v * per * 8) * 0.1;
    n = (n - 0.5) * contrast + 0.5 + (rnd() - 0.5) * grain;
    n = Math.max(0, Math.min(0.9999, n));
    const f = n * (cols.length - 1), i = Math.floor(f), t = f - i;
    const a = cols[i], b = cols[Math.min(i + 1, cols.length - 1)];
    const o = (y * size + x) * 4;
    img.data[o] = a[0] + (b[0] - a[0]) * t;
    img.data[o + 1] = a[1] + (b[1] - a[1]) * t;
    img.data[o + 2] = a[2] + (b[2] - a[2]) * t;
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Мазки поверх текстуры (трава, камешки, трещины) — с переносом через края для бесшовности.
export function wrapDraw(size, x, y, r, fn) {
  for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
    if (x + dx + r < 0 || x + dx - r > size || y + dy + r < 0 || y + dy - r > size) continue;
    fn(x + dx, y + dy);
  }
}

// Мягкая кисть: текстура, обрезанная мягким пятном неправильной формы.
export function softBrush(tex, size, seed, hardness = 0.55) {
  const c = canvas(size, size), ctx = c.getContext("2d");
  const rnd = mulberry32(seed);
  ctx.fillStyle = ctx.createPattern(tex, "repeat");
  ctx.save();
  ctx.translate(rnd() * 64, rnd() * 64);
  ctx.fillRect(-64, -64, size + 128, size + 128);
  ctx.restore();
  // маска: несколько радиальных пятен
  const m = canvas(size, size), mc = m.getContext("2d");
  const blobs = 7;
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + rnd();
    const rr = size * (0.12 + rnd() * 0.14);
    const cx = size / 2 + Math.cos(a) * size * 0.16, cy = size / 2 + Math.sin(a) * size * 0.16;
    const g = mc.createRadialGradient(cx, cy, rr * hardness, cx, cy, rr * 1.9);
    g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
    mc.fillStyle = g; mc.beginPath(); mc.arc(cx, cy, rr * 1.9, 0, 7); mc.fill();
  }
  const g = mc.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.42);
  g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
  mc.fillStyle = g; mc.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(m, 0, 0);
  return c;
}

export function ellipseShadow(ctx, x, y, rx, ry, alpha = 0.35) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(0.6, `rgba(0,0,0,${alpha * 0.6})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
  ctx.beginPath(); ctx.arc(x, y, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Заливка формы объёмным градиентом (свет сверху-слева).
export function volumeFill(ctx, x, y, w, h, base, light = 0.25, dark = -0.45) {
  const g = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
  g.addColorStop(0, shade(base, light));
  g.addColorStop(0.45, base);
  g.addColorStop(1, shade(base, dark));
  return g;
}

export function radial(ctx, x, y, r, base, light = 0.3, dark = -0.5) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  g.addColorStop(0, shade(base, light));
  g.addColorStop(0.55, base);
  g.addColorStop(1, shade(base, dark));
  return g;
}

export function blob(ctx, cx, cy, r, rnd, points = 9, jitter = 0.22) {
  ctx.beginPath();
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const rr = r * (1 - jitter + rnd() * jitter * 2);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92]);
  }
  for (let i = 0; i < points; i++) {
    const p = pts[i], q = pts[(i + 1) % points];
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(p[0], p[1], mx, my);
  }
  const p = pts[0], q = pts[1];
  ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  ctx.closePath();
}

export function glow(size, color, inner = 0.0) {
  const c = canvas(size, size), ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, size * inner / 2, size / 2, size / 2, size / 2);
  g.addColorStop(0, rgba(color, 1));
  g.addColorStop(0.25, rgba(color, 0.55));
  g.addColorStop(0.6, rgba(color, 0.15));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return c;
}
