// Визуальные пресеты: насколько игра похожа на Zenonia 5 (свет, камера, контуры, интерфейс).
export const STYLES = {
  a: { name: "Как сейчас", dark: 1, sat: 0, vignette: 1, mood: 1, zoom: 1, outline: 0, hud: "" },
  b: { name: "Ясный день", dark: 0, sat: 0.18, vignette: 0.25, mood: 0.35, zoom: 0.8, outline: 0, hud: "" },
  c: { name: "Как Zenonia", dark: 0, sat: 0.08, vignette: 0.15, mood: 0.25, zoom: 0.74, outline: 1, hud: "z", dmg: 1.45, contrast: 0.08 },
  d: { name: "Сумрачная Zenonia", dark: 0.65, sat: 0.06, vignette: 0.7, mood: 0.9, zoom: 0.84, outline: 1, hud: "z", dmg: 1.3 },
};
let cur = "a";
try { cur = localStorage.getItem("visualStyle") || "a"; } catch (_) {}
if (!STYLES[cur]) cur = "a";
export const style = () => STYLES[cur];
export const styleId = () => cur;
export function setStyle(id) { if (!STYLES[id]) return; cur = id; try { localStorage.setItem("visualStyle", id); } catch (_) {} document.body.classList.toggle("hud-z", STYLES[id].hud === "z"); }
if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => document.body.classList.toggle("hud-z", STYLES[cur].hud === "z"));
