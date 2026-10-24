// Изометрия: клетки карты — ромбы 2:1. Логика игры живёт в экранных координатах мира,
// а описания земель (клетки) переводятся сюда через tw()/tt().
export const IW = 128, IH = 64; // размер ромба клетки в пикселях мира
let OX = 0;
export function setIsoZone(W, H) { OX = H * IW / 2; }
export const isoSize = (W, H) => [(W + H) * IW / 2, (W + H) * IH / 2];
// клетка (может быть дробной) → точка мира
export const tw = (tx, ty) => [(tx - ty) * IW / 2 + OX, (tx + ty) * IH / 2];
// точка мира → клетка (дробная)
export function tt(x, y) { const a = (x - OX) / (IW / 2), b = y / (IH / 2); return [(a + b) / 2, (b - a) / 2]; }
// матрица для отрисовки «квадратного» мира (клетка = 64 px) ромбами
export const isoMatrix = () => [IW / 128, IH / 128, -IW / 128, IH / 128, OX, 0];
export const ELEV = 60; // высота уступа/скалы в пикселях мира
