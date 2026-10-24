// Иконки навыков и предметов (для интерфейса) и текстуры эффектов (для мира).
import { canvas, shade, rgba, glow } from "./paint.js";
import { drawWeapon } from "./humanoid.js";
import { QUALITY, WEAPON_TYPES } from "../data/items.js";

const cache = new Map();

function frame(ctx, S, col) {
  const g = ctx.createRadialGradient(S * 0.4, S * 0.35, 2, S / 2, S / 2, S * 0.75);
  g.addColorStop(0, shade(col, -0.35)); g.addColorStop(1, "#0b0a0a");
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(1, 1, S - 2, S - 2, S * 0.16); ctx.fill();
  ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 2; ctx.stroke();
}

export function skillIcon([glyph, col], S = 64) {
  const key = "s" + glyph + col + S;
  if (cache.has(key)) return cache.get(key);
  const c = canvas(S, S), ctx = c.getContext("2d");
  frame(ctx, S, col);
  ctx.shadowColor = col; ctx.shadowBlur = S * 0.25;
  ctx.fillStyle = shade(col, 0.25); ctx.font = `bold ${Math.round(S * 0.55)}px "Noto Sans Symbols 2", "Segoe UI Symbol", serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(glyph, S / 2, S / 2 + S * 0.03);
  const url = c.toDataURL(); cache.set(key, url); return url;
}

function drawArmorPiece(ctx, slot, type, S, col) {
  const m = type === "plate" ? "#8a8e96" : type === "leather" ? "#6a4a30" : "#4a3e6a";
  const g = ctx.createLinearGradient(S * 0.2, S * 0.2, S * 0.8, S * 0.8);
  g.addColorStop(0, shade(m, 0.35)); g.addColorStop(1, shade(m, -0.5));
  ctx.fillStyle = g; ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (slot === "head") {
    if (type === "cloth") { ctx.moveTo(S * 0.5, S * 0.18); ctx.quadraticCurveTo(S * 0.82, S * 0.3, S * 0.78, S * 0.8); ctx.lineTo(S * 0.22, S * 0.8); ctx.quadraticCurveTo(S * 0.18, S * 0.3, S * 0.5, S * 0.18); }
    else { ctx.arc(S * 0.5, S * 0.55, S * 0.28, Math.PI, 0); ctx.lineTo(S * 0.78, S * 0.72); ctx.lineTo(S * 0.22, S * 0.72); ctx.closePath(); }
    ctx.fill(); ctx.stroke();
    if (type === "plate") { ctx.fillStyle = "#111"; ctx.fillRect(S * 0.3, S * 0.52, S * 0.4, S * 0.06); }
    if (type === "cloth") { ctx.fillStyle = "#0a0808"; ctx.beginPath(); ctx.ellipse(S * 0.5, S * 0.58, S * 0.15, S * 0.17, 0, 0, 7); ctx.fill(); }
  } else if (slot === "chest") {
    ctx.moveTo(S * 0.22, S * 0.22); ctx.lineTo(S * 0.4, S * 0.18); ctx.quadraticCurveTo(S * 0.5, S * 0.28, S * 0.6, S * 0.18); ctx.lineTo(S * 0.78, S * 0.22);
    ctx.lineTo(S * 0.82, S * 0.45); ctx.lineTo(S * 0.7, S * 0.45); ctx.lineTo(S * 0.7, S * (type === "cloth" ? 0.86 : 0.8)); ctx.lineTo(S * 0.3, S * (type === "cloth" ? 0.86 : 0.8)); ctx.lineTo(S * 0.3, S * 0.45); ctx.lineTo(S * 0.18, S * 0.45); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(S * 0.3, S * 0.6, S * 0.4, S * 0.05);
  } else if (slot === "boots") {
    for (const ox of [0, 0.26]) { ctx.beginPath(); ctx.moveTo(S * (0.22 + ox), S * 0.25); ctx.lineTo(S * (0.38 + ox), S * 0.25); ctx.lineTo(S * (0.38 + ox), S * 0.62); ctx.lineTo(S * (0.5 + ox), S * 0.7); ctx.lineTo(S * (0.5 + ox), S * 0.8); ctx.lineTo(S * (0.22 + ox), S * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  } else if (slot === "ring") {
    ctx.strokeStyle = "#c0a050"; ctx.lineWidth = S * 0.07; ctx.beginPath(); ctx.ellipse(S * 0.5, S * 0.58, S * 0.2, S * 0.17, 0, 0, 7); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(S * 0.5, S * 0.38, S * 0.09, 0, 7); ctx.fill();
  } else if (slot === "amulet") {
    ctx.strokeStyle = "#a08a50"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(S * 0.25, S * 0.2); ctx.quadraticCurveTo(S * 0.5, S * 0.55, S * 0.75, S * 0.2); ctx.stroke();
    ctx.fillStyle = "#c0a050"; ctx.beginPath(); ctx.moveTo(S * 0.5, S * 0.45); ctx.lineTo(S * 0.64, S * 0.62); ctx.lineTo(S * 0.5, S * 0.82); ctx.lineTo(S * 0.36, S * 0.62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(S * 0.5, S * 0.63, S * 0.07, 0, 7); ctx.fill();
  }
}

export function itemIconUrl(it, S = 64) {
  if (it.cat !== "gear") return skillIcon(it.icon, S);
  const key = `g${it.slot}${it.type}${it.cls}${it.quality}${it.tier}${S}`;
  if (cache.has(key)) return cache.get(key);
  const c = canvas(S, S), ctx = c.getContext("2d");
  const qc = QUALITY[it.quality].color;
  frame(ctx, S, qc);
  if (it.slot === "weapon") {
    const look = WEAPON_TYPES[it.cls].look;
    ctx.save(); ctx.translate(S * 0.5, S * 0.55); ctx.scale(S / 30, S / 30); ctx.translate(0, look === "bow" ? 0 : 8);
    drawWeapon(ctx, look, 0, 0, look === "bow" ? 0 : 0.7, ["#8a8e96", "#9aa8b4", "#c0ccd8", "#e0c070"][it.tier - 1] || "#9aa0a8");
    ctx.restore();
  } else drawArmorPiece(ctx, it.slot, it.type, S, qc);
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(S - 20, S - 16, 18, 14);
  ctx.fillStyle = "#e8dcc0"; ctx.font = `bold ${Math.round(S * 0.17)}px serif`; ctx.textAlign = "center"; ctx.fillText(["", "I", "II", "III", "IV"][it.tier], S - 11, S - 5);
  const url = c.toDataURL(); cache.set(key, url); return url;
}

// ---------- текстуры эффектов ----------
export function buildFxCanvases() {
  const fx = {};
  const cols = { fire: "#ff7a30", ice: "#90d8ff", dark: "#a040d0", holy: "#fff0b0", blood: "#ff2030", wind: "#c0e8f0", shadow: "#8060e0", doom: "#7020a0", wisp: "#7ad0a0", orb: "#7aa0ff", vial: "#90e040" };
  for (const [k, c] of Object.entries(cols)) fx["glow_" + k] = glow(64, c);
  fx.glow_white = glow(64, "#ffffff");
  fx.glow_warm = glow(256, "#ffb060");
  fx.glow_cold = glow(256, "#9fc0ff");
  // стрела
  { const c = canvas(48, 10), x = c.getContext("2d");
    x.strokeStyle = "#7a5a3a"; x.lineWidth = 2; x.beginPath(); x.moveTo(4, 5); x.lineTo(40, 5); x.stroke();
    x.fillStyle = "#c0c8d0"; x.beginPath(); x.moveTo(48, 5); x.lineTo(39, 1); x.lineTo(39, 9); x.fill();
    x.fillStyle = "#d0d0c0"; x.beginPath(); x.moveTo(0, 1); x.lineTo(8, 5); x.lineTo(0, 9); x.fill(); fx.arrow = c; }
  { const c = canvas(64, 12), x = c.getContext("2d");
    x.strokeStyle = "#4a3a2a"; x.lineWidth = 3; x.beginPath(); x.moveTo(2, 6); x.lineTo(54, 6); x.stroke();
    x.fillStyle = "#e0e8f0"; x.beginPath(); x.moveTo(64, 6); x.lineTo(52, 0); x.lineTo(52, 12); x.fill(); fx.bolt = c; }
  { const c = canvas(24, 10), x = c.getContext("2d");
    x.fillStyle = "#c8ccd4"; x.beginPath(); x.moveTo(24, 5); x.lineTo(8, 1); x.lineTo(8, 9); x.fill(); x.fillStyle = "#3a2a1a"; x.fillRect(0, 3, 9, 4); fx.knife = c; }
  // дуга удара
  { const c = canvas(128, 128), x = c.getContext("2d");
    const g = x.createRadialGradient(64, 64, 30, 64, 64, 62);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.7, "rgba(255,250,235,0.5)"); g.addColorStop(0.9, "rgba(255,255,255,0.9)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.beginPath(); x.moveTo(64, 64); x.arc(64, 64, 62, -0.9, 0.9); x.closePath(); x.fill(); fx.slash = c; }
  // кольцо (волна)
  { const c = canvas(256, 256), x = c.getContext("2d");
    const g = x.createRadialGradient(128, 128, 90, 128, 128, 127);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.75, "rgba(255,255,255,0.6)"); g.addColorStop(0.9, "rgba(255,255,255,0.25)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 256, 256); fx.ring = c; }
  // круг на земле (метка области)
  { const c = canvas(256, 256), x = c.getContext("2d");
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 127);
    g.addColorStop(0, "rgba(255,255,255,0.12)"); g.addColorStop(0.85, "rgba(255,255,255,0.22)"); g.addColorStop(0.95, "rgba(255,255,255,0.7)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 256, 256); fx.zone = c; }
  { const c = canvas(8, 8), x = c.getContext("2d"); x.fillStyle = "#fff"; x.beginPath(); x.arc(4, 4, 3.5, 0, 7); x.fill(); fx.dot = c; }
  { const c = canvas(16, 16), x = c.getContext("2d"); const g = x.createRadialGradient(8, 8, 0, 8, 8, 8); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 16, 16); fx.spark = c; }
  // туман
  { const c = canvas(256, 128), x = c.getContext("2d");
    for (let i = 0; i < 14; i++) { const px = 40 + Math.random() * 176, py = 40 + Math.random() * 48, r = 30 + Math.random() * 30;
      const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, "rgba(200,210,200,0.12)"); g.addColorStop(1, "rgba(200,210,200,0)"); x.fillStyle = g; x.fillRect(0, 0, 256, 128); }
    fx.fog = c; }
  // молния
  { const c = canvas(40, 200), x = c.getContext("2d");
    x.strokeStyle = "#ffffc0"; x.shadowColor = "#f0f080"; x.shadowBlur = 10; x.lineWidth = 3;
    x.beginPath(); let px = 20; x.moveTo(px, 0); for (let y = 0; y < 200; y += 20) { px = 20 + (Math.random() - 0.5) * 24; x.lineTo(px, y); } x.stroke(); fx.lightning = c; }
  // мешок с добычей
  { const c = canvas(40, 40), x = c.getContext("2d");
    x.fillStyle = "rgba(0,0,0,0.35)"; x.beginPath(); x.ellipse(20, 34, 13, 4, 0, 0, 7); x.fill();
    const g = x.createRadialGradient(15, 18, 2, 20, 24, 16); g.addColorStop(0, "#a08050"); g.addColorStop(1, "#4a3420");
    x.fillStyle = g; x.beginPath(); x.ellipse(20, 25, 12, 10, 0, 0, 7); x.fill();
    x.fillStyle = "#5a4028"; x.fillRect(15, 12, 10, 6); x.strokeStyle = "#c0a050"; x.lineWidth = 2; x.beginPath(); x.moveTo(14, 17); x.lineTo(26, 17); x.stroke(); fx.loot = c; }
  { const c = canvas(24, 24), x = c.getContext("2d");
    const g = x.createRadialGradient(9, 9, 1, 12, 12, 10); g.addColorStop(0, "#fff0a0"); g.addColorStop(1, "#a07010");
    x.fillStyle = g; x.beginPath(); x.arc(12, 12, 8, 0, 7); x.fill(); x.strokeStyle = "#6a4a08"; x.lineWidth = 1.5; x.stroke(); fx.coin = c; }
  // указатель цели
  { const c = canvas(96, 48), x = c.getContext("2d");
    x.strokeStyle = "rgba(255,80,60,0.85)"; x.lineWidth = 3; x.setLineDash([10, 8]); x.beginPath(); x.ellipse(48, 24, 44, 20, 0, 0, 7); x.stroke(); fx.target = c; }
  return fx;
}
