// Объекты мира: деревья, камни, дома, ресурсы. Рисуются кодом в мрачной «живописной» манере.
// Каждый объект: { w, h, ax, ay (точка опоры у земли), draw(ctx, rnd) }.
import { canvas, shade, rgba, ellipseShadow, radial, blob, mix } from "./paint.js";
import { mulberry32 } from "../core/rng.js";

const MOON = "#9fb4c8"; // холодный контровой свет

function trunk(ctx, x, y, w, h, col = "#2b2017") {
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, shade(col, 0.15)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.55));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w * 1.3, y); ctx.quadraticCurveTo(x - w * 0.8, y - h * 0.3, x - w * 0.7, y - h);
  ctx.lineTo(x + w * 0.7, y - h); ctx.quadraticCurveTo(x + w * 0.8, y - h * 0.3, x + w * 1.3, y);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - w * 0.5 + i * w * 0.3, y - 2); ctx.lineTo(x - w * 0.4 + i * w * 0.28, y - h * 0.9); ctx.stroke(); }
}

function pine(ctx, rnd, W, H, hue = "#1d2a1a") {
  const cx = W / 2, base = H - 14;
  ellipseShadow(ctx, cx + 8, base, W * 0.38, 14, 0.45);
  trunk(ctx, cx, base, 7, 40);
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const y = base - 26 - t * (H - 70);
    const w = (W * 0.46) * (1 - t * 0.72);
    const h = 52 - t * 12;
    const col = shade(hue, -0.1 + t * 0.12);
    const g = ctx.createLinearGradient(cx - w, y - h, cx + w, y);
    g.addColorStop(0, shade(col, 0.25)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.6));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(cx, y - h - 6);
    const n = 9;
    for (let k = 0; k <= n; k++) { // правый край, рваный
      const f = k / n;
      ctx.lineTo(cx + w * f + (rnd() - 0.5) * 5, y - h + h * f + (k % 2 ? 6 : -2));
    }
    for (let k = n; k >= 0; k--) {
      const f = k / n;
      ctx.lineTo(cx - w * f + (rnd() - 0.5) * 5, y - h + h * f + (k % 2 ? 6 : -2));
    }
    ctx.closePath(); ctx.fill();
    // нижняя тень яруса
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(cx, y + 2, w * 0.8, 6, 0, 0, Math.PI); ctx.fill();
    // иглы-штрихи
    for (let k = 0; k < 26; k++) {
      const f = rnd(), side = rnd() < 0.5 ? -1 : 1;
      const px = cx + side * w * f * 0.9, py = y - h + h * f + rnd() * 6;
      ctx.strokeStyle = side < 0 ? rgba(MOON, 0.12 + rnd() * 0.1) : "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + side * 5, py + 4); ctx.stroke();
    }
  }
}

function oak(ctx, rnd, W, H, hue = "#24301a") {
  const cx = W / 2, base = H - 12;
  ellipseShadow(ctx, cx + 10, base, W * 0.42, 16, 0.45);
  trunk(ctx, cx, base, 9, 70, "#2a1f17");
  // ветви
  ctx.strokeStyle = "#241a12"; ctx.lineWidth = 5; ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx, base - 55); ctx.quadraticCurveTo(cx + (i - 1) * 25, base - 80, cx + (i - 1) * 40, base - 95); ctx.stroke(); }
  const cy = H * 0.38;
  const blobs = [];
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * W * 0.24;
    blobs.push([cx + Math.cos(a) * d * 1.2, cy + Math.sin(a) * d * 0.8, 22 + rnd() * 18]);
  }
  blobs.sort((a, b) => a[1] - b[1]);
  // тёмная масса
  for (const [x, y, r] of blobs) { ctx.fillStyle = shade(hue, -0.55); blob(ctx, x + 3, y + 6, r, rnd); ctx.fill(); }
  for (const [x, y, r] of blobs) {
    ctx.fillStyle = radial(ctx, x, y, r, shade(hue, (rnd() - 0.5) * 0.2), 0.28, -0.6);
    blob(ctx, x, y, r, rnd); ctx.fill();
  }
  // листовые мазки и лунные блики
  for (let i = 0; i < 140; i++) {
    const [x, y, r] = blobs[Math.floor(rnd() * blobs.length)];
    const a = rnd() * Math.PI * 2, d = rnd() * r;
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    const top = py < y - r * 0.2 && px < x;
    ctx.fillStyle = top ? rgba(mix(hue, MOON, 0.35), 0.35) : rgba(shade(hue, -0.4), 0.5);
    ctx.beginPath(); ctx.ellipse(px, py, 3 + rnd() * 2, 2, rnd() * 3, 0, 7); ctx.fill();
  }
}

function deadTree(ctx, rnd, W, H) {
  const cx = W / 2, base = H - 10;
  ellipseShadow(ctx, cx + 6, base, W * 0.3, 10, 0.4);
  trunk(ctx, cx, base, 8, 60, "#2a2622");
  const branch = (x, y, a, len, w, depth) => {
    if (depth <= 0 || len < 6) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    ctx.strokeStyle = mix("#2a2622", "#55504a", depth / 8); ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo((x + x2) / 2 + (rnd() - 0.5) * 8, (y + y2) / 2, x2, y2); ctx.stroke();
    const n = 2 + (rnd() < 0.3 ? 1 : 0);
    for (let i = 0; i < n; i++) branch(x2, y2, a + (rnd() - 0.5) * 1.3, len * (0.6 + rnd() * 0.2), w * 0.65, depth - 1);
  };
  branch(cx, base - 58, -Math.PI / 2, 38, 8, 6);
}

function bush(ctx, rnd, W, H, hue = "#22301a", berries = false) {
  const cx = W / 2, base = H - 8;
  ellipseShadow(ctx, cx + 4, base, W * 0.42, 9, 0.4);
  const bl = [];
  for (let i = 0; i < 7; i++) bl.push([cx + (rnd() - 0.5) * W * 0.5, base - 14 - rnd() * H * 0.35, 10 + rnd() * 9]);
  bl.sort((a, b) => a[1] - b[1]);
  for (const [x, y, r] of bl) { ctx.fillStyle = radial(ctx, x, y, r, hue, 0.25, -0.6); blob(ctx, x, y, r, rnd); ctx.fill(); }
  for (let i = 0; i < 40; i++) {
    const [x, y, r] = bl[Math.floor(rnd() * bl.length)];
    ctx.fillStyle = rgba(mix(hue, MOON, 0.3), 0.25);
    ctx.beginPath(); ctx.ellipse(x - r * 0.3 + (rnd() - 0.5) * r, y - r * 0.4 + (rnd() - 0.5) * r * 0.6, 2.5, 1.5, rnd() * 3, 0, 7); ctx.fill();
  }
  if (berries) for (let i = 0; i < 9; i++) {
    const [x, y, r] = bl[Math.floor(rnd() * bl.length)];
    ctx.fillStyle = "#6a1a22"; ctx.beginPath(); ctx.arc(x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r * 0.6, 2.2, 0, 7); ctx.fill();
  }
}

