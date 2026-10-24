// Готовит задания для ChatGPT: листы иконок навыков 4×4 и раскладку «ячейка → навык».
import { CLASSES, CLASS_ORDER } from "../src/data/classes.js";
import { writeFileSync } from "node:fs";
const all = [];
for (const c of CLASS_ORDER) {
  const cl = CLASSES[c];
  for (const s of cl.skills) all.push({ id: s.id, cls: cl.name, name: s.name, desc: s.desc, kind: s.kind });
  for (const sc of Object.values(cl.subclasses)) for (const s of sc.skills) all.push({ id: s.id, cls: cl.name + " / " + sc.name, name: s.name, desc: s.desc, kind: s.kind });
}
const jobs = [];
for (let i = 0; i < all.length; i += 16) {
  const part = all.slice(i, i + 16);
  const list = part.map((s, k) => `${k + 1}) «${s.name}» (${s.cls}, ${s.kind === "passive" ? "пассивный" : "активный"}): ${s.desc}`).join("; ");
  const text = `Задание: лист иконок навыков для той же игры, стиль Zenonia 5 — рисованные, выразительные, хорошо читаются в маленьком размере, мрачноватая палитра с яркими акцентами магии. ОДНО квадратное изображение, строгая сетка 4×4 из 16 одинаковых квадратных ячеек без промежутков и без подписей; в каждой ячейке одна иконка, заполняющая ячейку: тёмный фон внутри тонкой рамки, по центру крупный символ навыка. Пассивные навыки — с серебристой рамкой, активные — с золотистой. Иконки по порядку слева направо, сверху вниз: ${list}.`;
  jobs.push({ name: `icons_skills_${String(jobs.length + 1).padStart(2, "0")}.png`, text, ids: part.map(s => s.id) });
}
writeFileSync("tools-static/icon_jobs.json", JSON.stringify(jobs, null, 1));
console.log(all.length, "skills,", jobs.length, "sheets");
