// Текстуры земли и кисти переходов. Всё рисуется один раз при запуске.
import { canvas, noiseTexture, wrapDraw, softBrush, shade, rgba } from "./paint.js";
import { mulberry32 } from "../core/rng.js";

export const TERRAIN = {
  grass:  { palette: ["#10140c", "#161d10", "#1d2614", "#253019", "#2e3a1f"], detail: "grass", blade: ["#2a3820", "#364628", "#43532f"] },
  forest: { palette: ["#11160c", "#182010", "#1f2914", "#29331a", "#333b20"], detail: "leaves", blade: ["#2a3a1b", "#3a4a22"] },
  dirt:   { palette: ["#1e1712", "#2a2018", "#372a1f", "#443427", "#53412f"], detail: "pebbles" },
  road:   { palette: ["#24201b", "#302a23", "#3c352c", "#4a4136", "#575043"], detail: "gravel" },
  mud:    { palette: ["#14140e", "#1c1c13", "#242418", "#2d2c1e", "#373424"], detail: "puddles", blade: ["#2c331c", "#38401f"] },
  swampgrass: { palette: ["#12170f", "#192013", "#202918", "#28311c", "#323a22"], detail: "grass", blade: ["#33402a", "#3f4d2f", "#4d5935"] },
  cobble: { palette: ["#1a1918", "#211f1e", "#282624", "#302d2a", "#373330"], detail: "cobble" },
  stone:  { palette: ["#151413", "#1d1b1a", "#262321", "#302c29", "#3a3531"], detail: "cracks" },
  ash:    { palette: ["#1a1817", "#232120", "#2c2928", "#363231", "#423d3b"], detail: "pebbles" },
  water:  { palette: ["#081214", "#0c1a1d", "#102226", "#152a2e", "#1b3337"], detail: "water" },
  swampwater: { palette: ["#0c120c", "#111a10", "#162214", "#1c2a18", "#22321d"], detail: "water" },
};

const SIZE = 256;