function rock(ctx, rnd, W, H, col = "#3a3733", moss = true) {
  const cx = W / 2, base = H - 8;
  ellipseShadow(ctx, cx + 5, base, W * 0.46, 8, 0.5);
  const r = Math.min(W, H) * 0.42;
  ctx.fillStyle = shade(col, -0.5); blob(ctx, cx + 2, base - r * 0.8, r, rnd, 7, 0.18); ctx.fill();
  const g = ctx.createLinearGradient(cx - r, base - r * 2, cx + r, base);
  g.addColorStop(0, shade(col, 0.3)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.6));
  ctx.fillStyle = g; blob(ctx, cx, base - r * 0.9, r * 0.95, rnd, 7, 0.16); ctx.fill();
  // грани
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx + (rnd() - 0.5) * r, base - r * 1.5); ctx.lineTo(cx + (rnd() - 0.5) * r, base - r * 0.4); ctx.stroke(); }
  ctx.fillStyle = rgba(MOON, 0.12); blob(ctx, cx - r * 0.3, base - r * 1.35, r * 0.35, rnd, 6, 0.3); ctx.fill();
  if (moss) for (let i = 0; i < 30; i++) {
    ctx.fillStyle = rgba("#3b4a22", 0.5);
    ctx.beginPath(); ctx.arc(cx + (rnd() - 0.5) * r * 1.4, base - r * 1.3 + rnd() * r * 0.6, 1.5 + rnd() * 2, 0, 7); ctx.fill();
  }
}

function grassTuft(ctx, rnd, W, H, cols = ["#2d3f1e", "#3c5226", "#4b5f2c"]) {
  const cx = W / 2, base = H - 4;
  for (let i = 0; i < 22; i++) {
    const x = cx + (rnd() - 0.5) * W * 0.6, h = H * (0.4 + rnd() * 0.55), lean = (rnd() - 0.5) * 14;
    ctx.strokeStyle = cols[Math.floor(rnd() * cols.length)]; ctx.lineWidth = 1.4 + rnd();
    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + lean * 0.3, base - h * 0.6, x + lean, base - h); ctx.stroke();
  }
}

function fern(ctx, rnd, W, H) {
  const cx = W / 2, base = H - 4;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.38, len = H * (0.6 + rnd() * 0.3);
    const ex = cx + Math.cos(a) * len, ey = base + Math.sin(a) * len * 0.8;
    ctx.strokeStyle = "#2a3c1c"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, base); ctx.quadraticCurveTo((cx + ex) / 2, ey, ex, ey + 6); ctx.stroke();
    for (let k = 1; k < 8; k++) {
      const f = k / 8, px = cx + (ex - cx) * f, py = base + (ey - base) * f - 2;
      ctx.strokeStyle = k < 4 ? "#38502a" : "#2f4322";
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 5 * (1 - f), py + 4); ctx.moveTo(px, py); ctx.lineTo(px + 5 * (1 - f), py + 4); ctx.stroke();
    }
  }
}

function mushrooms(ctx, rnd, W, H, cap = "#5a2a20", glowc = null) {
  const base = H - 6;
  for (let i = 0; i < 4; i++) {
    const x = W * 0.25 + rnd() * W * 0.5, h = 6 + rnd() * 10, r = 4 + rnd() * 5;
    ctx.fillStyle = "#b8ab95"; ctx.fillRect(x - 1.5, base - h, 3, h);
    if (glowc) { ctx.fillStyle = rgba(glowc, 0.25); ctx.beginPath(); ctx.arc(x, base - h, r * 2.5, 0, 7); ctx.fill(); }
    ctx.fillStyle = radial(ctx, x, base - h, r, glowc || cap, 0.4, -0.4);
    ctx.beginPath(); ctx.ellipse(x, base - h, r, r * 0.6, 0, Math.PI, 0); ctx.fill();
    if (!glowc) { ctx.fillStyle = "rgba(230,220,200,0.6)"; ctx.beginPath(); ctx.arc(x - r * 0.3, base - h - r * 0.3, 1, 0, 7); ctx.fill(); }
  }
}

