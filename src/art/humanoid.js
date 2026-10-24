// Человекоподобные фигуры: герой (с кастомизацией), NPC, разбойники, скелеты, упыри, голем.
// Рисуется в координатах 64×80 (ступни в точке 32,74), масштабируется параметром scale.
import { canvas, shade, rgba, ellipseShadow, mix } from "./paint.js";

export const SKIN = ["#f0d2b8", "#e2b896", "#c99872", "#a87650", "#7a5236", "#553826"];
export const HAIR_COLORS = ["#1a1412", "#3a2416", "#6a4426", "#9a6a3a", "#c8a060", "#8a2a1a", "#d8d4cc", "#4a4a50"];
export const EYE_COLORS = ["#3a5a7a", "#4a6a3a", "#5a3a22", "#2a2a2a", "#7a7a8a"];
export const HAIR_STYLES_M = ["Короткая", "Длинные", "Хвост", "Бритая", "Косы", "Ирокез", "Кудри", "Пучок"];
export const HAIR_STYLES_F = HAIR_STYLES_M;
export const BEARDS = ["Нет", "Щетина", "Короткая", "Длинная"];
export const SCARS = ["Нет", "Шрам на брови", "Шрам на щеке", "Метка рода"];

// Наряд по типу брони и классу
const ARMOR_LOOK = {
  cloth:   { main: "#3a3048", trim: "#8a7040", robe: true },
  leather: { main: "#4a3424", trim: "#2a1c12", robe: false },
  plate:   { main: "#6a6e74", trim: "#3a3c40", robe: false, metal: true },
  rags:    { main: "#4a4436", trim: "#2a2620", robe: false },
};

function limb(ctx, x1, y1, x2, y2, w, col) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function torsoPath(ctx, cx, top, bottom, shW, waistW, female) {
  ctx.beginPath();
  ctx.moveTo(cx - shW, top + 3);
  ctx.quadraticCurveTo(cx - shW, top, cx - shW + 3, top);
  ctx.lineTo(cx + shW - 3, top);
  ctx.quadraticCurveTo(cx + shW, top, cx + shW, top + 3);
  if (female) {
    ctx.quadraticCurveTo(cx + waistW - 1, (top + bottom) / 2 + 2, cx + waistW + 1.5, bottom);
    ctx.lineTo(cx - waistW - 1.5, bottom);
    ctx.quadraticCurveTo(cx - waistW + 1, (top + bottom) / 2 + 2, cx - shW, top + 3);
  } else {
    ctx.lineTo(cx + waistW, bottom); ctx.lineTo(cx - waistW, bottom);
  }
  ctx.closePath();
}

