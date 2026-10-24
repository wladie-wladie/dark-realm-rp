// Окна героя: характеристики и снаряжение, сумка, навыки, задания, карта, меню.
import { G } from "../core/G.js";
import { h, clear } from "./dom.js";
import { CLASSES, STAT_NAMES, allSkills, STATUS } from "../data/classes.js";
import { SLOTS, QUALITY, TIER_NAMES, ARMOR_TYPES, POTIONS, RESOURCES, itemValue } from "../data/items.js";
import { ZONES, DANGER } from "../data/zones.js";
import { derive, power, canLearn, masteryLevel, skillValues, gatherLevel, saveGame, xpToNext } from "../systems/state.js";
import { skillIcon } from "../art/icons.js";
import { questById, progressText, isComplete } from "../systems/quests.js";
import { updateState, checkForUpdates, applyUpdateNow, onUpdateState } from "../native.js";
import { APP_VERSION } from "../version.js";

const TABS = [["hero", "Герой"], ["bag", "Сумка"], ["skills", "Навыки"], ["quests", "Задания"], ["map", "Карта"], ["menu", "Меню"]];
const fmt = v => (Math.round(v * 10) / 10).toString();

export class Panels {
  constructor(ui) { this.ui = ui; this.sel = null; this.selSkill = null; }

  open(tab) {
    if (G.world && G.world.player.dead) return;
    this.tab = tab;
    this.head = h("div.tabs");
    this.body = h("div.panel-body");
    const panel = h("div.panel.frame", {}, h("div.panel-head", {}, this.head, h("button.close", { onclick: () => this.close() }, "✕")), this.body);
    this.close = this.ui.modal(panel, () => { G.world && G.world.recalc(); });
    this.render();
  }

  render() {
    clear(this.head);
    for (const [id, name] of TABS) this.head.appendChild(h("button.tab", { class: id === this.tab ? "on" : "", onclick: () => { this.tab = id; this.sel = null; this.render(); } }, name));
    clear(this.body);
    this["tab_" + this.tab]();
  }