function log(ctx, rnd, W, H) {
  const cy = H - 16;
  ellipseShadow(ctx, W / 2 + 4, H - 8, W * 0.48, 8, 0.4);
  const g = ctx.createLinearGradient(0, cy - 12, 0, cy + 12);
  g.addColorStop(0, "#4a3a2a"); g.addColorStop(0.5, "#2e241a"); g.addColorStop(1, "#16110c");
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(10, cy - 12, W - 30, 24, 10); ctx.fill();
  ctx.fillStyle = "#5a4a34"; ctx.beginPath(); ctx.ellipse(W - 20, cy, 9, 12, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#3a2c1e"; ctx.lineWidth = 1;
  for (let r = 3; r < 10; r += 3) { ctx.beginPath(); ctx.ellipse(W - 20, cy, r * 0.75, r, 0, 0, 7); ctx.stroke(); }
  for (let i = 0; i < 20; i++) { ctx.fillStyle = rgba("#3b4a22", 0.6); ctx.beginPath(); ctx.arc(14 + rnd() * (W - 40), cy - 10 + rnd() * 6, 2 + rnd() * 2, 0, 7); ctx.fill(); }
}

function stump(ctx, rnd, W, H) {
  const cx = W / 2, base = H - 8;
  ellipseShadow(ctx, cx + 3, base, W * 0.4, 7, 0.4);
  trunk(ctx, cx, base, 11, 20, "#30241a");
  ctx.fillStyle = "#5c4a33"; ctx.beginPath(); ctx.ellipse(cx, base - 20, 12, 6, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#3e3022"; for (let r = 3; r < 12; r += 3) { ctx.beginPath(); ctx.ellipse(cx, base - 20, r, r / 2, 0, 0, 7); ctx.stroke(); }
}

function gravestone(ctx, rnd, W, H, v = 0) {
  const cx = W / 2, base = H - 8;
  ellipseShadow(ctx, cx + 4, base, W * 0.4, 6, 0.45);
  const col = "#4a4844";
  const g = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0);
  g.addColorStop(0, shade(col, 0.2)); g.addColorStop(1, shade(col, -0.5));
  ctx.fillStyle = g;
  if (v === 2) { // крест
    ctx.fillRect(cx - 3.5, base - 40, 7, 40); ctx.fillRect(cx - 12, base - 32, 24, 6);
  } else {
    ctx.save(); ctx.translate(cx, base); ctx.rotate((rnd() - 0.5) * 0.25);
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-12, -26); ctx.arc(0, -26, 12, Math.PI, 0); ctx.lineTo(12, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.moveTo(-6, -24); ctx.lineTo(6, -24); ctx.moveTo(-6, -18); ctx.lineTo(4, -18); ctx.stroke();
    if (v === 1) { ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.moveTo(4, -36); ctx.lineTo(-2, -20); ctx.lineTo(3, -10); ctx.stroke(); }
    ctx.restore();
  }
  for (let i = 0; i < 12; i++) { ctx.fillStyle = rgba("#3b4a22", 0.5); ctx.beginPath(); ctx.arc(cx + (rnd() - 0.5) * 22, base - rnd() * 8, 2, 0, 7); ctx.fill(); }
}

function house(ctx, rnd, W, H, opts = {}) {
  const roof = opts.roof || "#2c2522", wall = opts.wall || "#6b604f", wood = "#2a1e15";
  const x0 = 18, x1 = W - 18, base = H - 12, wallH = opts.wallH || 70, roofH = opts.roofH || 95;
  ellipseShadow(ctx, W / 2 + 14, base + 2, W * 0.52, 18, 0.5);
  // стена (фасад)
  const wg = ctx.createLinearGradient(0, base - wallH, 0, base);
  wg.addColorStop(0, shade(wall, -0.2)); wg.addColorStop(1, shade(wall, -0.45));
  ctx.fillStyle = wg; ctx.fillRect(x0, base - wallH, x1 - x0, wallH);
  // фахверк
  ctx.fillStyle = wood;
  ctx.fillRect(x0, base - wallH, x1 - x0, 6); ctx.fillRect(x0, base - 6, x1 - x0, 6);
  const posts = Math.round((x1 - x0) / 46);
  for (let i = 0; i <= posts; i++) ctx.fillRect(x0 + i * (x1 - x0 - 7) / posts, base - wallH, 7, wallH);
  ctx.strokeStyle = wood; ctx.lineWidth = 5;
  for (let i = 0; i < posts; i++) {
    const a = x0 + i * (x1 - x0 - 7) / posts + 7, b = x0 + (i + 1) * (x1 - x0 - 7) / posts;
    if (rnd() < 0.5) { ctx.beginPath(); ctx.moveTo(a, base - 6); ctx.lineTo(b, base - wallH + 6); ctx.stroke(); }
  }
  // окна с тёплым светом
  const winN = opts.windows ?? 2;
  for (let i = 0; i < winN; i++) {
    const wx = x0 + (i + 1) * (x1 - x0) / (winN + 1) - 11 + (i === 0 && opts.door !== false ? -24 : 18);
    const wy = base - wallH * 0.68;
    const lg = ctx.createRadialGradient(wx + 11, wy + 12, 1, wx + 11, wy + 12, 30);
    lg.addColorStop(0, "rgba(255,170,80,0.35)"); lg.addColorStop(1, "rgba(255,170,80,0)");
    ctx.fillStyle = lg; ctx.fillRect(wx - 20, wy - 20, 62, 64);
    const gg = ctx.createLinearGradient(wx, wy, wx, wy + 24);
    gg.addColorStop(0, "#f2b062"); gg.addColorStop(1, "#a0521e");
    ctx.fillStyle = gg; ctx.fillRect(wx, wy, 22, 24);
    ctx.fillStyle = wood; ctx.fillRect(wx + 10, wy, 2.5, 24); ctx.fillRect(wx, wy + 11, 22, 2.5);
    ctx.strokeStyle = "#1a120c"; ctx.lineWidth = 3; ctx.strokeRect(wx, wy, 22, 24);
  }
  // дверь
  if (opts.door !== false) {
    const dx = W / 2 + 10, dw = 30, dh = 46;
    ctx.fillStyle = "#1a120c"; ctx.fillRect(dx - 3, base - dh - 3, dw + 6, dh + 3);
    const dg = ctx.createLinearGradient(dx, 0, dx + dw, 0); dg.addColorStop(0, "#4a3220"); dg.addColorStop(1, "#24170e");
    ctx.fillStyle = dg; ctx.fillRect(dx, base - dh, dw, dh);
    ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(dx + i * dw / 4, base - dh); ctx.lineTo(dx + i * dw / 4, base); ctx.stroke(); }
    ctx.fillStyle = "#8a7a5a"; ctx.beginPath(); ctx.arc(dx + dw - 6, base - dh / 2, 2, 0, 7); ctx.fill();
  }
  // крыша (вид сверху-спереди): трапеция с черепицей/соломой
  const ry = base - wallH, over = 14;
  const rg = ctx.createLinearGradient(0, ry - roofH, 0, ry);
  rg.addColorStop(0, shade(roof, 0.12)); rg.addColorStop(0.7, roof); rg.addColorStop(1, shade(roof, -0.5));
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.moveTo(x0 - over, ry + 8); ctx.lineTo(x0 + 18, ry - roofH); ctx.lineTo(x1 - 18, ry - roofH); ctx.lineTo(x1 + over, ry + 8); ctx.closePath(); ctx.fill();
  // ряды черепицы
  for (let row = 0; row < 9; row++) {
    const f = row / 9, y = ry - roofH + f * (roofH + 8);
    const xa = x0 + 18 - (18 + over) * f, xb = x1 - 18 + (18 + over) * f;
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
    for (let x = xa + (row % 2) * 7; x < xb; x += 14) {
      ctx.fillStyle = rgba(shade(roof, (rnd() - 0.5) * 0.4), 0.6);
      ctx.fillRect(x, y + 1, 12, roofH / 9 - 2);
    }
  }
  ctx.fillStyle = rgba(MOON, 0.08);
  ctx.beginPath(); ctx.moveTo(x0 + 18, ry - roofH); ctx.lineTo(x1 - 18, ry - roofH); ctx.lineTo(x1 - 30, ry - roofH + 16); ctx.lineTo(x0 + 30, ry - roofH + 16); ctx.fill();
  ctx.fillStyle = shade(roof, -0.3); ctx.fillRect(x0 + 14, ry - roofH - 4, x1 - x0 - 28, 6);
  if (opts.chimney) {
    const cx = x1 - 50;
    ctx.fillStyle = "#3a3430"; ctx.fillRect(cx, ry - roofH - 26, 18, 40);
    ctx.fillStyle = "#24201d"; ctx.fillRect(cx - 2, ry - roofH - 30, 22, 6);
  }
  if (opts.sign) {
    ctx.fillStyle = "#1a120c"; ctx.fillRect(x0 + 6, base - wallH - 2, 3, 28);
    ctx.fillStyle = "#3a2a1a"; ctx.fillRect(x0 - 16, base - wallH + 20, 30, 22);
    ctx.fillStyle = opts.sign; ctx.font = "bold 16px serif"; ctx.textAlign = "center"; ctx.fillText(opts.signGlyph || "◆", x0 - 1, base - wallH + 37);
  }
}