export function drawWeapon(ctx, kind, hx, hy, ang, col = "#9aa0a8", s = 1) {
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  const metal = (x, y, w, h) => {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, shade(col, 0.35)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.45));
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  };
  switch (kind) {
    case "sword":
      ctx.fillStyle = "#3a2a1a"; ctx.fillRect(-1.2, -2, 2.4, 6);
      ctx.fillStyle = "#6a5a3a"; ctx.fillRect(-4.5, -3, 9, 2);
      metal(-1.6, -24, 3.2, 21);
      ctx.beginPath(); ctx.moveTo(-1.6, -24); ctx.lineTo(0, -27); ctx.lineTo(1.6, -24); ctx.fillStyle = shade(col, 0.2); ctx.fill();
      break;
    case "greatsword":
      ctx.fillStyle = "#3a2a1a"; ctx.fillRect(-1.3, -2, 2.6, 9);
      ctx.fillStyle = "#5a4a3a"; ctx.fillRect(-6, -3, 12, 2.5);
      metal(-2.3, -34, 4.6, 31);
      break;
    case "axe":
      ctx.fillStyle = "#3a2a1a"; ctx.fillRect(-1.2, -22, 2.4, 26);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(1, -21); ctx.quadraticCurveTo(10, -24, 10, -14); ctx.quadraticCurveTo(6, -14, 1, -13); ctx.fill();
      break;
    case "dagger":
      ctx.fillStyle = "#2a1c12"; ctx.fillRect(-1, -1, 2, 4);
      metal(-1.2, -12, 2.4, 11);
      break;
    case "bow":
      ctx.strokeStyle = "#4a3220"; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(-2, 0, 15, -1.25, 1.25); ctx.stroke();
      ctx.strokeStyle = "rgba(220,210,190,0.7)"; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(-2 + Math.cos(-1.25) * 15, Math.sin(-1.25) * 15); ctx.lineTo(-2 + Math.cos(1.25) * 15, Math.sin(1.25) * 15); ctx.stroke();
      break;
    case "staff":
      ctx.fillStyle = "#3a2618"; ctx.fillRect(-1.3, -30, 2.6, 40);
      ctx.fillStyle = rgba(col, 0.3); ctx.beginPath(); ctx.arc(0, -32, 7, 0, 7); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -32, 3.2, 0, 7); ctx.fill();
      ctx.strokeStyle = "#5a4630"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -32, 4.5, 0.4, 2.8); ctx.stroke();
      break;
    case "mace":
      ctx.fillStyle = "#3a2a1a"; ctx.fillRect(-1.2, -16, 2.4, 20);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -18, 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = shade(col, -0.3); for (let i = 0; i < 6; i++) { const a = i / 6 * 7; ctx.fillRect(Math.cos(a) * 5 - 1, -18 + Math.sin(a) * 5 - 1, 2, 2); }
      break;
    case "scythe":
      ctx.fillStyle = "#2a1e16"; ctx.fillRect(-1.2, -32, 2.4, 42);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -32); ctx.quadraticCurveTo(-16, -34, -20, -24); ctx.quadraticCurveTo(-12, -29, 0, -28); ctx.fill();
      break;
    case "claw":
      ctx.strokeStyle = "#c8c0b0"; ctx.lineWidth = 1.2;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 2, 0); ctx.lineTo(i * 3, -7); ctx.stroke(); }
      break;
    case "pick":
      ctx.fillStyle = "#3a2a1a"; ctx.fillRect(-1.2, -18, 2.4, 22);
      ctx.strokeStyle = "#6a6a70"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-9, -15); ctx.quadraticCurveTo(0, -22, 9, -15); ctx.stroke();
      break;
  }
  ctx.restore();
}

