// Звери и нечисть: волк, кабан, паук, жаба, болотный огонёк, летучая мышь.
// Нечеловекоподобные существа рисуются в профиль (вправо), влево — отражением.
import { canvas, shade, rgba, ellipseShadow, mix } from "./paint.js";

function body(ctx, x, y, rx, ry, col, light = 0.25) {
  const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.6, 1, x, y, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, shade(col, light)); g.addColorStop(0.6, col); g.addColorStop(1, shade(col, -0.55));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
}
function leg(ctx, x, y, len, ang, w, col) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round";
  const kx = x + Math.sin(ang) * len * 0.5, ky = y + len * 0.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky); ctx.lineTo(kx + Math.sin(ang * 0.6) * len * 0.5, y + len); ctx.stroke();
}
function fur(ctx, x, y, rx, ry, col, n, rnd) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd());
    const px = x + Math.cos(a) * rx * d, py = y + Math.sin(a) * ry * d;
    ctx.strokeStyle = py < y ? rgba(shade(col, 0.35), 0.35) : rgba(shade(col, -0.5), 0.4);
    ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 2.5, py + 1.5); ctx.stroke();
  }
}
function seeded(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

// p: фаза ходьбы 0..1; a: атака 0..1 или -1
function wolf(ctx, p, a, o) {
  const col = o.col || "#4a4846", rnd = seeded(7);
  const W = 80, gy = 54, s = Math.sin(p * Math.PI * 2);
  const lunge = a >= 0 ? Math.sin(a * Math.PI) * 8 : 0;
  ellipseShadow(ctx, 40, gy, 28, 5, 0.45);
  ctx.save(); ctx.translate(lunge, -Math.abs(s) * 1.2);
  // хвост
  ctx.strokeStyle = shade(col, -0.2); ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(18, 32); ctx.quadraticCurveTo(6, 30 + s * 3, 4, 40); ctx.stroke();
  // дальние ноги
  leg(ctx, 26, 38, 16, -s * 0.6, 4.5, shade(col, -0.45)); leg(ctx, 52, 38, 16, s * 0.6, 4.5, shade(col, -0.45));
  body(ctx, 38, 33, 22, 10, col);
  fur(ctx, 38, 33, 20, 9, col, 70, rnd);
  // ближние ноги
  leg(ctx, 30, 38, 16, s * 0.6, 5, shade(col, -0.2)); leg(ctx, 55, 38, 16, -s * 0.6, 5, shade(col, -0.2));
  // загривок и голова
  body(ctx, 56, 27, 10, 10, shade(col, 0.05));
  ctx.save(); ctx.translate(64, 25); ctx.rotate(a >= 0 ? -0.15 + a * 0.3 : 0.1);
  body(ctx, 4, 0, 9, 6.5, col);
  ctx.fillStyle = shade(col, -0.2); ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(18, 1); ctx.lineTo(17, 4); ctx.lineTo(6, 5); ctx.fill();
  ctx.fillStyle = "#121010"; ctx.beginPath(); ctx.arc(17.5, 2, 1.4, 0, 7); ctx.fill();
  if (a >= 0) { ctx.fillStyle = "#3a0a0a"; ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(17, 4); ctx.lineTo(9, 8); ctx.fill(); ctx.fillStyle = "#ddd"; ctx.fillRect(12, 4, 1, 2); ctx.fillRect(15, 4, 1, 1.5); }
  ctx.fillStyle = shade(col, -0.3); ctx.beginPath(); ctx.moveTo(-1, -4); ctx.lineTo(1, -12); ctx.lineTo(5, -5); ctx.fill();
  ctx.fillStyle = o.eye || "#e8c040"; ctx.beginPath(); ctx.arc(8, -1.5, 1.3, 0, 7); ctx.fill();
  ctx.fillStyle = rgba(o.eye || "#e8c040", 0.3); ctx.beginPath(); ctx.arc(8, -1.5, 3, 0, 7); ctx.fill();
  ctx.restore(); ctx.restore();
}

function boar(ctx, p, a, o) {
  const col = o.col || "#3a2c22", rnd = seeded(11);
  const gy = 54, s = Math.sin(p * Math.PI * 2);
  const lunge = a >= 0 ? Math.sin(a * Math.PI) * 10 : 0;
  ellipseShadow(ctx, 40, gy, 28, 6, 0.5);
  ctx.save(); ctx.translate(lunge, -Math.abs(s));
  leg(ctx, 24, 40, 13, -s * 0.5, 5, shade(col, -0.5)); leg(ctx, 50, 40, 13, s * 0.5, 5, shade(col, -0.5));
  body(ctx, 36, 34, 24, 13, col);
  // щетина на хребте
  ctx.strokeStyle = shade(col, -0.4); ctx.lineWidth = 1.2;
  for (let i = 0; i < 18; i++) { const x = 18 + i * 2.4; ctx.beginPath(); ctx.moveTo(x, 22 + Math.abs(i - 9) * 0.25); ctx.lineTo(x - 1, 17 + Math.abs(i - 9) * 0.3); ctx.stroke(); }
  fur(ctx, 36, 34, 22, 11, col, 80, rnd);
  leg(ctx, 28, 41, 13, s * 0.5, 5.5, shade(col, -0.3)); leg(ctx, 53, 41, 13, -s * 0.5, 5.5, shade(col, -0.3));
  body(ctx, 60, 36, 10, 9, shade(col, -0.05));
  ctx.fillStyle = "#5a4038"; ctx.beginPath(); ctx.ellipse(70, 39, 4, 4.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#e8e0c8"; ctx.beginPath(); ctx.moveTo(66, 42); ctx.quadraticCurveTo(72, 38, 71, 32); ctx.lineTo(69, 37); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#c83020"; ctx.beginPath(); ctx.arc(62, 32, 1.4, 0, 7); ctx.fill();
  ctx.fillStyle = shade(col, -0.3); ctx.beginPath(); ctx.moveTo(55, 28); ctx.lineTo(54, 20); ctx.lineTo(59, 26); ctx.fill();
  ctx.restore();
}

function spider(ctx, p, a, o) {
  const col = o.col || "#2a2422";
  const gy = 50, s = Math.sin(p * Math.PI * 2);
  ellipseShadow(ctx, 40, gy, 26, 6, 0.5);
  const rise = a >= 0 ? Math.sin(a * Math.PI) * 6 : 0;
  ctx.save(); ctx.translate(a >= 0 ? Math.sin(a * Math.PI) * 6 : 0, -rise);
  for (let side = 0; side < 2; side++) for (let i = 0; i < 4; i++) {
    const ph = s * (i % 2 ? 1 : -1) * (side ? 1 : -1);
    const bx = 40 + (i - 1.5) * 4, by = 36;
    const dir = i < 2 ? 1 : -1;
    const kx = bx + dir * (10 + i * 2) + ph * 3, ky = by - 12 + (side ? 2 : 0);
    const fx = bx + dir * (18 + i * 3) + ph * 4, fy = gy - 2 + (side ? 0 : -3);
    ctx.strokeStyle = side ? shade(col, -0.1) : shade(col, -0.5); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  }
  body(ctx, 28, 34, 15, 12, col);
  ctx.fillStyle = rgba(o.mark || "#8a2a20", 0.85); ctx.beginPath(); ctx.moveTo(24, 28); ctx.lineTo(30, 33); ctx.lineTo(24, 38); ctx.lineTo(19, 33); ctx.fill();
  body(ctx, 48, 36, 8, 7, shade(col, 0.1));
  ctx.fillStyle = o.eye || "#d03020";
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(52 + (i % 2) * 2.5, 33 + Math.floor(i / 2) * 2.5, 1, 0, 7); ctx.fill(); }
  ctx.strokeStyle = "#1a1210"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(55, 39); ctx.lineTo(58, 43); ctx.moveTo(53, 40); ctx.lineTo(55, 44); ctx.stroke();
  ctx.restore();
}

function toad(ctx, p, a, o) {
  const col = o.col || "#3a4a2a";
  const gy = 54, hop = Math.abs(Math.sin(p * Math.PI * 2)) * 4;
  ellipseShadow(ctx, 40, gy, 26, 6, 0.5);
  ctx.save(); ctx.translate(0, -hop);
  ctx.fillStyle = shade(col, -0.4); ctx.beginPath(); ctx.ellipse(24, 46, 10, 6, -0.3, 0, 7); ctx.fill();
  body(ctx, 38, 38, 24, 15, col);
  for (let i = 0; i < 18; i++) { ctx.fillStyle = rgba(shade(col, -0.45), 0.7); ctx.beginPath(); ctx.arc(22 + ((i * 37) % 32), 30 + ((i * 13) % 16), 1.5 + (i % 3), 0, 7); ctx.fill(); }
  ctx.fillStyle = mix(col, "#c8b880", 0.4); ctx.beginPath(); ctx.ellipse(44, 47, 14, 5, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = shade(col, -0.2); ctx.beginPath(); ctx.ellipse(54, 47, 7, 4, 0.3, 0, 7); ctx.fill();
  body(ctx, 52, 27, 5, 5, col);
  ctx.fillStyle = "#e8c030"; ctx.beginPath(); ctx.arc(53, 26, 2.6, 0, 7); ctx.fill(); ctx.fillStyle = "#111"; ctx.fillRect(52, 25.5, 3, 1);
  ctx.strokeStyle = "#1a1a10"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(48, 37); ctx.quadraticCurveTo(56, 40, 62, 35); ctx.stroke();
  if (a >= 0) { ctx.strokeStyle = "#a04050"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(60, 36); ctx.lineTo(60 + a * 20, 36 - a * 3); ctx.stroke(); }
  ctx.restore();
}

function wisp(ctx, p, a, o) {
  const col = o.col || "#7ac0ff";
  const y = 30 + Math.sin(p * Math.PI * 2) * 3;
  ellipseShadow(ctx, 40, 54, 10, 3, 0.25);
  for (let r = 22; r > 2; r -= 4) {
    ctx.fillStyle = rgba(col, 0.08 + (22 - r) * 0.02); ctx.beginPath(); ctx.arc(40, y, r * (a >= 0 ? 1 + a * 0.3 : 1), 0, 7); ctx.fill();
  }
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(40, y, 3.5, 0, 7); ctx.fill();
  for (let i = 0; i < 4; i++) { const t = (p + i / 4) % 1; ctx.fillStyle = rgba(col, 0.5 * (1 - t)); ctx.beginPath(); ctx.arc(40 - 8 + Math.sin(i * 2) * 6, y + 6 + t * 14, 2 * (1 - t) + 0.5, 0, 7); ctx.fill(); }
}

function bat(ctx, p, a, o) {
  const col = o.col || "#2a2226";
  const y = 26 + Math.sin(p * Math.PI * 4) * 2, flap = Math.sin(p * Math.PI * 4);
  ellipseShadow(ctx, 40, 54, 12, 3, 0.25);
  ctx.fillStyle = shade(col, -0.2);
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(40, y); ctx.quadraticCurveTo(40 + s * 12, y - 10 * flap - 4, 40 + s * 22, y - 2 * flap); ctx.quadraticCurveTo(40 + s * 14, y + 2, 40 + s * 10, y + 6); ctx.quadraticCurveTo(40 + s * 6, y + 2, 40, y + 4); ctx.fill(); }
  body(ctx, 40, y + 1, 5, 6, col);
  ctx.fillStyle = "#e03030"; ctx.fillRect(37.5, y - 1, 1.5, 1.5); ctx.fillRect(41, y - 1, 1.5, 1.5);
}

export const CREATURE_DRAW = { wolf, boar, spider, toad, wisp, bat };

// Лист: 1 строка, 4 кадра ходьбы + 3 кадра атаки. Кадр 80×64.
export function buildCreatureSheet(kind, opts = {}, res = 2) {
  const fw = 80 * res, fh = 64 * res;
  const c = canvas(fw * 7, fh), ctx = c.getContext("2d");
  for (let f = 0; f < 7; f++) {
    ctx.save(); ctx.translate(f * fw, 0); ctx.scale(res, res);
    CREATURE_DRAW[kind](ctx, f < 4 ? f / 4 : 0, f < 4 ? -1 : (f - 4) / 2, opts);
    ctx.restore();
  }
  return c;
}
