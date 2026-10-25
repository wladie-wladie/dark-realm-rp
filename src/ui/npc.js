// Разговоры с жителями Серого Брода: задания, кузня, лавка, травница, наставник.
import { G } from "../core/G.js";
import { h, clear } from "./dom.js";
import { CLASSES } from "../data/classes.js";
import { POTIONS, RESOURCES, ARMOR_TYPES, WEAPON_TYPES, QUALITY, TIER_NAMES, gearRecipe, POTION_RECIPES, makeGear, itemValue } from "../data/items.js";
import { MONSTERS } from "../data/monsters.js";
import { portrait } from "../art/humanoid.js";
import { artPortrait } from "../art/looks.js";
import { skillIcon } from "../art/icons.js";
import { countItem, removeItem, addItem, gatherLevel, BAG_SIZE } from "../systems/state.js";
import { availableQuests, accept, isComplete, turnIn, questById, newBounty, progressText } from "../systems/quests.js";

export class NpcUI {
  constructor(ui) { this.ui = ui; }

  frame(npc, build) {
    const say = h("div.say");
    const box = h("div.frame.dlg", {}, h("div.who", {}, G.art && G.art["npc_" + npc.id] && G.game.textures.exists("npc_" + npc.id) ? artPortrait("npc_" + npc.id, 120) : portrait(npc.look, 120)), say);
    const close = this.ui.modal(box);
    const api = {
      close,
      render: () => { clear(say); say.appendChild(h("div.nm", {}, npc.name)); build(say, api); },
    };
    api.render();
    return api;
  }

  open(npc) {
    const role = npc.role;
    if (role === "quests") return this.elder(npc);
    if (role === "smith") return this.smith(npc);
    if (role === "shop") return this.shop(npc);
    if (role === "alchemy") return this.alchemy(npc);
    if (role === "mentor") return this.mentor(npc);
    if (role === "arena") return G.world.arena.menu();
    if (role === "arena_gate") return this.frame(npc, (say, api) => {
      say.appendChild(h("p", {}, "Арена за воротами! Сразитесь с героем любого класса или посмотрите, как дерутся другие. Там ничего не теряется."));
      say.appendChild(h("div.row", {}, h("button.btn.primary", { onclick: () => { api.close(); G.world.travel("arena", [6, 12]); } }, "На арену"), h("button.btn", { onclick: api.close }, "Позже")));
    });
    this.frame(npc, (say, api) => {
      say.appendChild(h("p", {}, npc.lines[Math.floor(Math.random() * npc.lines.length)]));
      say.appendChild(h("button.btn", { onclick: api.close }, "Прощай"));
    });
  }

  intro() {
    const n = G.world?.npcs.find(x => x.npc.id === "elder");
    if (!n) return;
    this.frame(n.npc, (say, api) => {
      say.appendChild(h("p", {}, `Ещё один путник... Добро пожаловать в Серый Брод, ${G.st.name}. Времена у нас тёмные: из леса лезут волки, на болотах шепчутся мертвецы, а на тракте режут купцов.`));
      say.appendChild(h("p.muted", {}, "Левая половина экрана — движение. ⚔ — атака, круглые кнопки — навыки, малые — зелья. Подойдите к жителю или ресурсу — появится кнопка действия."));
      say.appendChild(h("button.btn.primary", { onclick: () => { api.close(); this.elder(n.npc); } }, "Чем я могу помочь?"));
    });
  }