function well(ctx, rnd, W, H) {
  const cx = W / 2, base = H - 10;
  ellipseShadow(ctx, cx + 5, base, 40, 10, 0.45);
  ctx.fillStyle = "#3a3632"; ctx.beginPath(); ctx.ellipse(cx, base - 16, 30, 14, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#4a4640"; ctx.fillRect(cx - 30, base - 30, 60, 16);
  ctx.fillStyle = "#0a0c0c"; ctx.beginPath(); ctx.ellipse(cx, base - 30, 24, 10, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#585348"; ctx.beginPath(); ctx.ellipse(cx, base - 30, 30, 13, 0, 0, Math.PI * 2); ctx.lineWidth = 5; ctx.strokeStyle = "#5a554c"; ctx.stroke();
  ctx.fillStyle = "#2a1e15"; ctx.fillRect(cx - 28, base - 80, 5, 52); ctx.fillRect(cx + 23, base - 80, 5, 52);
  ctx.fillStyle = "#2c2522"; ctx.beginPath(); ctx.moveTo(cx - 38, base - 74); ctx.lineTo(cx, base - 96); ctx.lineTo(cx + 38, base - 74); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#7a6a50"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, base - 78); ctx.lineTo(cx, base - 44); ctx.stroke();
  ctx.fillStyle = "#3a2a1a"; ctx.fillRect(cx - 6, base - 46, 12, 10);
}

function lantern(ctx, rnd, W, H) {
  const cx = W / 2, base = H - 6;
  ellipseShadow(ctx, cx + 3, base, 10, 4, 0.4);
  ctx.fillStyle = "#1c1814"; ctx.fillRect(cx - 2.5, base - 80, 5, 80);
  ctx.fillRect(cx - 2, base - 80, 16, 3);
  const lg = ctx.createRadialGradient(cx + 13, base - 66, 1, cx + 13, base - 66, 14);
  lg.addColorStop(0, "#ffe2a0"); lg.addColorStop(0.5, "#e08a30"); lg.addColorStop(1, "rgba(224,138,48,0)");
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx + 13, base - 66, 14, 0, 7); ctx.fill();
  ctx.strokeStyle = "#1c1814"; ctx.lineWidth = 1.5; ctx.strokeRect(cx + 8, base - 74, 10, 14);
}

function campfire(ctx, rnd, W, H) {
  const cx = W / 2, base = H - 12;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.fillStyle = "#3a3632"; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 18, base - 6 + Math.sin(a) * 8, 6, 4, 0, 0, 7); ctx.fill(); }
  ctx.strokeStyle = "#2a1c12"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(cx - 14, base - 2); ctx.lineTo(cx + 12, base - 12); ctx.moveTo(cx + 14, base - 2); ctx.lineTo(cx - 12, base - 12); ctx.stroke();
  const fg = ctx.createRadialGradient(cx, base - 16, 1, cx, base - 14, 16);
  fg.addColorStop(0, "#fff0b0"); fg.addColorStop(0.4, "#f09030"); fg.addColorStop(1, "rgba(200,60,20,0)");
  ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(cx - 12, base - 8); ctx.quadraticCurveTo(cx - 8, base - 30, cx, base - 40); ctx.quadraticCurveTo(cx + 8, base - 28, cx + 12, base - 8); ctx.closePath(); ctx.fill();
}

function crate(ctx, rnd, W, H) {
  const cx = W / 2, base = H - 6;
  ellipseShadow(ctx, cx + 4, base, 22, 6, 0.4);
  ctx.fillStyle = "#4a3624"; ctx.fillRect(cx - 18, base - 30, 36, 30);
  ctx.fillStyle = "#5e4630"; ctx.fillRect(cx - 18, base - 40, 36, 12);
  ctx.strokeStyle = "#24180e"; ctx.lineWidth = 2; ctx.strokeRect(cx - 18, base - 30, 36, 30);
  ctx.beginPath(); ctx.moveTo(cx - 18, base - 30); ctx.lineTo(cx + 18, base); ctx.stroke();
}

function barrel(ctx, rnd, W, H) {
  const cx = W / 2, base = H - 6;
  ellipseShadow(ctx, cx + 4, base, 18, 6, 0.4);
  const g = ctx.createLinearGradient(cx - 16, 0, cx + 16, 0); g.addColorStop(0, "#5a4230"); g.addColorStop(0.4, "#4a3424"); g.addColorStop(1, "#1e140c");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, base - 18, 16, 20, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#3a2a1c"; ctx.beginPath(); ctx.ellipse(cx, base - 36, 13, 5, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#2a2622"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, base - 26, 15.5, 5, 0, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx, base - 10, 15, 5, 0, 0, Math.PI); ctx.stroke();
}

function fence(ctx, rnd, W, H) {
  const base = H - 6;
  ctx.fillStyle = "#2a1e15";
  for (let i = 0; i < 4; i++) { const x = 6 + i * (W - 16) / 3; ctx.fillRect(x, base - 34 + rnd() * 4, 5, 34); }
  ctx.fillStyle = "#3a2a1c"; ctx.fillRect(4, base - 28, W - 8, 4); ctx.fillRect(4, base - 14, W - 8, 4);
}

