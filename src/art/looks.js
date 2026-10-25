// Готовые облики героев, нарисованные в ChatGPT (листы hero_<класс>_<пол>[_N] в assets/manifest.json).
import { G } from "../core/G.js";
import { canvas } from "./paint.js";

export function artLooks(cls, gender) {
  if (!G.art) return [];
  const pre = `hero_${cls}_${gender}`;
  return Object.keys(G.art).filter(k => (k === pre || k.startsWith(pre + "_")) && G.game.textures.exists(k)).sort()
    .map((key, i) => ({ key, name: G.art[key].title || `Облик ${i + 1}` }));
}

// какой лист использовать для сохранённого облика: undefined — первый готовый, null — свой (рисованный кодом)
export function heroArtKey(st) {
  const looks = artLooks(st.cls, st.look.gender);
  if (st.look.art === null) return null;
  if (st.look.art && looks.find(l => l.key === st.look.art)) return st.look.art;
  return looks.length ? looks[0].key : null;
}

// кадр листа: row 0 — спереди, 1 — со спины, 2 — сбоку; col 0–3 — шаги, 4 — стоит, 5 — удар
// раскладка r16 (риг-анимации): на направление 2 строки по 8 кадров — 0–7 ходьба, 8–12 удар, 13 каст, 14–15 покой
const R16 = [0, 2, 4, 6, 14, 9, 11, 13];
export function cellOf(meta, row, col) {
  if (meta.layout !== "r16") return [row, col];
  const c = R16[col] ?? 0; return [row * 2 + (c >> 3), c & 7];
}
export function drawArtFrame(ctx, key, row, col, dx, dy, dh, flip = false) {
  const meta = G.art[key]; const img = G.game.textures.get(key).getSourceImage();
  [row, col] = cellOf(meta, row, col);
  // широкие кадры: масштаб по «старой» высоте 80 единиц, ступни — внизу области
  const s = dh / (meta.res ? meta.res * 80 : meta.fh);
  ctx.save();
  if (meta.foot) ctx.translate(dx + dh * 0.4 - meta.foot[0] * s, dy + dh * 74 / 80 - meta.foot[1] * s); else ctx.translate(dx, dy);
  if (flip) { ctx.translate(meta.fw * s, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, col * meta.fw, row * meta.fh, meta.fw, meta.fh, 0, 0, meta.fw * s, meta.fh * s);
  ctx.restore();
}

export function artPortrait(key, size) {
  const c = canvas(size, size), ctx = c.getContext("2d");
  // отдельный нарисованный портрет, если есть
  if (G.art["pt_" + key] && G.game.textures.exists("pt_" + key)) {
    ctx.imageSmoothingQuality = "high"; ctx.drawImage(G.game.textures.get("pt_" + key).getSourceImage(), 0, 0, size, size); return c;
  }
  const meta = G.art[key]; const img = G.game.textures.get(key).getSourceImage();
  // голова и плечи стоящего героя (кадр спереди)
  const sw = meta.fw * 0.5, sh = meta.fh * 0.36;
  const [pr, pc] = cellOf(meta, 0, 4);
  ctx.drawImage(img, pc * meta.fw + meta.fw * 0.25, pr * meta.fh + meta.fh * 0.1, sw, sh, 0, 0, size, size * sh / sw);
  return c;
}
