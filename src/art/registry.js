// Регистрация процедурной графики как текстур Phaser.
// Если в assets/manifest.json указана картинка с тем же ключом (например нарисованная в GPT),
// она загружается раньше и заменяет процедурную.
import { buildPropCanvases, PROPS } from "./props.js";
import { buildFxCanvases } from "./icons.js";
import { buildTerrainTextures } from "./terrain.js";
import { buildHumanoidSheet, H_FRAME } from "./humanoid.js";
import { buildCreatureSheet } from "./creatures.js";

export const PROP_RES = 1.5;
export const CHAR_RES = 2;
export let TERRAIN = null;

export function registerStatic(scene) {
  const T = scene.textures;
  const props = buildPropCanvases(PROP_RES);
  for (const [k, c] of Object.entries(props)) if (!T.exists("prop_" + k)) T.addCanvas("prop_" + k, c);
  const fx = buildFxCanvases();
  for (const [k, c] of Object.entries(fx)) if (!T.exists("fx_" + k)) T.addCanvas("fx_" + k, c);
  TERRAIN = buildTerrainTextures();
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

export function propScale(scene, key) {
  // своя картинка из manifest рисуется в натуральную величину объекта
  const def = PROPS[key.split("_").slice(0, -1).join("_")] || null;
  const tex = scene.textures.get("prop_" + key);
  const src = tex.getSourceImage();
  if (def && src && src.width) return def.w / src.width;
  return 1 / PROP_RES;
}