function stall(ctx, rnd, W, H, cloth = "#5a2020") {
  const cx = W / 2, base = H - 8;
  ellipseShadow(ctx, cx + 6, base, W * 0.46, 10, 0.45);
  ctx.fillStyle = "#3a2a1c"; ctx.fillRect(14, base - 34, W - 28, 30);
  ctx.fillStyle = "#2a1e15"; ctx.fillRect(14, base - 90, 5, 86); ctx.fillRect(W - 19, base - 90, 5, 86);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = ["#6a5030", "#3a4a2a", "#5a2a1a", "#7a6a4a"][i % 4];
    ctx.beginPath(); ctx.arc(26 + i * (W - 52) / 5, base - 38, 6, 0, 7); ctx.fill();
  }
  const g = ctx.createLinearGradient(0, base - 104, 0, base - 76); g.addColorStop(0, shade(cloth, 0.15)); g.addColorStop(1, shade(cloth, -0.4));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(6, base - 80); ctx.lineTo(16, base - 104); ctx.lineTo(W - 16, base - 104); ctx.lineTo(W - 6, base - 80); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? shade(cloth, -0.3) : "#6a5a40"; ctx.beginPath(); ctx.arc(10 + i * (W - 20) / 6, base - 80, (W - 20) / 12, 0, Math.PI); ctx.fill(); }
}

function cart(ctx, rnd, W, H) {
  const base = H - 8;
  ellipseShadow(ctx, W / 2 + 6, base, W * 0.46, 10, 0.45);
  ctx.fillStyle = "#3a2a1c"; ctx.fillRect(12, base - 40, W - 40, 22);
  ctx.fillStyle = "#4a3624"; ctx.fillRect(12, base - 48, W - 40, 8);
  ctx.strokeStyle = "#2a1e15"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(W - 30, base - 30); ctx.lineTo(W - 4, base - 22); ctx.stroke();
  for (const x of [30, W - 50]) {
    ctx.strokeStyle = "#20160e"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, base - 14, 13, 0, 7); ctx.stroke();
    ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 12, base - 14 - Math.sin(a) * 12); ctx.lineTo(x + Math.cos(a) * 12, base - 14 + Math.sin(a) * 12); ctx.stroke(); }
  }
  ctx.fillStyle = "#6a5a3a"; ctx.beginPath(); ctx.ellipse(W / 2 - 16, base - 52, 24, 10, 0, 0, 7); ctx.fill();
}

function ruinWall(ctx, rnd, W, H) {
  const base = H - 8;
  ellipseShadow(ctx, W / 2 + 8, base, W * 0.5, 10, 0.45);
  const col = "#3e3b36";
  for (let row = 0; row < 6; row++) {
    const y = base - (row + 1) * 14, lim = W * (0.9 - row * 0.12 + rnd() * 0.15);
    for (let x = 6 + (row % 2) * 12; x < lim; x += 24 + rnd() * 4) {
      if (rnd() < 0.08 && row > 1) continue;
      const g = ctx.createLinearGradient(x, y, x + 22, y + 13); g.addColorStop(0, shade(col, 0.15 + (rnd() - 0.5) * 0.2)); g.addColorStop(1, shade(col, -0.45));
      ctx.fillStyle = g; ctx.fillRect(x, y, 22, 13);
      ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 1; ctx.strokeRect(x, y, 22, 13);
    }
  }
  for (let i = 0; i < 25; i++) { ctx.fillStyle = rgba("#2f3d1e", 0.6); ctx.beginPath(); ctx.arc(rnd() * W * 0.7, base - rnd() * 60, 2 + rnd() * 3, 0, 7); ctx.fill(); }
}

function pillar(ctx, rnd, W, H) {
  const cx = W / 2, base = H - 8;
  ellipseShadow(ctx, cx + 6, base, 26, 8, 0.45);
  const h = H * (0.55 + rnd() * 0.3);
  const g = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0); g.addColorStop(0, "#5a564e"); g.addColorStop(0.5, "#45413a"); g.addColorStop(1, "#1e1c19");
  ctx.fillStyle = g; ctx.fillRect(cx - 13, base - h, 26, h);
  ctx.fillStyle = "#4a463f"; ctx.fillRect(cx - 18, base - 10, 36, 10);
  ctx.beginPath(); ctx.moveTo(cx - 13, base - h); ctx.lineTo(cx - 6, base - h - 8); ctx.lineTo(cx + 2, base - h + 2); ctx.lineTo(cx + 13, base - h - 5); ctx.lineTo(cx + 13, base - h); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)"; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 7, base - h); ctx.lineTo(cx + i * 7, base - 10); ctx.stroke(); }
}

function mineEntrance(ctx, rnd, W, H) {
  const cx = W / 2, base = H - 10;
  rock(ctx, rnd, W, H, "#36322d", false);
  ctx.fillStyle = "#050505";
  ctx.beginPath(); ctx.moveTo(cx - 34, base); ctx.lineTo(cx - 30, base - 62); ctx.quadraticCurveTo(cx, base - 80, cx + 30, base - 62); ctx.lineTo(cx + 34, base); ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(0, base - 70, 0, base); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(30,20,10,0.5)");
  ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = "#3a2a1a"; ctx.fillRect(cx - 40, base - 70, 9, 70); ctx.fillRect(cx + 31, base - 70, 9, 70); ctx.fillRect(cx - 44, base - 76, 88, 10);
  ctx.strokeStyle = "#7a6a50"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 24, base); ctx.lineTo(cx - 14, base - 50); ctx.moveTo(cx + 24, base); ctx.lineTo(cx + 14, base - 50); ctx.stroke();
}

function reeds(ctx, rnd, W, H) {
  const base = H - 4;
  for (let i = 0; i < 16; i++) {
    const x = W * 0.2 + rnd() * W * 0.6, h = H * (0.5 + rnd() * 0.45), lean = (rnd() - 0.5) * 10;
    ctx.strokeStyle = ["#3a4224", "#4a4f2a", "#2e3620"][i % 3]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x, base - h * 0.5, x + lean, base - h); ctx.stroke();
    if (rnd() < 0.4) { ctx.fillStyle = "#3a2618"; ctx.beginPath(); ctx.ellipse(x + lean * 0.9, base - h + 6, 2.5, 7, lean * 0.03, 0, 7); ctx.fill(); }
  }
}

function bones(ctx, rnd, W, H) {
  const base = H - 6;
  ctx.strokeStyle = "#b8b0a0"; ctx.lineWidth = 3; ctx.lineCap = "round";
  for (let i = 0; i < 5; i++) { const x = W * 0.2 + rnd() * W * 0.6, y = base - rnd() * 12, a = rnd() * 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 4); ctx.stroke(); }
  ctx.fillStyle = "#c8c0b0"; ctx.beginPath(); ctx.arc(W / 2, base - 8, 6, 0, 7); ctx.fill();
  ctx.fillStyle = "#1a1612"; ctx.beginPath(); ctx.arc(W / 2 - 2, base - 9, 1.6, 0, 7); ctx.arc(W / 2 + 2.5, base - 9, 1.6, 0, 7); ctx.fill();
}

