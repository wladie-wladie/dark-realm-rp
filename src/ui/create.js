// Экран создания персонажа: пол, класс, внешность, имя.
import { h, clear } from "./dom.js";
import { CLASSES, CLASS_ORDER } from "../data/classes.js";
import { drawHumanoid, SKIN, HAIR_COLORS, EYE_COLORS, HAIR_STYLES_M, BEARDS, SCARS } from "../art/humanoid.js";
import { canvas } from "../art/paint.js";

const NAMES_M = ["Ратмир", "Всеслав", "Годослав", "Ярополк", "Остромир", "Велимир", "Бранко", "Ольгерд"];
const NAMES_F = ["Злата", "Ведана", "Мирослава", "Ярина", "Белослава", "Огняна", "Влада", "Рогнеда"];

export class CharacterCreator {
  constructor(ui, slot) {
    this.ui = ui; this.slot = slot;
    this.look = { gender: "m", skin: 1, hair: 0, hairColor: 1, beard: 0, eyes: 0, scar: 0 };
    this.cls = "warrior";
    this.dir = 0; this.walk = 0;
    this.name = NAMES_M[Math.floor(Math.random() * NAMES_M.length)];
  }

  fullLook() {
    const c = CLASSES[this.cls];
    return { ...this.look, armor: c.armor, weapon: c.weapon, offhand: c.offhand, colors: c.colors, weaponColor: c.weaponColor };
  }

  mount(root) {
    this.cv = canvas(320, 400);
    const rot = h("div.rot", {},
      h("button.btn.small", { onclick: () => { this.view = ((this.view || 0) + 1) % 4; [this.dir, this.flip] = [[0, false], [2, false], [1, false], [2, true]][this.view]; this.draw(); } }, "⟲ Повернуть"),
      h("button.btn.small", { onclick: () => { this.anim = !this.anim; } }, "▶ Шаг"));
    this.form = h("div.form.frame.scroll");
    const wrap = h("div.screen", {}, h("div.create", {}, h("div.preview.frame", {}, this.cv, h("div.title-deco", { style: { marginTop: "4px" } }, "Ваш герой"), rot), this.form));
    root.appendChild(wrap);
    this.render();
    this.draw();
    const loop = () => { if (!this.cv.isConnected) return; if (this.anim) { this.walk = (this.walk + 0.03) % 1; this.draw(); } requestAnimationFrame(loop); };
    loop();
  }

  draw() {
    const ctx = this.cv.getContext("2d");
    ctx.clearRect(0, 0, 320, 400);
    ctx.save();
    const s = 4.4;
    ctx.translate(160 - 32 * s, 380 - 76 * s);
    if (this.dir === 2 && this.flip) { ctx.translate(64 * s, 0); ctx.scale(-1, 1); }
    drawHumanoid(ctx, this.fullLook(), { dir: this.dir, walk: this.anim ? this.walk : 0, attack: -1 }, s);
    ctx.restore();
  }

  render() {
    const f = clear(this.form), L = this.look;
    const set = (k, v) => { L[k] = v; this.render(); this.draw(); };
    const seg = (opts, cur, fn) => h("div.seg", {}, opts.map(([v, t]) => h("button", { class: v === cur ? "on" : "", onclick: () => fn(v) }, t)));
    const swatches = (cols, k) => h("div.seg", {}, cols.map((c, i) => h("button.sw", { class: L[k] === i ? "on" : "", style: { background: c }, onclick: () => set(k, i) })));
    const stepper = (list, k) => h("div.stepper", {},
      h("button.btn.small", { onclick: () => set(k, (L[k] - 1 + list.length) % list.length) }, "‹"),
      h("span", {}, list[L[k]]),
      h("button.btn.small", { onclick: () => set(k, (L[k] + 1) % list.length) }, "›"));
    const nameIn = h("input.text-in", { value: this.name, maxlength: 16, oninput: e => (this.name = e.target.value) });
    const c = CLASSES[this.cls];
    f.appendChild(h("h2.title-deco", {}, "Создание героя"));
    f.appendChild(h("div.opt", {}, h("label", {}, "Имя"), nameIn, h("button.btn.small", { onclick: () => { const pool = L.gender === "f" ? NAMES_F : NAMES_M; this.name = pool[Math.floor(Math.random() * pool.length)]; this.render(); } }, "🎲")));
    f.appendChild(h("div.opt", {}, h("label", {}, "Пол"), seg([["m", "Мужской"], ["f", "Женский"]], L.gender, v => { L.gender = v; if (v === "f") L.beard = 0; const pool = v === "f" ? NAMES_F : NAMES_M; if ((v === "f" ? NAMES_M : NAMES_F).includes(this.name)) this.name = pool[Math.floor(Math.random() * pool.length)]; this.render(); this.draw(); })));
    f.appendChild(h("div", { class: "muted", style: { fontSize: "14px" } }, "Класс"));
    f.appendChild(h("div.classes", {}, CLASS_ORDER.map(id => {
      const cc = CLASSES[id];
      return h("button.cls", { class: id === this.cls ? "on" : "", onclick: () => { this.cls = id; this.render(); this.draw(); } }, h("b", {}, cc.name), h("small", {}, cc.desc));
    })));
    f.appendChild(h("div.subs", {}, "С 10-го уровня — подкласс: ", Object.values(c.subclasses).map(s => s.name).join(", ")));
    f.appendChild(h("div.opt", {}, h("label", {}, "Кожа"), swatches(SKIN, "skin")));
    f.appendChild(h("div.opt", {}, h("label", {}, "Причёска"), stepper(HAIR_STYLES_M, "hair")));
    f.appendChild(h("div.opt", {}, h("label", {}, "Цвет волос"), swatches(HAIR_COLORS, "hairColor")));
    f.appendChild(h("div.opt", {}, h("label", {}, "Глаза"), swatches(EYE_COLORS, "eyes")));
    if (L.gender === "m") f.appendChild(h("div.opt", {}, h("label", {}, "Борода"), stepper(BEARDS, "beard")));
    f.appendChild(h("div.opt", {}, h("label", {}, "Особые приметы"), stepper(SCARS, "scar")));
    f.appendChild(h("div.row", { style: { marginTop: "6px" } },
      h("button.btn", { onclick: () => this.ui.titleScreen() }, "Назад"),
      h("div.grow"),
      h("button.btn", { onclick: () => { L.skin = rnd(SKIN.length); L.hair = rnd(8); L.hairColor = rnd(HAIR_COLORS.length); L.eyes = rnd(EYE_COLORS.length); L.beard = L.gender === "m" ? rnd(4) : 0; L.scar = rnd(4); this.render(); this.draw(); } }, "Случайно"),
      h("button.btn.primary", { onclick: () => this.finish() }, "Начать путь")));
  }

  finish() {
    const name = (this.name || "").trim();
    if (!name) { alert("Введите имя героя"); return; }
    this.ui.createNew(this.slot, { name, cls: this.cls, look: { ...this.look } });
  }
}
const rnd = n => Math.floor(Math.random() * n);