  // ---------- герой ----------
  tab_hero() {
    const st = G.st, W = G.world, d = W ? W.pstats : derive(st);
    const cls = CLASSES[st.cls];
    const left = h("div.col.scroll", { style: { width: "42%" } });
    left.appendChild(h("div.box", {},
      h("h3", {}, `${st.name} — ${cls.name}${st.sub ? " · " + cls.subclasses[st.sub].name : ""}`),
      h("div.muted", {}, `Уровень ${st.level}, опыт ${st.xp} / ${xpToNext(st.level)}`),
      h("div.muted", {}, `Сила снаряжения: ${power(st)} · Золото: ${st.gold}`)));
    const attrs = h("div.box", {}, h("h3", {}, `Характеристики${st.statPoints ? ` (очков: ${st.statPoints})` : ""}`));
    for (const k of ["str", "dex", "int", "vit"]) {
      attrs.appendChild(h("div.attr", {}, h("span", {}, STAT_NAMES[k]), h("b", {}, d.attr[k]),
        st.statPoints ? h("button.plus", { onclick: () => { st.attr[k]++; st.statPoints--; W && W.recalc(); this.render(); this.ui.refresh(); } }, "+") : null));
    }
    attrs.appendChild(h("div.hint", {}, "Сила — физ. урон и здоровье, Ловкость — крит, скорость атаки, уклонение, Интеллект — магия и мана, Выносливость — здоровье и защита."));
    left.appendChild(attrs);
    const gb = h("div.box", {}, h("h3", {}, "Ремёсла (растут от работы)"));
    for (const [k, n] of [["wood", "Лесоруб"], ["ore", "Рудокоп"], ["herb", "Травник"], ["fiber", "Сборщик"], ["craft", "Кузнечное дело"], ["alchemy", "Алхимия"]]) gb.appendChild(h("div.attr", {}, h("span", {}, n), h("b", {}, gatherLevel(st, k))));
    left.appendChild(gb);
    const mid = h("div.col", { style: { width: "26%", alignItems: "center" } });
    const eq = h("div.eq");
    for (const s of ["head", "amulet", "ring", "weapon", "chest", "boots"]) eq.appendChild(this.equipCell(s));
    mid.appendChild(h("div.box", { style: { width: "100%" } }, h("h3", {}, "Снаряжение"), eq, h("div.hint", { style: { marginTop: "6px" } }, "Нажмите на вещь, чтобы снять или посмотреть.")));
    mid.appendChild(this.detailBox());
    const right = h("div.col.scroll", { style: { flex: 1 } });
    const rows = [["Здоровье", d.hp], ["Мана", d.mp], ["Физ. атака", d.atk], ["Маг. атака", d.matk], ["Защита", d.def], ["Шанс крита", fmt(d.crit) + "%"], ["Урон крита", d.critDmg + "%"],
      ["Скорость атаки", "+" + fmt(d.aspd) + "%"], ["Скорость бега", (d.move >= 0 ? "+" : "") + fmt(d.move) + "%"], ["Уклонение", fmt(d.dodge) + "%"], ["Восст. здоровья", fmt(d.hpRegen) + "/с"], ["Восст. маны", fmt(d.mpRegen) + "/с"],
      ["Вампиризм", fmt(d.lifesteal) + "%"], ["Сокр. перезарядки", fmt(d.cdr) + "%"], ["Бонус урона", fmt(d.dmg) + "%"]];
    if (d.block) rows.push(["Блок", fmt(d.block) + "%"]);
    if (d.thorns) rows.push(["Отражение", fmt(d.thorns) + "%"]);
    right.appendChild(h("div.box", {}, h("h3", {}, "Боевые параметры"), h("div.stats", {}, rows.map(([a, b]) => [h("div", {}, a), h("div", {}, b)]))));
    this.body.append(left, mid, right);
  }

  equipCell(slot) {
    const st = G.st, it = st.equip[slot];
    const c = h("button.cell", { class: this.sel && this.sel.where === "equip" && this.sel.slot === slot ? "sel" : "", onclick: () => { this.sel = it ? { where: "equip", slot, it } : null; this.render(); } });
    if (it) { c.appendChild(h("img", { src: this.ui.itemIcon(it) })); if (it.dur < 25) c.appendChild(h("i.durw")); }
    else c.appendChild(h("div.lbl", {}, SLOTS[slot]));
    return c;
  }

  itemDetail(it) {
    const st = G.st;
    const box = h("div.detail");
    box.appendChild(h("div.nm", { style: { color: this.ui.itemColor(it) } }, this.ui.itemName(it)));
    if (it.cat === "gear") {
      box.appendChild(h("div.muted", {}, `${QUALITY[it.quality].name} · ${SLOTS[it.slot]}${it.type ? " · " + ARMOR_TYPES[it.type].name : ""} · Сила ${it.ip}`));
      for (const [k, v] of Object.entries(it.stats)) {
        const isAff = it.affixes.some(a => a.stat === k);
        box.appendChild(h("div", { class: isAff ? "af" : "st" }, `${STAT_NAMES[k] || k}: ${v > 0 ? "+" : ""}${fmt(v)}`));
      }
      box.appendChild(h("div", { class: it.dur < 25 ? "lowdur" : "muted" }, `Прочность: ${Math.round(it.dur)}%${it.dur <= 0 ? " — сломано" : ""}`));
      if (it.slot === "weapon" && it.cls !== st.cls) box.appendChild(h("div.lowdur", {}, `Только для класса «${CLASSES[it.cls].name}»`));
      // сравнение с надетым
      const cur = st.equip[it.slot];
      if (cur && cur !== it) box.appendChild(h("div.muted", { style: { fontSize: "12px" } }, `Надето: сила ${cur.ip} (${it.ip >= cur.ip ? "+" : ""}${it.ip - cur.ip})`));
    } else if (it.cat === "potion") box.appendChild(h("div.muted", {}, POTIONS[it.id].desc));
    else box.appendChild(h("div.muted", {}, `Ресурс, тир ${RESOURCES[it.id].tier}. Нужен для ремесла.`));
    box.appendChild(h("div.muted", { style: { fontSize: "12px" } }, `Цена у торговца: ${Math.max(1, Math.round(itemValue(it) * 0.35))} зол.`));
    return box;
  }