function signpost(ctx, rnd, W, H) {
  const cx = W / 2, base = H - 6;
  ellipseShadow(ctx, cx + 3, base, 12, 4, 0.4);
  ctx.fillStyle = "#2a1e15"; ctx.fillRect(cx - 3, base - 60, 6, 60);
  ctx.fillStyle = "#4a3624";
  ctx.beginPath(); ctx.moveTo(cx - 4, base - 56); ctx.lineTo(cx + 26, base - 56); ctx.lineTo(cx + 32, base - 50); ctx.lineTo(cx + 26, base - 44); ctx.lineTo(cx - 4, base - 44); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + 4, base - 40); ctx.lineTo(cx - 26, base - 40); ctx.lineTo(cx - 32, base - 34); ctx.lineTo(cx - 26, base - 28); ctx.lineTo(cx + 4, base - 28); ctx.fill();
}

function anvil(ctx, rnd, W, H) {
  const cx = W / 2, base = H - 6;
  ellipseShadow(ctx, cx + 3, base, 22, 6, 0.4);
  ctx.fillStyle = "#3a2a1c"; ctx.fillRect(cx - 10, base - 18, 20, 18);
  ctx.fillStyle = "#2a2a2e"; ctx.beginPath(); ctx.moveTo(cx - 20, base - 30); ctx.lineTo(cx + 14, base - 30); ctx.quadraticCurveTo(cx + 28, base - 30, cx + 24, base - 24); ctx.lineTo(cx - 20, base - 20); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(160,180,200,0.25)"; ctx.fillRect(cx - 18, base - 30, 30, 2);
}

// ---------- узлы ресурсов ----------
function oreVein(ctx, rnd, W, H, ore) {
  rock(ctx, rnd, W, H, "#34302c", false);
  const cx = W / 2, base = H - 8;
  for (let i = 0; i < 9; i++) {
    const x = cx + (rnd() - 0.5) * W * 0.5, y = base - 10 - rnd() * H * 0.45;
    ctx.fillStyle = rgba(ore, 0.25); ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
    ctx.fillStyle = radial(ctx, x, y, 4, ore, 0.5, -0.3);
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 3); ctx.lineTo(x - 4, y); ctx.closePath(); ctx.fill();
  }
}
function herbNode(ctx, rnd, W, H, flower) {
  const cx = W / 2, base = H - 6;
  ctx.fillStyle = rgba(flower, 0.12); ctx.beginPath(); ctx.arc(cx, base - 16, 22, 0, 7); ctx.fill();
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2, len = 14 + rnd() * 14;
    ctx.strokeStyle = "#35502a"; ctx.lineWidth = 2;
    const ex = cx + Math.cos(a) * len, ey = base + Math.sin(a) * len;
    ctx.beginPath(); ctx.moveTo(cx, base); ctx.quadraticCurveTo(cx + Math.cos(a) * len * 0.3, base - len * 0.5, ex, ey); ctx.stroke();
    ctx.fillStyle = "#3e5a2c"; ctx.beginPath(); ctx.ellipse(ex, ey, 4, 2, a, 0, 7); ctx.fill();
  }
  for (let i = 0; i < 5; i++) {
    const x = cx + (rnd() - 0.5) * 26, y = base - 18 - rnd() * 14;
    ctx.fillStyle = flower;
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 2.5, y + Math.sin(a) * 2.5, 2, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#e8d890"; ctx.beginPath(); ctx.arc(x, y, 1.2, 0, 7); ctx.fill();
  }
}
function fiberNode(ctx, rnd, W, H) {
  grassTuft(ctx, rnd, W, H, ["#6a6a3a", "#7a7444", "#5a5a30"]);
  for (let i = 0; i < 10; i++) { ctx.fillStyle = "#8a8a9a"; ctx.beginPath(); ctx.arc(W * 0.25 + rnd() * W * 0.5, H * 0.2 + rnd() * H * 0.3, 2, 0, 7); ctx.fill(); }
}
function woodNode(ctx, rnd, W, H, bark) {
  // молодое дерево для рубки (берёза/ясень)
  const cx = W / 2, base = H - 10;
  ellipseShadow(ctx, cx + 6, base, W * 0.34, 10, 0.4);
  const g = ctx.createLinearGradient(cx - 8, 0, cx + 8, 0); g.addColorStop(0, shade(bark, 0.2)); g.addColorStop(1, shade(bark, -0.5));
  ctx.fillStyle = g; ctx.fillRect(cx - 7, base - 90, 14, 90);
  ctx.fillStyle = "rgba(0,0,0,0.5)"; for (let i = 0; i < 8; i++) ctx.fillRect(cx - 6 + rnd() * 6, base - 10 - rnd() * 80, 5, 2);
  const hue = "#2f3a1e";
  for (let i = 0; i < 9; i++) {
    const x = cx + (rnd() - 0.5) * 50, y = base - 95 - rnd() * 40, r = 14 + rnd() * 10;
    ctx.fillStyle = radial(ctx, x, y, r, hue, 0.3, -0.55); blob(ctx, x, y, r, rnd); ctx.fill();
  }
  // зарубка
  ctx.fillStyle = "#c8a878"; ctx.beginPath(); ctx.moveTo(cx - 7, base - 26); ctx.lineTo(cx + 2, base - 22); ctx.lineTo(cx - 7, base - 18); ctx.fill();
}

function portalStones(ctx, rnd, W, H) {
  const cx = W / 2, base = H - 10;
  ctx.fillStyle = "rgba(150,190,255,0.1)"; ctx.beginPath(); ctx.ellipse(cx, base - 10, W * 0.42, 22, 0, 0, 7); ctx.fill();
  for (const sx of [-1, 1]) {
    const x = cx + sx * W * 0.32;
    ellipseShadow(ctx, x + 4, base, 16, 6, 0.4);
    const g = ctx.createLinearGradient(x - 10, 0, x + 10, 0); g.addColorStop(0, "#5a5a60"); g.addColorStop(1, "#1e1e22");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 10, base); ctx.lineTo(x - 8, base - 56); ctx.lineTo(x + 2, base - 64); ctx.lineTo(x + 10, base - 50); ctx.lineTo(x + 10, base); ctx.fill();
    ctx.fillStyle = "rgba(140,190,255,0.7)"; ctx.font = "12px serif"; ctx.textAlign = "center"; ctx.fillText("ᚱ", x, base - 30);
  }
}