  // ---------- староста: задания и поручения ----------
  elder(npc) {
    const st = G.st;
    this.frame(npc, (say, api) => {
      const opts = h("div.opts.scroll", { style: { maxHeight: "60vh" } });
      let spoke = false;
      for (const id of Object.keys(st.quests.active)) {
        const q = questById(id);
        if (q.giver !== npc.id || !isComplete(st, q)) continue;
        spoke = true;
        say.appendChild(h("p", {}, q.done));
        opts.appendChild(h("button.btn.primary", { onclick: () => {
          const r = turnIn(st, q);
          G.world.giveXp(r.xp);
          this.ui.toast(`Задание «${q.title}» выполнено: +${r.xp} опыта, +${r.gold} зол.`, "#ffd060", 3500);
          for (const it of r.items) this.ui.toast("Награда: " + this.ui.itemName(it), this.ui.itemColor(it), 3000);
          api.render(); this.ui.refresh();
        } }, `Сдать: ${q.title}`));
        break;
      }
      const av = availableQuests(st, npc.id);
      if (!spoke && av.length) {
        const q = av[0];
        if (st.level < q.lvl) say.appendChild(h("p", {}, `Есть для тебя дело, но ты пока слабоват. Возвращайся на ${q.lvl}-м уровне.`));
        else {
          spoke = true;
          say.appendChild(h("p", {}, q.text));
          say.appendChild(h("p.muted", {}, `Награда: ${q.reward.xp} опыта, ${q.reward.gold} зол.${q.reward.gear ? ", снаряжение" : ""}${q.reward.items ? ", зелья" : ""}`));
          opts.appendChild(h("button.btn.primary", { onclick: () => { accept(st, q); this.ui.toast(`Новое задание: ${q.title}`, "#ffe090"); api.render(); this.ui.refresh(); } }, `Взяться: ${q.title}`));
        }
      }
      if (!spoke) {
        const act = Object.keys(st.quests.active).map(questById).filter(q => q.giver === npc.id);
        say.appendChild(h("p", {}, act.length ? `Как продвигается дело? ${act.map(q => q.title + ": " + progressText(st, q)).join("; ")}` : "Пока всё тихо. Загляни на доску поручений — работа найдётся."));
      }
      // доска поручений
      if (st.bounty) {
        const b = st.bounty, ok = b.got >= b.n;
        opts.appendChild(h("button.btn", { onclick: () => {
          if (!ok) return;
          st.gold += b.gold; G.world.giveXp(b.xp); st.bounty = null;
          this.ui.toast(`Поручение выполнено: +${b.xp} опыта, +${b.gold} зол.`, "#ffd060"); api.render(); this.ui.refresh();
        } }, ok ? `Сдать поручение (+${b.xp} оп., +${b.gold} зол.)` : `Поручение: ${MONSTERS[b.mob].name} ${b.got}/${b.n}`));
      } else {
        const nb = this.pendingBounty || (this.pendingBounty = newBounty(st));
        opts.appendChild(h("button.btn", { onclick: () => { st.bounty = nb; this.pendingBounty = null; this.ui.toast("Поручение взято", "#ffe090"); api.render(); this.ui.refresh(); } },
          `Доска поручений: убить ${nb.n} × «${MONSTERS[nb.mob].name}» (+${nb.xp} оп., +${nb.gold} зол.)`));
      }
      opts.appendChild(h("button.btn", { onclick: api.close }, "До встречи"));
      say.appendChild(opts);
    });
  }