  detailBox() {
    const box = h("div.box", { style: { width: "100%" } });
    const s = this.sel;
    if (!s) { box.appendChild(h("div.hint", {}, "Выберите предмет")); return box; }
    const st = G.st, it = s.it;
    box.appendChild(this.itemDetail(it));
    const btns = h("div.row", { style: { marginTop: "8px", flexWrap: "wrap" } });
    if (s.where === "equip") btns.appendChild(h("button.btn.small", { onclick: () => {
      if (st.bag.length >= 48) { this.ui.toast("Сумка полна"); return; }
      st.bag.push(it); st.equip[s.slot] = null; this.sel = null; this.afterGear();
    } }, "Снять"));
    else if (it.cat === "gear") {
      const can = it.slot !== "weapon" || it.cls === st.cls;
      btns.appendChild(h("button.btn.small.primary", { disabled: !can, onclick: () => {
        const cur = st.equip[it.slot]; st.bag.splice(st.bag.indexOf(it), 1); if (cur) st.bag.push(cur); st.equip[it.slot] = it; this.sel = null; this.afterGear();
      } }, "Надеть"));
    } else if (it.cat === "potion") {
      btns.appendChild(h("button.btn.small", { onclick: () => { st.potionSlots[0] = it.id; this.ui.refresh(); this.render(); } }, "В слот 1"));
      btns.appendChild(h("button.btn.small", { onclick: () => { st.potionSlots[1] = it.id; this.ui.refresh(); this.render(); } }, "В слот 2"));
    }
    if (s.where === "bag") btns.appendChild(h("button.btn.small.danger", { onclick: () => { if (!confirm("Выбросить " + this.ui.itemName(it) + "?")) return; st.bag.splice(st.bag.indexOf(it), 1); this.sel = null; this.render(); } }, "Выбросить"));
    box.appendChild(btns);
    return box;
  }
  afterGear() { if (G.world) G.world.refreshPlayerLook(); this.render(); this.ui.refresh(); }

  // ---------- сумка ----------
  tab_bag() {
    const st = G.st;
    const left = h("div.col", { style: { flex: 1.4, minWidth: 0 } });
    const sorted = [...st.bag];
    const grid = h("div.grid.scroll", { style: { flex: 1 } });
    for (const it of sorted) {
      const c = h("button.cell", { class: this.sel && this.sel.it === it ? "sel" : "", onclick: () => { this.sel = { where: "bag", it }; this.render(); } },
        h("img", { src: this.ui.itemIcon(it) }), it.n > 1 ? h("b", {}, it.n) : null);
      if (it.cat === "gear" && it.dur < 25) c.appendChild(h("i.durw"));
      grid.appendChild(c);
    }
    for (let i = sorted.length; i < 48; i++) grid.appendChild(h("div.cell"));
    left.appendChild(h("div.row", {}, h("span.title-deco", {}, `Сумка ${st.bag.length}/48`), h("div.grow"), h("span.gold-line", {}, `◉ ${st.gold}`),
      h("button.btn.small", { onclick: () => { st.bag.sort((a, b) => (a.cat > b.cat ? 1 : a.cat < b.cat ? -1 : (b.tier || 0) - (a.tier || 0) || (b.ip || 0) - (a.ip || 0))); this.render(); } }, "Сортировать")));
    left.appendChild(grid);
    const right = h("div.col", { style: { width: "38%" } });
    const eq = h("div.eq");
    for (const s of ["head", "amulet", "ring", "weapon", "chest", "boots"]) eq.appendChild(this.equipCell(s));
    right.appendChild(h("div.box", {}, eq));
    right.appendChild(h("div.scroll", { style: { flex: 1 } }, this.detailBox()));
    this.body.append(left, right);
  }