function drawShield(ctx, x, y, col, front = true) {
  ctx.save(); ctx.translate(x, y);
  const g = ctx.createLinearGradient(-6, -8, 6, 8);
  g.addColorStop(0, shade(col, 0.25)); g.addColorStop(1, shade(col, -0.5));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(6, -8); ctx.lineTo(6, 2); ctx.quadraticCurveTo(0, 10, -6, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#8a8a90"; ctx.lineWidth = 1.2; ctx.stroke();
  if (front) { ctx.fillStyle = "#b09050"; ctx.beginPath(); ctx.arc(0, -2, 1.8, 0, 7); ctx.fill(); }
  ctx.restore();
}

function hairBack(ctx, style, col, cx, hy, dir, female) {
  // длинные части, которые рисуются ПОД головой (сзади)
  ctx.fillStyle = col;
  if (style === 1 || (female && style === 6)) { ctx.beginPath(); ctx.ellipse(cx, hy + 7, 7.2, 10, 0, 0, 7); ctx.fill(); }
  if (style === 4) { ctx.fillRect(cx - 7, hy, 3, 15); ctx.fillRect(cx + 4, hy, 3, 15); }
  if (style === 2 && dir !== 0) { ctx.beginPath(); ctx.ellipse(cx + (dir === 2 ? -6 : 0), hy + 8, 2.6, 7, 0, 0, 7); ctx.fill(); }
}

function hairFront(ctx, style, col, cx, hy, dir) {
  const g = ctx.createLinearGradient(cx - 6, hy - 8, cx + 6, hy + 4);
  g.addColorStop(0, shade(col, 0.3)); g.addColorStop(1, shade(col, -0.35));
  ctx.fillStyle = g;
  if (style === 3) { ctx.fillStyle = rgba(col, 0.35); ctx.beginPath(); ctx.ellipse(cx, hy - 2.5, 6.2, 5, 0, Math.PI, 0); ctx.fill(); return; }
  const back = dir === 1;
  // шапка волос
  ctx.beginPath(); ctx.ellipse(cx, hy - 2.2, 6.6, back ? 7.5 : 5.4, 0, Math.PI, 0);
  if (back) ctx.ellipse(cx, hy - 1, 6.6, 6.5, 0, 0, Math.PI);
  ctx.fill();
  if (!back) {
    // чёлка/виски
    if (dir === 0) { ctx.beginPath(); ctx.moveTo(cx - 6.6, hy - 2); ctx.quadraticCurveTo(cx - 3, hy + 0.5, cx + 1, hy - 3); ctx.quadraticCurveTo(cx + 4, hy, cx + 6.6, hy - 2); ctx.lineTo(cx + 6.6, hy - 4); ctx.lineTo(cx - 6.6, hy - 4); ctx.fill();
      ctx.fillRect(cx - 6.8, hy - 3, 1.8, 5); ctx.fillRect(cx + 5, hy - 3, 1.8, 5); }
    else { ctx.beginPath(); ctx.ellipse(cx - 2, hy - 1, 5.5, 5.5, 0, Math.PI * 0.6, Math.PI * 1.7); ctx.fill(); }
  }
  if (style === 5) { ctx.fillStyle = shade(col, 0.1); ctx.fillRect(cx - 1.5, hy - 10, 3, 8); }
  if (style === 7) { ctx.beginPath(); ctx.arc(cx + (dir === 2 ? -4 : 0), hy - 8, 3.2, 0, 7); ctx.fill(); }
  if (style === 6) { for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(cx - 6 + i * 2, hy - 5 + (i % 2), 2, 0, 7); ctx.fill(); } }
  if (style === 1 && back) { ctx.fillRect(cx - 6.6, hy, 13.2, 10); }
  if (style === 2 && back) { ctx.beginPath(); ctx.ellipse(cx, hy + 7, 2.4, 6, 0, 0, 7); ctx.fill(); }
  if (style === 4 && back) { ctx.fillRect(cx - 4, hy + 2, 3, 13); ctx.fillRect(cx + 1, hy + 2, 3, 13); }
}