function addDetail(ctx, type, def, rnd) {
  const S = SIZE;
  if (type === "grass" || type === "leaves") {
    const n = type === "grass" ? 900 : 300;
    for (let i = 0; i < n; i++) {
      const x = rnd() * S, y = rnd() * S;
      const col = def.blade[Math.floor(rnd() * def.blade.length)];
      const h = 4 + rnd() * 9, lean = (rnd() - 0.5) * 6;
      wrapDraw(S, x, y, 14, (px, py) => {
        ctx.strokeStyle = rgba(col, 0.35 + rnd() * 0.4);
        ctx.lineWidth = 1 + rnd() * 0.8;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + lean * 0.3, py - h * 0.6, px + lean, py - h); ctx.stroke();
      });
    }
    if (type === "leaves") for (let i = 0; i < 120; i++) {
      const x = rnd() * S, y = rnd() * S, r = 1.5 + rnd() * 2.5;
      const col = ["#3a2a16", "#4a3018", "#2e2412", "#523a1c"][Math.floor(rnd() * 4)];
      wrapDraw(S, x, y, 6, (px, py) => {
        ctx.fillStyle = rgba(col, 0.6); ctx.beginPath();
        ctx.ellipse(px, py, r * 1.6, r, rnd() * 3, 0, 7); ctx.fill();
      });
    }
  }
  if (type === "pebbles" || type === "gravel") {
    const n = type === "gravel" ? 500 : 160;
    for (let i = 0; i < n; i++) {
      const x = rnd() * S, y = rnd() * S, r = type === "gravel" ? 0.8 + rnd() * 1.8 : 1 + rnd() * 3;
      const base = shade(def.palette[3], (rnd() - 0.4) * 0.5);
      wrapDraw(S, x, y, 6, (px, py) => {
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(px + 0.8, py + 1, r, r * 0.7, 0, 0, 7); ctx.fill();
        ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.7, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(255,240,220,0.12)"; ctx.beginPath(); ctx.ellipse(px - r * 0.3, py - r * 0.3, r * 0.4, r * 0.25, 0, 0, 7); ctx.fill();
      });
    }
    // колеи
    if (type === "gravel") {
      ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 6;
      for (let i = 0; i < 3; i++) { const y = rnd() * S; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(S * 0.3, y + 6, S * 0.6, y - 6, S, y); ctx.stroke(); }
    }
  }
  if (type === "puddles") {
    for (let i = 0; i < 10; i++) {
      const x = rnd() * S, y = rnd() * S, r = 6 + rnd() * 14;
      wrapDraw(S, x, y, r + 2, (px, py) => {
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, "rgba(10,18,12,0.7)"); g.addColorStop(0.8, "rgba(14,22,14,0.5)"); g.addColorStop(1, "rgba(14,22,14,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, py, r * 1.4, r * 0.8, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(160,180,150,0.08)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(px - r * 0.2, py - r * 0.2, r * 0.6, r * 0.25, 0, 3.4, 5.6); ctx.stroke();
      });
    }
    for (let i = 0; i < 300; i++) {
      const x = rnd() * S, y = rnd() * S, h = 3 + rnd() * 6;
      ctx.strokeStyle = rgba(def.blade[i % 2], 0.4); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 3, y - h); ctx.stroke();
    }
  }
  if (type === "cobble") {
    // булыжники неправильной формы на тёмном растворе
    ctx.fillStyle = "#151413"; ctx.fillRect(0, 0, S, S);
    const cell = 15;
    for (let gy = 0; gy < S / cell + 1; gy++) for (let gx = 0; gx < S / cell + 1; gx++) {
      const x = gx * cell + (gy % 2) * cell / 2 + (rnd() - 0.5) * 4, y = gy * cell + (rnd() - 0.5) * 4;
      const w = cell * 0.46 + rnd() * 2, h = cell * 0.4 + rnd() * 2;
      const base = shade(def.palette[2 + Math.floor(rnd() * 3)], (rnd() - 0.5) * 0.25);
      wrapDraw(S, x, y, cell, (px, py) => {
        const g = ctx.createLinearGradient(px - w, py - h, px + w, py + h);
        g.addColorStop(0, shade(base, 0.18)); g.addColorStop(0.5, base); g.addColorStop(1, shade(base, -0.4));
        ctx.fillStyle = g; ctx.beginPath();
        ctx.ellipse(px, py, w, h, (rnd() - 0.5) * 0.4, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1; ctx.stroke();
      });
    }
    // мох в швах
    for (let i = 0; i < 160; i++) {
      const x = rnd() * S, y = rnd() * S;
      ctx.fillStyle = rgba("#2c3a1c", 0.35); ctx.fillRect(x, y, 2 + rnd() * 2, 1.5);
    }
  }
  if (type === "cracks") {
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) {
      let x = rnd() * S, y = rnd() * S;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 30; y += (rnd() - 0.5) * 30; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (let i = 0; i < 90; i++) {
      const x = rnd() * S, y = rnd() * S, r = 1 + rnd() * 2.5;
      ctx.fillStyle = rgba(def.palette[4], 0.5); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
  }
  if (type === "water") {
    for (let i = 0; i < 40; i++) {
      const x = rnd() * S, y = rnd() * S, w = 10 + rnd() * 30;
      wrapDraw(S, x, y, w, (px, py) => {
        ctx.strokeStyle = "rgba(140,170,170,0.07)"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(px - w, py); ctx.quadraticCurveTo(px, py - 3, px + w, py); ctx.stroke();
      });
    }
  }
}

export function buildTerrainTextures() {
  const tex = {}, brushes = {};
  let seed = 101;
  for (const [name, def] of Object.entries(TERRAIN)) {
    const c = noiseTexture(SIZE, seed, def.palette, { period: 4, contrast: 1.6 });
    const ctx = c.getContext("2d");
    addDetail(ctx, def.detail, def, mulberry32(seed + 50));
    tex[name] = c;
    brushes[name] = [0, 1, 2].map(i => softBrush(c, 160, seed * 7 + i, name === "cobble" ? 0.8 : 0.55));
    seed += 17;
  }
  return { tex, brushes };
}