  // ---------- навыки ----------
  tab_skills() {
    const st = G.st, cls = CLASSES[st.cls];
    const list = h("div.col.scroll", { style: { flex: 1.3 } });
    list.appendChild(h("div.row", {}, h("span.title-deco", {}, `Очки навыков: ${st.skillPoints}`)));
    const section = (title, skills) => {
      list.appendChild(h("div", { class: "muted", style: { marginTop: "4px" } }, title));
      for (const s of skills) {
        const r = st.skills[s.id] || 0;
        const locked = st.level < s.lvl;
        const row = h("div.skill", { class: (locked ? "locked " : "") + (this.selSkill === s.id ? "sel" : ""), onclick: () => { this.selSkill = s.id; this.render(); } },
          h("img", { src: skillIcon(s.icon, 64) }),
          h("div.grow", {}, h("div.sn", {}, s.name, h("span.muted", { style: { fontSize: "12px" } }, s.kind === "passive" ? " · пассивный" : "")),
            h("div.rk", {}, h("span.pips", {}, [1, 2, 3, 4, 5].map(i => h("i", { class: i <= r ? "on" : "" }))), locked ? `  с ${s.lvl} ур.` : r && s.kind === "active" ? `  мастерство ${masteryLevel(st, s.id)}/10` : "")));
        list.appendChild(row);
      }
    };
    section(`${cls.name} — базовые навыки`, cls.skills);
    if (st.sub) section(`${cls.subclasses[st.sub].name} — навыки подкласса`, cls.subclasses[st.sub].skills);
    else list.appendChild(h("div.hint", { style: { margin: "6px 0" } }, `На 10-м уровне Наставник Ольгерд поможет выбрать подкласс: ${Object.values(cls.subclasses).map(s => s.name).join(", ")}.`));

    const right = h("div.col", { style: { width: "40%" } });
    const sk = allSkills(st.cls, st.sub).find(s => s.id === this.selSkill);
    const bar = h("div.slotbar");
    st.slots.forEach((id, i) => {
      const s = id && allSkills(st.cls, st.sub).find(x => x.id === id);
      bar.appendChild(h("button.cell", { onclick: () => {
        if (sk && sk.kind === "active" && st.skills[sk.id]) { const j = st.slots.indexOf(sk.id); if (j >= 0) st.slots[j] = null; st.slots[i] = sk.id; }
        else st.slots[i] = null;
        this.render(); this.ui.refresh();
      } }, s ? h("img", { src: skillIcon(s.icon, 64) }) : h("div.lbl", {}, String(i + 1))));
    });
    right.appendChild(h("div.box", {}, h("h3", {}, "Панель навыков"), bar, h("div.hint", { style: { marginTop: "4px" } }, "Выберите изученный активный навык и нажмите на ячейку. Нажатие на занятую ячейку без выбора — очистить.")));
    if (sk) {
      const r = st.skills[sk.id] || 0;
      const box = h("div.box.scroll", { style: { flex: 1 } }, h("div.row", {}, h("img", { src: skillIcon(sk.icon, 64), style: { width: "52px", borderRadius: "8px" } }), h("div", {}, h("div.sn", { style: { color: "var(--gold2)", fontSize: "17px" } }, sk.name), h("div.muted", {}, sk.kind === "passive" ? "Пассивный" : "Активный"))));
      box.appendChild(h("p", { style: { margin: "8px 0" } }, sk.desc));
      if (sk.kind === "active") {
        const v = skillValues(st, sk);
        const info = [];
        if (sk.mp) info.push(`Мана: ${v.mp}`); if (sk.cd) info.push(`Перезарядка: ${fmt(v.cd)} с`); if (sk.mul) info.push(`Сила: ${Math.round(v.mul * 100)}%`);
        if (sk.status) info.push(`${STATUS[sk.status[0]].name}: ${sk.status[1]} с`);
        box.appendChild(h("div.muted", {}, info.join(" · ")));
        box.appendChild(h("div.hint", { style: { marginTop: "4px" } }, "Каждый ранг +15% силы. Мастерство растёт от применения: +2% силы и −1% перезарядки за уровень."));
      } else {
        box.appendChild(h("div.muted", {}, `Сейчас: ${Object.entries(sk.per).map(([k, v]) => `${STAT_NAMES[k] || PER_NAMES[k] || k} +${fmt(v * r)}`).join(", ")}`));
      }
      const why = canLearn(st, sk);
      box.appendChild(h("div.row", { style: { marginTop: "8px" } },
        h("button.btn.primary", { disabled: !!why, onclick: () => { st.skills[sk.id] = r + 1; st.skillPoints--; if (sk.kind === "active" && r === 0) { const free = st.slots.indexOf(null); if (free >= 0) st.slots[free] = sk.id; } G.world && G.world.recalc(); this.render(); this.ui.refresh(); } }, r ? "Повысить ранг" : "Изучить"),
        why ? h("span.muted", { style: { fontSize: "13px" } }, why) : null));
      right.appendChild(box);
    } else right.appendChild(h("div.box", {}, h("div.hint", {}, "Выберите навык слева.")));
    this.body.append(list, right);
  }