function lily(ctx, rnd, W, H) {
  for (let i = 0; i < 4; i++) {
    const x = W * 0.2 + rnd() * W * 0.6, y = H * 0.3 + rnd() * H * 0.5, r = 6 + rnd() * 5;
    ctx.fillStyle = "#24361c"; ctx.beginPath(); ctx.arc(x, y, r, 0.3, Math.PI * 2 - 0.1); ctx.lineTo(x, y); ctx.fill();
    if (rnd() < 0.3) { ctx.fillStyle = "#c8b8c8"; ctx.beginPath(); ctx.arc(x, y - 1, 2.5, 0, 7); ctx.fill(); }
  }
}

function cobweb(ctx, rnd, W, H) {
  ctx.strokeStyle = "rgba(200,200,210,0.25)"; ctx.lineWidth = 1;
  const cx = W / 2, cy = H / 2;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * W / 2, cy + Math.sin(a) * H / 2); ctx.stroke(); }
  for (let r = 6; r < W / 2; r += 7) { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI * 2; const fn = i ? ctx.lineTo : ctx.moveTo; fn.call(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8); } ctx.stroke(); }
}

function beam(ctx, rnd, W, H) {
  const base = H - 6;
  ctx.fillStyle = "#3a2a1a"; ctx.fillRect(8, base - H + 20, 10, H - 26); ctx.fillRect(W - 18, base - H + 20, 10, H - 26);
  ctx.fillRect(2, base - H + 12, W - 4, 12);
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(14, base - H + 24, 4, H - 30);
}

function minecart(ctx, rnd, W, H) {
  const base = H - 8;
  ellipseShadow(ctx, W / 2 + 4, base, W * 0.42, 8, 0.4);
  ctx.fillStyle = "#3a3632"; ctx.beginPath(); ctx.moveTo(8, base - 40); ctx.lineTo(W - 8, base - 40); ctx.lineTo(W - 14, base - 12); ctx.lineTo(14, base - 12); ctx.fill();
  ctx.strokeStyle = "#5a524a"; ctx.lineWidth = 2; ctx.strokeRect(10, base - 40, W - 20, 4);
  ctx.fillStyle = "#5a4a30"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(18 + i * (W - 36) / 4, base - 42, 6, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#1a1816"; ctx.beginPath(); ctx.arc(22, base - 8, 7, 0, 7); ctx.arc(W - 22, base - 8, 7, 0, 7); ctx.fill();
}

function crystal(ctx, rnd, W, H, col = "#5a8ab0") {
  const cx = W / 2, base = H - 6;
  ctx.fillStyle = rgba(col, 0.15); ctx.beginPath(); ctx.arc(cx, base - 20, 28, 0, 7); ctx.fill();
  for (let i = 0; i < 5; i++) {
    const x = cx + (i - 2) * 9, h = 18 + rnd() * 26, a = (i - 2) * 0.18;
    ctx.save(); ctx.translate(x, base); ctx.rotate(a);
    const g = ctx.createLinearGradient(-5, 0, 5, 0); g.addColorStop(0, shade(col, 0.5)); g.addColorStop(1, shade(col, -0.4));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-5, -h); ctx.lineTo(0, -h - 7); ctx.lineTo(5, -h); ctx.lineTo(5, 0); ctx.fill();
    ctx.restore();
  }
}