// look: { gender, skin, hair, hairColor, beard, eyes, scar, armor (cloth/leather/plate), helm (null|cloth|leather|plate),
//         weapon, offhand ('shield'|'dagger'|null), colors {main, trim}, body ('human'|'skeleton'|'ghoul'|'golem'|'witch') }
// pose: { dir 0 вниз / 1 вверх / 2 вбок(вправо), walk 0..1 фаза, attack 0..1 (или -1), cast bool, hurt bool }
export function drawHumanoid(ctx, look, pose, scale = 1) {
  ctx.save(); ctx.scale(scale, scale);
  const body = look.body || "human";
  const female = look.gender === "f";
  const dir = pose.dir;
  const cx = 32, feet = 74;
  const big = body === "golem" ? 1.35 : 1;
  if (big !== 1) { ctx.translate(cx, feet); ctx.scale(big, big); ctx.translate(-cx, -feet); }
  const step = Math.sin((pose.walk || 0) * Math.PI * 2);
  const bob = pose.walk ? Math.abs(Math.cos((pose.walk || 0) * Math.PI * 2)) * 1.2 : 0;
  const hunch = body === "ghoul" ? 4 : 0;
  const skin = body === "skeleton" ? "#cfc6b0" : body === "ghoul" ? "#7a8a6a" : body === "golem" ? "#5a5650" : SKIN[look.skin ?? 1];
  const arm = ARMOR_LOOK[look.armor || "leather"];
  const main = look.colors?.main || arm.main, trim = look.colors?.trim || arm.trim;
  const robe = body === "witch" || (arm.robe && body === "human");

  ellipseShadow(ctx, cx, feet, 13, 4.5, 0.45);

  const hipY = 52 - bob + hunch * 0.3, shY = 34 - bob + hunch, headY = 24 - bob + hunch * 1.4;
  const shW = female ? 8.2 : 9.6, waistW = female ? 5.6 : 7.4;

  // ноги
  const legCol = body === "skeleton" ? skin : body === "golem" ? shade(skin, -0.1) : shade(main, -0.35);
  const bootCol = body === "skeleton" ? skin : body === "golem" ? shade(skin, -0.25) : "#2a1e14";
  const legW = body === "skeleton" ? 2.5 : body === "golem" ? 6 : 4.4;
  if (dir === 2) {
    const a = step * 7;
    limb(ctx, cx - 1, hipY, cx - 1 - a, feet - 3, legW, shade(legCol, -0.2));
    limb(ctx, cx + 1, hipY, cx + 1 + a, feet - 3, legW, legCol);
    ctx.fillStyle = bootCol;
    ctx.fillRect(cx - 1 - a - 2, feet - 6, 6, 4); ctx.fillRect(cx + 1 + a - 2, feet - 6, 6, 4);
  } else {
    const l = step * 3.2;
    limb(ctx, cx - 3.5, hipY, cx - 4, feet - 3 - Math.max(0, l), legW, legCol);
    limb(ctx, cx + 3.5, hipY, cx + 4, feet - 3 - Math.max(0, -l), legW, legCol);
    ctx.fillStyle = bootCol;
    ctx.fillRect(cx - 6.5, feet - 6 - Math.max(0, l), 5, 4.5); ctx.fillRect(cx + 1.5, feet - 6 - Math.max(0, -l), 5, 4.5);
  }

  // рука сзади
  const atk = pose.attack >= 0 ? pose.attack : -1;
  const swing = dir === 2 ? -step * 0.6 : step * 0.35;
  const armCol = body === "skeleton" ? skin : body === "golem" ? skin : robe ? main : shade(main, -0.1);
  const handCol = body === "human" || body === "witch" ? skin : skin;

  const backArm = () => {
    if (dir === 2) {
      const ex = cx - 3 - Math.sin(swing) * 8, ey = shY + 14;
      limb(ctx, cx - 1, shY + 2, ex, ey, body === "golem" ? 6 : 3.6, shade(armCol, -0.3));
    }
  };
  backArm();

  // волосы сзади (под телом в виде сверху не видно — рисуем перед телом при виде сзади)
  if (body === "human" && dir !== 1 && !look.helm) hairBack(ctx, look.hair, HAIR_COLORS[look.hairColor ?? 0], cx, headY, dir, female);

  // торс
  if (body === "skeleton") {
    ctx.strokeStyle = skin; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(cx, shY); ctx.lineTo(cx, hipY); ctx.stroke();
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(cx, shY + 3 + i * 3.6, 6 - i * 0.6, 1.4, 0, 0, Math.PI); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(cx, hipY, 5, 2.5, 0, 0, 7); ctx.stroke();
    if (look.armor === "rags") { ctx.fillStyle = rgba("#3a3428", 0.85); ctx.fillRect(cx - 7, hipY - 4, 14, 8); }
  } else {
    const tw = dir === 2 ? 0.7 : 1;
    const top = shY, bot = robe ? feet - 6 : hipY + 3;
    ctx.save(); ctx.translate(cx, 0); ctx.scale(tw, 1); ctx.translate(-cx, 0);
    if (robe) {
      ctx.beginPath(); ctx.moveTo(cx - shW, top + 2); ctx.lineTo(cx + shW, top + 2);
      ctx.lineTo(cx + 10 + step * (dir === 2 ? 2 : 1), bot); ctx.lineTo(cx - 10 - step * (dir === 2 ? 2 : 1), bot); ctx.closePath();
    } else torsoPath(ctx, cx, top, bot, body === "golem" ? 12 : shW, body === "golem" ? 10 : waistW, female && body === "human");
    const g = ctx.createLinearGradient(cx - shW, top, cx + shW, bot);
    const tcol = body === "golem" ? skin : body === "ghoul" ? "#4a4a3a" : main;
    g.addColorStop(0, shade(tcol, arm.metal ? 0.4 : 0.18)); g.addColorStop(0.5, tcol); g.addColorStop(1, shade(tcol, -0.55));
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 0.8; ctx.stroke();
    if (body === "golem") {
      ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.moveTo(cx - 6, top + 6); ctx.lineTo(cx + 2, top + 12); ctx.lineTo(cx - 2, top + 18); ctx.stroke();
      ctx.fillStyle = "rgba(255,140,60,0.8)"; ctx.beginPath(); ctx.arc(cx, top + 9, 2, 0, 7); ctx.fill();
    } else {
      // пояс и отделка
      ctx.fillStyle = trim; ctx.fillRect(cx - waistW - 1, hipY - 2, (waistW + 1) * 2, 3);
      ctx.fillStyle = "#a08a50"; ctx.fillRect(cx - 1.5, hipY - 2, 3, 3);
      if (arm.metal) { // нагрудник: блик и пластины
        ctx.fillStyle = "rgba(220,230,240,0.18)"; ctx.fillRect(cx - shW + 2, top + 2, 4, 12);
        ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.moveTo(cx, top + 2); ctx.lineTo(cx, hipY - 3); ctx.stroke();
      } else if (robe) {
        ctx.strokeStyle = rgba(trim, 0.9); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(cx, top + 3); ctx.lineTo(cx, bot); ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(cx - 3, top + 2); ctx.lineTo(cx, top + 8); ctx.lineTo(cx + 3, top + 2); ctx.stroke();
      }
      if (look.cape && dir === 1) { ctx.fillStyle = shade(look.cape, -0.2); ctx.fillRect(cx - shW, top + 1, shW * 2, bot - top + 6); }
    }
    ctx.restore();
    // наплечники
    if (arm.metal && body === "human" && dir !== 2) {
      for (const s of [-1, 1]) { ctx.fillStyle = radialFill(ctx, cx + s * (shW - 1), shY + 2, 4.5, main); ctx.beginPath(); ctx.ellipse(cx + s * (shW - 1), shY + 2, 4.5, 3.4, 0, 0, 7); ctx.fill(); }
    }
  }

  // голова
  const hx = dir === 2 ? cx + 1.5 : cx;
  if (body === "skeleton") {
    ctx.fillStyle = radialFill(ctx, hx, headY - 1, 6.5, skin); ctx.beginPath(); ctx.ellipse(hx, headY - 1, 6, 6.6, 0, 0, 7); ctx.fill();
    if (dir !== 1) { ctx.fillStyle = "#14100c"; const o = dir === 2 ? 2 : 0;
      ctx.beginPath(); ctx.arc(hx - 2.3 + o, headY - 1, 1.6, 0, 7); ctx.arc(hx + 2.3 + o, headY - 1, 1.6, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(120,200,255,0.9)"; ctx.fillRect(hx - 2.8 + o, headY - 1.5, 1, 1); ctx.fillRect(hx + 1.8 + o, headY - 1.5, 1, 1);
      ctx.fillStyle = "#14100c"; ctx.fillRect(hx - 2 + o, headY + 3, 4, 1); }
  } else if (body === "golem") {
    ctx.fillStyle = radialFill(ctx, hx, headY + 2, 7, skin); ctx.beginPath(); ctx.roundRect(hx - 6, headY - 4, 12, 10, 3); ctx.fill();
    if (dir !== 1) { ctx.fillStyle = "#ff9a40"; ctx.fillRect(hx - 3.5, headY, 2.5, 1.6); ctx.fillRect(hx + 1, headY, 2.5, 1.6); }
  } else {
    ctx.fillStyle = radialFill(ctx, hx, headY, 6.4, skin);
    ctx.beginPath(); ctx.ellipse(hx, headY, female ? 5.6 : 6, female ? 6.2 : 6.6, 0, 0, 7); ctx.fill();
    if (dir !== 1) {
      const o = dir === 2 ? 2.2 : 0;
      const eye = body === "ghoul" ? "#d8e060" : EYE_COLORS[look.eyes ?? 0];
      ctx.fillStyle = "#14100c";
      if (dir === 0) { ctx.fillRect(hx - 3, headY - 0.5, 2, 1.6); ctx.fillRect(hx + 1, headY - 0.5, 2, 1.6); ctx.fillStyle = eye; ctx.fillRect(hx - 2.5, headY - 0.3, 1, 1); ctx.fillRect(hx + 1.5, headY - 0.3, 1, 1); }
      else { ctx.fillRect(hx + 1.8, headY - 0.5, 1.8, 1.6); ctx.fillStyle = eye; ctx.fillRect(hx + 2.4, headY - 0.3, 0.9, 1); }
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(hx - 1 + o, headY + 3.2, 2.4, 0.8);
      if (female && body === "human") { ctx.fillStyle = "rgba(140,50,50,0.35)"; ctx.fillRect(hx - 1 + o, headY + 3.2, 2.4, 0.9); }
      // борода
      if (!female && body === "human" && look.beard) {
        const bc = HAIR_COLORS[look.hairColor ?? 0];
        ctx.fillStyle = look.beard === 1 ? rgba(bc, 0.35) : bc;
        ctx.beginPath();
        if (dir === 0) ctx.ellipse(hx, headY + 3.6, 5, look.beard === 3 ? 5.5 : 3, 0, 0, Math.PI);
        else ctx.ellipse(hx + 2, headY + 3.6, 3.4, look.beard === 3 ? 5 : 2.8, 0, 0, Math.PI);
        ctx.fill();
      }
      if (look.scar && body === "human") {
        ctx.strokeStyle = look.scar === 3 ? "rgba(60,90,160,0.8)" : "rgba(120,40,40,0.7)"; ctx.lineWidth = 0.8; ctx.beginPath();
        if (look.scar === 1) { ctx.moveTo(hx - 3 + o, headY - 3.5); ctx.lineTo(hx - 1.5 + o, headY + 0.5); }
        else if (look.scar === 2) { ctx.moveTo(hx + 2 + o, headY + 0.5); ctx.lineTo(hx + 4 + o, headY + 3.5); }
        else { ctx.moveTo(hx - 3 + o, headY + 1.5); ctx.lineTo(hx - 3 + o, headY + 3.5); ctx.moveTo(hx + 3 + o, headY + 1.5); ctx.lineTo(hx + 3 + o, headY + 3.5); }
        ctx.stroke();
      }
    }
    if (body === "witch") {
      ctx.fillStyle = "#1a1418"; ctx.beginPath(); ctx.moveTo(hx - 11, headY - 3); ctx.lineTo(hx + 11, headY - 3); ctx.lineTo(hx + 3, headY - 8); ctx.lineTo(hx - 2, headY - 20); ctx.lineTo(hx - 4, headY - 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#4a4a50"; ctx.fillRect(hx - 6.5, headY - 3, 2.5, 12); ctx.fillRect(hx + 4, headY - 3, 2.5, 12);
    } else if (body === "ghoul") {
      ctx.fillStyle = "rgba(30,30,24,0.8)"; for (let i = 0; i < 5; i++) ctx.fillRect(hx - 5 + i * 2.4, headY - 6, 1, 7);
    } else if (look.helm) {
      drawHelm(ctx, look.helm, hx, headY, dir, main);
    } else {
      hairFront(ctx, look.hair ?? 0, HAIR_COLORS[look.hairColor ?? 0], hx, headY, dir);
    }
  }
  if (body === "human" && dir === 1 && !look.helm) hairBack(ctx, look.hair, HAIR_COLORS[look.hairColor ?? 0], cx, headY, 1, female);

  // передняя рука и оружие
  let ang, handX, handY;
  const wcol = look.weaponColor || "#9aa0a8";
  const ranged = look.weapon === "bow" || look.weapon === "staff";
  if (atk >= 0) {
    // взмах: от -110° к +40° (для лука/посоха — выставить вперёд)
    if (ranged) ang = look.weapon === "bow" ? 0 : (dir === 2 ? 0.6 : dir === 0 ? -0.25 : 0.25);
    else ang = (-1.9 + atk * 2.6) * (dir === 0 ? -1 : 1) + (dir === 0 ? Math.PI : 0);
  }
  if (dir === 2) {
    const reach = atk >= 0 ? 7 + Math.sin(atk * Math.PI) * 5 : 0;
    handX = cx + 4 + Math.sin(-swing) * 7 + reach; handY = shY + 13 - (atk >= 0 ? 6 : 0);
    if (atk < 0) ang = look.weapon === "bow" ? 0 : 0.5 + swing * 0.4;
    if (look.offhand === "shield") drawShield(ctx, cx - 2, shY + 10, shade(main, -0.1), false);
    limb(ctx, cx + 1, shY + 2, handX, handY, body === "golem" ? 6.5 : 3.6, armCol);
    if (look.weapon) drawWeapon(ctx, look.weapon, handX, handY, ang, wcol);
    ctx.fillStyle = handCol; ctx.beginPath(); ctx.arc(handX, handY, 1.9, 0, 7); ctx.fill();
  } else {
    const side = dir === 0 ? -1 : 1; // оружие в правой руке
    const lx = cx - side * (shW + 1), rx = cx + side * (shW + 1);
    const lh = [lx - side * 1, shY + 14 + swing * 4], rh = [rx + side * 1, shY + 14 - swing * 4];
    if (atk >= 0) { rh[0] = rx + side * 3; rh[1] = shY + 10 - Math.sin(atk * Math.PI) * 4; }
    if (atk < 0) ang = look.weapon === "bow" ? 0 : (dir === 0 ? -0.35 : 0.35) * side + (dir === 0 ? 0 : Math.PI);
    const drawRight = () => {
      limb(ctx, rx, shY + 2, rh[0], rh[1], body === "golem" ? 6.5 : 3.6, armCol);
      if (look.weapon) drawWeapon(ctx, look.weapon, rh[0], rh[1], ang, wcol);
      ctx.fillStyle = handCol; ctx.beginPath(); ctx.arc(rh[0], rh[1], 1.9, 0, 7); ctx.fill();
    };
    const drawLeft = () => {
      limb(ctx, lx, shY + 2, lh[0], lh[1], body === "golem" ? 6.5 : 3.6, armCol);
      if (look.offhand === "shield") drawShield(ctx, lh[0], lh[1] - 2, shade(main, -0.1), dir === 0);
      else if (look.offhand === "dagger") drawWeapon(ctx, "dagger", lh[0], lh[1], dir === 0 ? Math.PI - 0.3 : 0.3, wcol);
      ctx.fillStyle = handCol; ctx.beginPath(); ctx.arc(lh[0], lh[1], 1.9, 0, 7); ctx.fill();
    };
    if (dir === 1) { drawRight(); drawLeft(); } else { drawLeft(); drawRight(); }
  }
  if (pose.cast) {
    const g = ctx.createRadialGradient(cx, shY + 6, 0, cx, shY + 6, 16);
    g.addColorStop(0, rgba(look.castColor || "#80a0ff", 0.55)); g.addColorStop(1, rgba(look.castColor || "#80a0ff", 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, shY + 6, 16, 0, 7); ctx.fill();
  }
  if (pose.hurt) { ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = "rgba(255,60,40,0.45)"; ctx.fillRect(0, 0, 64, 80); }
  ctx.restore();
}

function radialFill(ctx, x, y, r, base) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, shade(base, 0.22)); g.addColorStop(0.6, base); g.addColorStop(1, shade(base, -0.45));
  return g;
}

function drawHelm(ctx, kind, hx, hy, dir, main) {
  if (kind === "cloth") { // капюшон
    const c = shade(main, -0.15);
    ctx.fillStyle = radialFill(ctx, hx, hy - 1, 8, c);
    ctx.beginPath(); ctx.ellipse(hx, hy - 1, 7.6, 8, 0, 0, 7); ctx.fill();
    if (dir !== 1) { ctx.fillStyle = "rgba(10,8,8,0.75)"; ctx.beginPath(); ctx.ellipse(hx + (dir === 2 ? 2.5 : 0), hy + 1, dir === 2 ? 3.5 : 5, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(220,200,170,0.6)"; if (dir === 0) { ctx.fillRect(hx - 2.8, hy, 1.5, 1); ctx.fillRect(hx + 1.3, hy, 1.5, 1); } }
  } else if (kind === "leather") {
    ctx.fillStyle = radialFill(ctx, hx, hy - 3, 7, "#4a3424");
    ctx.beginPath(); ctx.ellipse(hx, hy - 2.5, 6.8, 5.6, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#2a1c12"; ctx.fillRect(hx - 7, hy - 3, 14, 1.8);
  } else {
    ctx.fillStyle = radialFill(ctx, hx, hy - 1, 7.5, "#7a7e86");
    ctx.beginPath(); ctx.ellipse(hx, hy - 1, 7, 7.6, 0, 0, 7); ctx.fill();
    if (dir !== 1) { ctx.fillStyle = "#121214"; if (dir === 0) ctx.fillRect(hx - 4.5, hy - 1, 9, 1.8); else ctx.fillRect(hx + 1, hy - 1, 5, 1.8);
      ctx.fillStyle = "#3a3c40"; ctx.fillRect(hx - 0.7 + (dir === 2 ? 3 : 0), hy - 1, 1.4, 6); }
    ctx.fillStyle = "#8a2a20"; ctx.fillRect(hx - 1, hy - 10, 2, 4);
  }
}

// Лист кадров: строки — направления (вниз, вверх, вбок), столбцы: 4 ходьба, 3 атака, 1 каст.
export const H_FRAME = { w: 64, h: 80, cols: 8 };
export function buildHumanoidSheet(look, res = 2) {
  const fw = H_FRAME.w * res, fh = H_FRAME.h * res;
  const c = canvas(fw * H_FRAME.cols, fh * 3), ctx = c.getContext("2d");
  for (let dir = 0; dir < 3; dir++) {
    for (let f = 0; f < 8; f++) {
      ctx.save(); ctx.translate(f * fw, dir * fh);
      const pose = { dir, walk: 0, attack: -1 };
      if (f < 4) pose.walk = f / 4;
      else if (f < 7) pose.attack = (f - 4) / 2;
      else { pose.cast = true; pose.attack = 0.5; }
      if (f === 0) pose.walk = 0;
      drawHumanoid(ctx, look, pose, res);
      ctx.restore();
    }
  }
  return c;
}

export function portrait(look, size = 96) {
  const c = canvas(size, size), ctx = c.getContext("2d");
  const s = size / 26;
  ctx.translate(size / 2 - 32 * s, size * 0.62 - 24 * s);
  drawHumanoid(ctx, Object.assign({}, look, { weapon: null, offhand: null }), { dir: 0, walk: 0, attack: -1 }, s);
  return c;
}