  // ---------- кузнец: ковка и починка ----------
  smith(npc) {
    const st = G.st;
    let tab = "craft", tier = 1, kind = "weapon";
    this.frame(npc, (say, api) => {
      say.appendChild(h("div.tabs", {}, [["craft", "Ковка"], ["repair", "Починка"]].map(([id, n]) => h("button.tab", { class: tab === id ? "on" : "", onclick: () => { tab = id; api.render(); } }, n))));
      if (tab === "repair") {
        const items = Object.values(st.equip).filter(Boolean).concat(st.bag.filter(i => i.cat === "gear"));
        const cost = items.reduce((s, i) => s + Math.ceil((100 - i.dur) * i.tier * 0.5), 0);
        say.appendChild(h("p", {}, cost ? `Подлатаю всё, что на тебе и в сумке, за ${cost} зол.` : "Всё твоё снаряжение в порядке."));
        say.appendChild(h("button.btn.primary", { disabled: !cost || st.gold < cost, onclick: () => { st.gold -= cost; for (const i of items) i.dur = 100; G.world.recalc(); this.ui.toast("Снаряжение починено", "#c0e0a0"); api.render(); this.ui.refresh(); } }, `Починить всё (${cost} зол.)`));
        say.appendChild(h("button.btn", { onclick: api.close }, "Уйти"));
        return;
      }
      say.appendChild(h("p.muted", { style: { fontSize: "13px" } }, `Кузнечное дело: ${gatherLevel(st, "craft")} — чем выше, тем чаще выходят вещи высокого качества. Любой класс может носить любую броню.`));
      say.appendChild(h("div.seg", {}, [1, 2, 3].map(t => h("button", { class: t === tier ? "on" : "", onclick: () => { tier = t; api.render(); } }, TIER_NAMES[t] + " " + ["", "I", "II", "III"][t]))));
      say.appendChild(h("div.seg", {}, [["weapon", "Оружие"], ["plate", "Латы"], ["leather", "Кожа"], ["cloth", "Ткань"], ["jewel", "Украшения"]].map(([k, n]) => h("button", { class: k === kind ? "on" : "", onclick: () => { kind = k; api.render(); } }, n))));
      const list = h("div.scroll", { style: { maxHeight: "44vh" } });
      const variants = kind === "weapon" ? [["weapon", null]] : kind === "jewel" ? [["ring", null], ["amulet", null]] : [["head", kind], ["chest", kind], ["boots", kind]];
      for (const [slot, type] of variants) {
        const sample = makeGear({ slot, type, tier, quality: 0, cls: st.cls });
        const rec = gearRecipe(slot, type || (slot === "weapon" ? st.cls : null), tier);
        const fee = tier * tier * 15;
        const can = Object.entries(rec).every(([id, n]) => countItem(st, id) >= n) && st.gold >= fee && st.bag.length < BAG_SIZE;
        list.appendChild(h("div.recipe", {}, h("img", { src: this.ui.itemIcon(sample) }),
          h("div.grow", {}, h("div", {}, this.ui.itemName(sample)), h("div.need", {}, Object.entries(rec).map(([id, n]) => h("span", { class: countItem(st, id) >= n ? "ok" : "no" }, `${RESOURCES[id].name} ${countItem(st, id)}/${n}  `)), h("span", { class: st.gold >= fee ? "ok" : "no" }, `${fee} зол.`))),
          h("button.btn.small.primary", { disabled: !can, onclick: () => {
            for (const [id, n] of Object.entries(rec)) removeItem(st, id, n);
            st.gold -= fee;
            const q = rollQuality(gatherLevel(st, "craft"));
            const it = makeGear({ slot, type, tier, quality: q, cls: st.cls });
            addItem(st, it);
            st.gather.craft = (st.gather.craft || 0) + tier * 4;
            this.ui.toast(`Выковано: ${this.ui.itemName(it)} (${QUALITY[q].name})`, QUALITY[q].color, 3000);
            api.render(); this.ui.refresh();
          } }, "Создать")));
      }
      say.appendChild(list);
      say.appendChild(h("button.btn", { onclick: api.close }, "Уйти"));
    });
  }

