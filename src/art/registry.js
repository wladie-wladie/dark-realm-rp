// Регистрация процедурной графики как текстур Phaser.
// Если в assets/manifest.json указана картинка с тем же ключом (например нарисованная в GPT),
// она загружается раньше и заменяет процедурную.
import { buildPropCanvases, PROPS } from "./props.js";
import { buildFxCanvases } from "./icons.js";
import { buildTerrainTextures } from "./terrain.js";
import { canvas, softBrush } from "./paint.js";
import { buildHumanoidSheet, H_FRAME } from "./humanoid.js";
import { buildCreatureSheet } from "./creatures.js";

export const PROP_RES = 1.5;
export const CHAR_RES = 2;
export let TERRAIN = null;

// Лист кадров из ChatGPT (assets/manifest.json): нарезаем на кадры один раз.
export function artSheet(scene, key) {
  const meta = G.art && G.art[key];
  if (!meta || !scene.textures.exists(key)) return null;
  const tex = scene.textures.get(key);
  if (!tex.has(0)) {
    const src = tex.getSourceImage();
    addFrames(tex, meta.fw, meta.fh, Math.round(src.width / meta.fw), Math.round(src.height / meta.fh));
  }
  return { key, sheet: meta.type === "hsheet" ? "h" : "c", idleCol: meta.type === "hsheet" ? 4 : 0 };
}

export function registerStatic(scene) {
  const T = scene.textures;
  const props = buildPropCanvases(PROP_RES);
  for (const [k, c] of Object.entries(props)) if (!T.exists("prop_" + k)) T.addCanvas("prop_" + k, c);
  const fx = buildFxCanvases();
  for (const [k, c] of Object.entries(fx)) if (!T.exists("fx_" + k)) T.addCanvas("fx_" + k, c);
  TERRAIN = buildTerrainTextures();
  // земля из ChatGPT заменяет процедурную (дорога — той же утоптанной землёй)
  const map = { grass: "grass", cobble: "cobble", dirt: "dirt", road: "dirt", forest: "forest", mud: "mud", swampgrass: "swampgrass", swampwater: "swampwater", water: "water", stone: "stone", ash: "ash" };
  let seed = 3;
  for (const [name, art] of Object.entries(map)) {
    if (!T.exists("ter_" + art)) continue;
    const img = T.get("ter_" + art).getSourceImage();
    (TERRAIN.src = TERRAIN.src || {})[name] = img; // полное разрешение — для чёткой земли
    const S = 300; const c = canvas(S, S); const cx = c.getContext("2d"); cx.imageSmoothingQuality = "high"; cx.drawImage(img, 0, 0, S, S);
    TERRAIN.tex[name] = c;
    TERRAIN.brushes[name] = [0, 1, 2].map(i => softBrush(c, 160, seed++ * 11 + i, name === "cobble" ? 0.8 : 0.55));
  }
}

function addFrames(tex, fw, fh, cols, rows) {
  let i = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) tex.add(i++, 0, c * fw, r * fh, fw, fh);
}

export function ensureHumanoid(scene, key, look) {
  const T = scene.textures;
  if (T.exists(key)) T.remove(key);
  const c = buildHumanoidSheet(look, CHAR_RES);
  const tex = T.addCanvas(key, c);
  addFrames(tex, H_FRAME.w * CHAR_RES, H_FRAME.h * CHAR_RES, H_FRAME.cols, 3);
  return key;
}

export function ensureCreature(scene, key, kind, opts) {
  const T = scene.textures;
  if (T.exists(key)) return key;
  const c = buildCreatureSheet(kind, opts, CHAR_RES);
  const tex = T.addCanvas(key, c);
  addFrames(tex, 80 * CHAR_RES, 64 * CHAR_RES, 7, 1);
  return key;
}

import { G } from "../core/G.js";
// Масштаб и точка опоры объекта: для своей картинки — из manifest (ширина в мире), иначе процедурная.
export function propLook(scene, key, def) {
  const meta = G.art && G.art["prop_" + key];
  const src = scene.textures.get("prop_" + key).getSourceImage();
  if (meta && src && src.width) {
    // изо-постройка: ширина = сумма сторон основания в клетках, опора — нижний угол основания
    const w = meta.foot ? (meta.foot[0] + meta.foot[1]) * 64 * (meta.k || 1) : (meta.w || def.w);
    return { scale: w / src.width, originY: meta.oy ?? (meta.foot ? 1 : 0.96), originX: meta.ox ?? 0.5, w, h: src.height * w / src.width, foot: meta.foot };
  }
  return { scale: 1 / PROP_RES, originY: (def.h - 10) / def.h, w: def.w, h: def.h };
}