  // ---------- задания ----------
  tab_quests() {
    const st = G.st;
    const col = h("div.col.scroll", { style: { flex: 1 } });
    const act = Object.keys(st.quests.active);
    if (!act.length && !st.bounty) col.appendChild(h("div.hint", {}, "Нет активных заданий. Поговорите со старостой Годриком на площади Серого Брода (жёлтый «!» над головой)."));
    for (const id of act) {
      const q = questById(id); const ok = isComplete(st, q);
      col.appendChild(h("div.qitem", {}, h("b", {}, q.title), ok ? h("span", { style: { color: "#8f8" } }, " — выполнено") : null, h("div", {}, q.text), h("div.muted", {}, progressText(st, q)),
        h("div.muted", { style: { fontSize: "12px" } }, `Награда: ${q.reward.xp} опыта, ${q.reward.gold} зол.${q.reward.gear ? ", снаряжение" : ""}`)));
    }
    if (st.bounty) col.appendChild(h("div.qitem", {}, h("b", {}, "Поручение с доски"), h("div.muted", {}, `Убить: ${st.bounty.got}/${st.bounty.n}`)));
    const done = h("div.col.scroll", { style: { width: "34%" } }, h("div.title-deco", {}, "Выполнено"), st.quests.done.map(id => h("div.muted", {}, "✔ " + questById(id).title)));
    this.body.append(col, done);
  }