  // ---------- торговка ----------
  shop(npc) {
    const st = G.st;
    let tab = "buy";
    this.frame(npc, (say, api) => {
      say.appendChild(h("div.tabs", {}, [["buy", "Купить"], ["sell", "Продать"]].map(([id, n]) => h("button.tab", { class: tab === id ? "on" : "", onclick: () => { tab = id; api.render(); } }, n))));
      say.appendChild(h("div.gold-line", {}, `◉ ${st.gold} зол.`));
      const list = h("div.scroll", { style: { maxHeight: "50vh" } });
      if (tab === "buy") {
        const goods = [...["hp1", "mp1"].map(id => ({ cat: "potion", id, n: 1 })), ...(st.level >= 6 ? ["hp2", "mp2"].map(id => ({ cat: "potion", id, n: 1 })) : [])];
        const cls = CLASSES[st.cls];
        goods.push(makeGear({ slot: "weapon", tier: 1, quality: 1, cls: st.cls }));
        for (const s of ["head", "chest", "boots"]) goods.push(makeGear({ slot: s, type: cls.armor, tier: 1, quality: 1, cls: st.cls }));
        if (st.level >= 8) { goods.push(makeGear({ slot: "weapon", tier: 2, quality: 0, cls: st.cls })); goods.push(makeGear({ slot: "ring", tier: 2, quality: 0, cls: st.cls })); goods.push(makeGear({ slot: "amulet", tier: 2, quality: 0, cls: st.cls })); }
        for (const g of goods) {
          const price = Math.round(itemValue(g) * (g.cat === "gear" ? 1.6 : 1));
          list.appendChild(h("div.recipe", {}, h("img", { src: this.ui.itemIcon(g) }), h("div.grow", {}, h("div", { style: { color: this.ui.itemColor(g) } }, this.ui.itemName(g)), h("div.need", {}, g.cat === "potion" ? POTIONS[g.id].desc : `Сила ${g.ip}`)),
            h("button.btn.small.primary", { disabled: st.gold < price, onclick: () => {
              const it = g.cat === "gear" ? makeGear({ slot: g.slot, type: g.type, tier: g.tier, quality: g.quality, cls: st.cls }) : { ...g };
              if (!addItem(st, it)) { this.ui.toast("Сумка полна"); return; }
              st.gold -= price; api.render(); this.ui.refresh();
            } }, `${price} зол.`)));
        }
      } else {
        const sellable = st.bag;
        if (!sellable.length) list.appendChild(h("p.muted", {}, "Тебе нечего мне предложить."));
        for (const it of sellable) {
          const price = Math.max(1, Math.round(itemValue(it) * 0.35));
          list.appendChild(h("div.recipe", {}, h("img", { src: this.ui.itemIcon(it) }), h("div.grow", {}, h("div", { style: { color: this.ui.itemColor(it) } }, this.ui.itemName(it) + (it.n > 1 ? ` ×${it.n}` : ""))),
            h("button.btn.small", { onclick: () => { if (it.n > 1) it.n--; else st.bag.splice(st.bag.indexOf(it), 1); st.gold += price; api.render(); this.ui.refresh(); } }, `+${price}`),
            it.n > 1 ? h("button.btn.small", { onclick: () => { st.gold += price * it.n; st.bag.splice(st.bag.indexOf(it), 1); api.render(); this.ui.refresh(); } }, `Все: +${price * it.n}`) : null));
        }
      }
      say.appendChild(list);
      say.appendChild(h("button.btn", { onclick: api.close }, "Уйти"));
    });
  }

  // ---------- травница ----------
  alchemy(npc) {
    const st = G.st;
    this.frame(npc, (say, api) => {
      say.appendChild(h("p", {}, "Травы лечат, если знать, как их варить. Принеси мне сырьё — сварю, что нужно. Каждая варка учит и тебя."));
      say.appendChild(h("p.muted", { style: { fontSize: "13px" } }, `Алхимия: ${gatherLevel(st, "alchemy")} — шанс сварить два зелья вместо одного.`));
      const list = h("div.scroll", { style: { maxHeight: "48vh" } });
      for (const [id, rec] of Object.entries(POTION_RECIPES)) {
        const p = POTIONS[id];
        const can = Object.entries(rec).every(([r, n]) => countItem(st, r) >= n);
        list.appendChild(h("div.recipe", {}, h("img", { src: skillIcon(p.icon, 48) }), h("div.grow", {}, h("div", {}, p.name), h("div.need", {}, Object.entries(rec).map(([r, n]) => h("span", { class: countItem(st, r) >= n ? "ok" : "no" }, `${RESOURCES[r].name} ${countItem(st, r)}/${n}  `)))),
          h("button.btn.small.primary", { disabled: !can, onclick: () => {
            for (const [r, n] of Object.entries(rec)) removeItem(st, r, n);
            const lv = gatherLevel(st, "alchemy");
            const n = 1 + (Math.random() < 0.1 + lv * 0.03 ? 1 : 0);
            if (!addItem(st, { cat: "potion", id, n })) { this.ui.toast("Сумка полна"); return; }
            st.gather.alchemy = (st.gather.alchemy || 0) + 2;
            this.ui.toast(`Сварено: ${p.name}${n > 1 ? " ×2" : ""}`, "#a0e0a0");
            api.render(); this.ui.refresh();
          } }, "Сварить")));
      }
      say.appendChild(list);
      say.appendChild(h("button.btn", { onclick: api.close }, "Уйти"));
    });
  }