// Каталог: размеры, точка опоры и радиус столкновения (0 — проходимо).
export const PROPS = {
  pine:      { w: 150, h: 230, v: 4, col: 16, draw: (c, r, v) => pine(c, r, 150, 230, ["#1a2818", "#1d2a1a", "#172318", "#202c1c"][v]) },
  oak:       { w: 190, h: 220, v: 3, col: 18, draw: (c, r, v) => oak(c, r, 190, 220, ["#24301a", "#283318", "#1f2b18"][v]) },
  swamptree: { w: 170, h: 200, v: 2, col: 16, draw: (c, r) => oak(c, r, 170, 200, "#26301e") },
  deadtree:  { w: 150, h: 180, v: 3, col: 12, draw: (c, r) => deadTree(c, r, 150, 180) },
  bush:      { w: 80, h: 64, v: 3, col: 0, draw: (c, r, v) => bush(c, r, 80, 64, ["#22301a", "#283518", "#1f2a17"][v], v === 2) },
  fern:      { w: 70, h: 50, v: 2, col: 0, draw: (c, r) => fern(c, r, 70, 50) },
  tuft:      { w: 44, h: 34, v: 3, col: 0, draw: (c, r) => grassTuft(c, r, 44, 34) },
  drytuft:   { w: 44, h: 34, v: 2, col: 0, draw: (c, r) => grassTuft(c, r, 44, 34, ["#4a4428", "#5a5230", "#3a3a22"]) },
  mushrooms: { w: 50, h: 34, v: 2, col: 0, draw: (c, r, v) => mushrooms(c, r, 50, 34, "#5a2a20", v ? "#7ac0a0" : null) },
  rock:      { w: 80, h: 70, v: 3, col: 22, draw: (c, r) => rock(c, r, 80, 70) },
  boulder:   { w: 130, h: 110, v: 2, col: 40, draw: (c, r) => rock(c, r, 130, 110, "#36332f") },
  pebble:    { w: 40, h: 30, v: 3, col: 0, draw: (c, r) => rock(c, r, 40, 30, "#3a3733", false) },
  log:       { w: 120, h: 50, v: 1, col: 18, draw: (c, r) => log(c, r, 120, 50) },
  boat:      { w: 130, h: 60, v: 1, col: 22, draw: (c, r) => log(c, r, 130, 60) },
  stump:     { w: 50, h: 46, v: 1, col: 12, draw: (c, r) => stump(c, r, 50, 46) },
  grave:     { w: 50, h: 56, v: 3, col: 12, draw: (c, r, v) => gravestone(c, r, 50, 56, v) },
  house:     { w: 260, h: 220, v: 2, col: 0, block: [20, 104, 220, 92], draw: (c, r, v) => house(c, r, 260, 220, v ? { roof: "#3a2a22", wall: "#5e5444" } : {}) },
  tavern:    { w: 340, h: 250, v: 1, col: 0, block: [20, 120, 300, 108], draw: (c, r) => house(c, r, 340, 250, { roof: "#30241f", wallH: 84, roofH: 110, windows: 3, chimney: true, sign: "#e0a040", signGlyph: "⚱" }) },
  smithy:    { w: 280, h: 230, v: 1, col: 0, block: [20, 110, 240, 98], draw: (c, r) => house(c, r, 280, 230, { roof: "#282422", wall: "#4e4a44", chimney: true, sign: "#c0c0d0", signGlyph: "⚒" }) },
  shop:      { w: 260, h: 220, v: 1, col: 0, block: [20, 104, 220, 92], draw: (c, r) => house(c, r, 260, 220, { roof: "#3a2620", wall: "#6a5a48", sign: "#d0b060", signGlyph: "⚖" }) },
  herbhut:   { w: 230, h: 210, v: 1, col: 0, block: [20, 100, 190, 88], draw: (c, r) => house(c, r, 230, 210, { roof: "#34392a", wall: "#4e4a3a", windows: 1, sign: "#80c080", signGlyph: "☘" }) },
  hut:       { w: 210, h: 190, v: 1, col: 0, block: [20, 96, 170, 80], draw: (c, r) => house(c, r, 210, 190, { roof: "#2a2e22", wall: "#3e3a30", windows: 1, wallH: 58, roofH: 80 }) },
  well:      { w: 100, h: 110, v: 1, col: 30, draw: (c, r) => well(c, r, 100, 110) },
  lantern:   { w: 40, h: 90, v: 1, col: 6, light: [13 - 20 + 20, -66], draw: (c, r) => lantern(c, r, 40, 90) },
  campfire:  { w: 70, h: 60, v: 1, col: 18, draw: (c, r) => campfire(c, r, 70, 60) },
  crate:     { w: 50, h: 50, v: 1, col: 16, draw: (c, r) => crate(c, r, 50, 50) },
  barrel:    { w: 40, h: 50, v: 1, col: 14, draw: (c, r) => barrel(c, r, 40, 50) },
  fence:     { w: 90, h: 46, v: 1, col: 0, block: [4, 30, 82, 12], draw: (c, r) => fence(c, r, 90, 46) },
  stall:     { w: 140, h: 120, v: 2, col: 0, block: [10, 80, 120, 32], draw: (c, r, v) => stall(c, r, 140, 120, v ? "#2a3a5a" : "#5a2020") },
  cart:      { w: 140, h: 80, v: 1, col: 0, block: [10, 36, 110, 34], draw: (c, r) => cart(c, r, 140, 80) },
  ruinwall:  { w: 160, h: 110, v: 2, col: 0, block: [6, 70, 140, 30], draw: (c, r) => ruinWall(c, r, 160, 110) },
  pillar:    { w: 60, h: 130, v: 2, col: 16, draw: (c, r) => pillar(c, r, 60, 130) },
  mine:      { w: 160, h: 140, v: 1, col: 0, block: [10, 70, 140, 60], draw: (c, r) => mineEntrance(c, r, 160, 140) },
  reeds:     { w: 60, h: 70, v: 3, col: 0, draw: (c, r) => reeds(c, r, 60, 70) },
  lily:      { w: 70, h: 50, v: 2, col: 0, flat: true, draw: (c, r) => lily(c, r, 70, 50) },
  bones:     { w: 50, h: 30, v: 2, col: 0, flat: true, draw: (c, r) => bones(c, r, 50, 30) },
  signpost:  { w: 70, h: 70, v: 1, col: 6, draw: (c, r) => signpost(c, r, 70, 70) },
  anvil:     { w: 60, h: 40, v: 1, col: 14, draw: (c, r) => anvil(c, r, 60, 40) },
  cobweb:    { w: 60, h: 60, v: 1, col: 0, flat: true, draw: (c, r) => cobweb(c, r, 60, 60) },
  beam:      { w: 90, h: 120, v: 1, col: 0, block: [4, 104, 82, 10], draw: (c, r) => beam(c, r, 90, 120) },
  minecart:  { w: 90, h: 60, v: 1, col: 18, draw: (c, r) => minecart(c, r, 90, 60) },
  crystal:   { w: 70, h: 70, v: 2, col: 14, draw: (c, r, v) => crystal(c, r, 70, 70, v ? "#7a5ab0" : "#5a8ab0") },
  portal:    { w: 150, h: 90, v: 1, col: 0, flat: true, draw: (c, r) => portalStones(c, r, 150, 90) },
  // ресурсы
  node_wood1: { w: 110, h: 150, v: 1, col: 10, draw: (c, r) => woodNode(c, r, 110, 150, "#cfc6b4") },
  node_wood2: { w: 110, h: 150, v: 1, col: 10, draw: (c, r) => woodNode(c, r, 110, 150, "#5a4a3a") },
  node_wood3: { w: 110, h: 150, v: 1, col: 10, draw: (c, r) => woodNode(c, r, 110, 150, "#3a3a3e") },
  node_ore1:  { w: 80, h: 70, v: 1, col: 20, draw: (c, r) => oreVein(c, r, 80, 70, "#c07040") },
  node_ore2:  { w: 80, h: 70, v: 1, col: 20, draw: (c, r) => oreVein(c, r, 80, 70, "#8a9aa8") },
  node_ore3:  { w: 80, h: 70, v: 1, col: 20, draw: (c, r) => oreVein(c, r, 80, 70, "#d8e0e8") },
  node_herb1: { w: 60, h: 50, v: 1, col: 0, draw: (c, r) => herbNode(c, r, 60, 50, "#c84a5a") },
  node_herb2: { w: 60, h: 50, v: 1, col: 0, draw: (c, r) => herbNode(c, r, 60, 50, "#6a7ad0") },
  node_herb3: { w: 60, h: 50, v: 1, col: 0, draw: (c, r) => herbNode(c, r, 60, 50, "#d0c050") },
  node_fiber1:{ w: 60, h: 50, v: 1, col: 0, draw: (c, r) => fiberNode(c, r, 60, 50) },
  node_fiber2:{ w: 60, h: 50, v: 1, col: 0, draw: (c, r) => fiberNode(c, r, 60, 50) },
};

export function buildPropCanvases(res = 1) {
  const out = {};
  let seed = 900;
  for (const [key, def] of Object.entries(PROPS)) {
    for (let v = 0; v < def.v; v++) {
      const c = canvas(def.w * res, def.h * res);
      const ctx = c.getContext("2d"); ctx.scale(res, res);
      def.draw(ctx, mulberry32(seed++), v);
      out[`${key}_${v}`] = c;
    }
  }
  return out;
}