  // ---------- карта ----------
  tab_map() {
    const W = G.world;
    const left = h("div.col", { style: { flex: 1, alignItems: "center", justifyContent: "center" } });
    if (W) {
      const c = document.createElement("canvas"); c.width = W.minimap.width; c.height = W.minimap.height;
      const x = c.getContext("2d"); x.drawImage(W.minimap, 0, 0);
      x.fillStyle = "#fff"; x.beginPath(); x.arc(W.player.x * 3 / 64, W.player.y * 3 / 64, 5, 0, 7); x.fill();
      if (W.bossPt && !W.bossPt.alive.dead) { x.fillStyle = "#ff5030"; x.font = "bold 18px serif"; x.fillText("☠", W.bossPt.x * 3 / 64 - 6, W.bossPt.y * 3 / 64 + 6); }
      for (const n of W.npcs) { x.fillStyle = "#f0d060"; x.beginPath(); x.arc(n.x * 3 / 64, n.y * 3 / 64, 4, 0, 7); x.fill(); }
      c.style.maxWidth = "100%"; c.style.maxHeight = "100%"; c.style.border = "1px solid var(--line2)"; c.style.borderRadius = "8px";
      left.appendChild(c);
    }
    const right = h("div.col.scroll", { style: { width: "36%" } }, h("div.title-deco", {}, "Земли"));
    for (const [id, z] of Object.entries(ZONES)) {
      const dz = DANGER[z.danger];
      right.appendChild(h("div.qitem", {}, h("b", {}, z.name), z.lvl ? h("span.muted", {}, ` · ${z.lvl} ур.`) : null, h("div", { style: { color: dz.color, fontSize: "13px" } }, dz.name),
        h("div.muted", { style: { fontSize: "12px" } }, z.danger === "red" ? "Смерть: износ, потеря золота и части сумки" : z.danger === "yellow" ? "Смерть: сильный износ, потеря 10% золота" : z.danger === "blue" ? "Смерть: износ, потеря 5% золота" : "Безопасно")));
    }
    this.body.append(left, right);
  }

  // ---------- меню ----------
  tab_menu() {
    const st = G.st;
    const col = h("div.col", { style: { flex: 1, maxWidth: "460px", margin: "0 auto" } });
    col.appendChild(h("button.btn", { onclick: () => { G.world && G.world.persist(); this.ui.toast("Игра сохранена"); } }, "Сохранить игру"));
    col.appendChild(h("label.row", { style: { padding: "8px" } }, h("input", { type: "checkbox", checked: st.settings.showHelm, onchange: e => { st.settings.showHelm = e.target.checked; G.world && G.world.refreshPlayerLook(); } }), "Показывать шлем"));
    col.appendChild(h("div.hint", {}, `Время в игре: ${Math.floor(st.playtime / 3600)} ч ${Math.floor(st.playtime / 60) % 60} мин · Смертей: ${st.deaths}`));
    col.appendChild(h("div.hint", {}, "Управление на клавиатуре (для проверки на компьютере): WASD — движение, J/пробел — атака, 1–6 — навыки, Q/E — зелья, F — действие."));
    // обновления
    const UPD = { idle: "ещё не проверялось", web: "версия для браузера — обновляется сама при открытии", checking: "проверяю…", latest: "у вас последняя версия", downloading: "скачиваю обновление", ready: "обновление скачано — перезапустите игру", error: "ошибка" };
    const ustat = h("div.hint");
    const draw = () => { ustat.textContent = `Версия ${APP_VERSION}. Обновления: ${UPD[updateState.state] || updateState.state}${updateState.detail ? " (" + updateState.detail + ")" : ""}`; restart.style.display = updateState.state === "ready" ? "" : "none"; };
    const restart = h("button.btn.primary", { onclick: async () => { G.world && G.world.persist(); await applyUpdateNow(); } }, "Перезапустить с обновлением");
    col.appendChild(h("div.box", {}, h("h3", {}, "Обновления"), ustat, h("div.row", { style: { marginTop: "6px" } }, h("button.btn.small", { onclick: () => { checkForUpdates().then(draw); draw(); } }, "Проверить обновления"), restart)));
    onUpdateState(() => ustat.isConnected && draw());
    draw();
    col.appendChild(h("button.btn.danger", { onclick: () => { G.world && G.world.persist(); this.close(); G.game.scene.stop("world"); this.ui.titleScreen(); } }, "Выйти в главное меню"));
    this.body.appendChild(col);
  }
}
const PER_NAMES = { defPct: "Защита, %", hpPct: "Здоровье, %", mpPct: "Мана, %", matkPct: "Маг. атака, %", atkPct: "Физ. атака, %", lowHpDmg: "Урон при низком здоровье, %", executeDmg: "Урон по раненым, %", bleedChance: "Шанс кровотечения, %", poisonChance: "Шанс яда, %", burnChance: "Шанс поджога, %" };