  // ---------- наставник: подкласс и сброс характеристик ----------
  mentor(npc) {
    const st = G.st, cls = CLASSES[st.cls];
    this.frame(npc, (say, api) => {
      if (!st.sub && st.level >= 10) {
        say.appendChild(h("p", {}, "Ты окреп. Пора выбрать путь — он определит, кем ты станешь. Выбор окончателен."));
        const cards = h("div.scroll", { style: { display: "grid", gridTemplateColumns: "1fr", gap: "6px", maxHeight: "52vh" } });
        for (const [id, sc] of Object.entries(cls.subclasses)) {
          cards.appendChild(h("div.sub-card", {}, h("b", {}, sc.name), h("div.muted", { style: { fontSize: "13px" } }, sc.desc),
            h("div.sk", {}, sc.skills.map(s => h("img", { src: skillIcon(s.icon, 48), title: s.name }))),
            h("button.btn.primary.small", { onclick: () => {
              if (!confirm(`Выбрать путь «${sc.name}»? Это навсегда.`)) return;
              st.sub = id; st.skillPoints += 1;
              if (!st.quests.done.includes("q5") && !st.quests.active.q5) st.quests.active.q5 = { n: 0 };
              G.world.refreshPlayerLook();
              this.ui.toast(`Вы стали: ${sc.name}! Новые навыки — во вкладке «Навыки».`, "#ffd060", 4000);
              api.render(); this.ui.refresh();
            } }, "Выбрать этот путь")));
        }
        say.appendChild(cards);
      } else if (!st.sub) {
        say.appendChild(h("p", {}, `Рано тебе выбирать путь. Приходи на 10-м уровне — покажу, кем может стать ${cls.name.toLowerCase()}: ${Object.values(cls.subclasses).map(s => s.name).join(", ")}.`));
      } else {
        const q = questById("q5");
        if (st.quests.active.q5 && isComplete(st, q)) {
          say.appendChild(h("button.btn.primary", { onclick: () => { const r = turnIn(st, q); G.world.giveXp(r.xp); this.ui.toast(`+${r.xp} опыта, +${r.gold} зол.`, "#ffd060"); api.render(); } }, "Сдать: Путь воина"));
        }
        say.appendChild(h("p", {}, `${cls.subclasses[st.sub].name}... Достойный путь. Помни: сила без дисциплины — ничто.`));
      }
      const spent = ["str", "dex", "int", "vit"].reduce((s, k) => s + st.attr[k], 0) - ["str", "dex", "int", "vit"].reduce((s, k) => s + cls.base[k] + cls.grow[k] * (st.level - 1), 0);
      const cost = 50 * st.level;
      if (spent > 0) say.appendChild(h("button.btn", { disabled: st.gold < cost, onclick: () => {
        if (!confirm(`Сбросить распределённые характеристики за ${cost} зол.?`)) return;
        st.gold -= cost; for (const k of ["str", "dex", "int", "vit"]) st.attr[k] = cls.base[k] + cls.grow[k] * (st.level - 1); st.statPoints += spent;
        G.world.recalc(); api.render(); this.ui.refresh();
      } }, `Перераспределить характеристики (${cost} зол.)`));
      say.appendChild(h("button.btn", { onclick: api.close }, "Уйти"));
    });
  }
}

function rollQuality(lvl) {
  const r = Math.random() * 100;
  const b = lvl * 1.5;
  if (r < 1 + b * 0.2) return 4;
  if (r < 4 + b * 0.5) return 3;
  if (r < 14 + b) return 2;
  if (r < 40 + b * 1.2) return 1;
  return 0;
}
