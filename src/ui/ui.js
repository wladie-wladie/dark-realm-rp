// Интерфейс поверх мира: титульный экран, HUD, управление, всплывающие сообщения.
import { G } from "../core/G.js";
import { h, clear } from "./dom.js";
import { CLASSES, findSkill } from "../data/classes.js";
import { QUALITY, POTIONS, itemTitle } from "../data/items.js";
import { ZONES, DANGER } from "../data/zones.js";
import { xpToNext, listSaves, loadGame, deleteGame, countItem, skillValues, saveGame, newCharacter } from "../systems/state.js";
import { portrait as drawnPortrait } from "../art/humanoid.js";
import { heroArtKey, artPortrait } from "../art/looks.js";
const portraitOf = (st, size) => { const k = heroArtKey(st); return k ? artPortrait(k, size) : drawnPortrait(st.look, size); };
import { skillIcon, itemIconUrl, artIcon } from "../art/icons.js";
import { questById, progressText, isComplete, npcMarker } from "../systems/quests.js";
import { CharacterCreator } from "./create.js";
import { Panels } from "./panels.js";
import { NpcUI } from "./npc.js";
import { APP_VERSION } from "../version.js";

export class UI {
  constructor(root) {
    this.root = root;
    this.panels = new Panels(this);
    this.npc = new NpcUI(this);
    G.ui = this;
  }

  // ---------- титульный экран ----------
  titleScreen() {
    G.paused = true;
    clear(this.root);
    const saves = listSaves();
    const slots = h("div.slots");
    saves.forEach((s, i) => {
      if (s) {
        const pc = portraitOf(s, 84);
        const card = h("div.slot.frame", {},
          pc,
          h("div.nm", {}, s.name),
          h("div.muted", {}, `${CLASSES[s.cls].name}${s.sub ? " · " + CLASSES[s.cls].subclasses[s.sub].name : ""}, ${s.level} ур.`),
          h("div.muted", { style: { fontSize: "13px" } }, ZONES[s.zone]?.name || ""),
          h("div.row", {},
            h("button.btn.primary.grow", { onclick: () => this.startGame(i, s) }, "Играть"),
            h("button.btn.danger.small", { onclick: () => { if (confirm(`Удалить героя «${s.name}» навсегда?`)) { deleteGame(i); this.titleScreen(); } } }, "✕")));
        slots.appendChild(card);
      } else {
        slots.appendChild(h("div.slot.frame", { style: { justifyContent: "center", alignItems: "center" } },
          h("div.muted", {}, "Свободная ячейка"),
          h("button.btn", { onclick: () => this.createScreen(i) }, "Новый герой")));
      }
    });
    this.root.appendChild(h("div.screen.title-screen", {},
      h("div.logo", {}, "Тёмные земли"),
      h("div.logo-sub", {}, "Серый Брод и окрестные земли"),
      slots,
      h("div.version", {}, "версия " + APP_VERSION)));
  }

  createScreen(slot) {
    clear(this.root);
    new CharacterCreator(this, slot).mount(this.root);
  }

  startGame(slot, st) {
    G.slot = slot; G.st = st || loadGame(slot);
    // миграция старых сохранений
    G.st.settings = G.st.settings || { showHelm: true };
    G.st.gather = G.st.gather || {};
    // свиток возвращения заменён бесплатным порталом
    G.st.bag = G.st.bag.filter(i => !(i.cat === "potion" && i.id === "town"));
    G.st.potionSlots = G.st.potionSlots.map(id => (id === "town" ? null : id));
    clear(this.root);
    this.buildHud();
    G.paused = false;
    const sc = G.game.scene;
    if (sc.isActive("world")) sc.getScene("world").scene.restart({ zone: G.st.zone });
    else sc.start("world", { zone: G.st.zone });
  }

  createNew(slot, data) {
    const st = newCharacter(data);
    saveGame(st, slot);
    this.startGame(slot, st);
    setTimeout(() => this.npc.intro(), 900);
  }

  // ---------- HUD ----------
  buildHud() {
    const R = this.root;
    this.el = {};
    const e = this.el;
    e.portrait = h("div.hud-portrait", { onclick: () => this.panels.open("hero") });
    e.lvl = h("div.hud-lvl");
    e.portrait.appendChild(e.lvl);
    e.name = h("div.hud-name");
    e.hp = h("i"); e.hpS = h("i.sh"); e.hpT = h("span"); e.mp = h("i"); e.mpT = h("span"); e.xp = h("i");
    e.buffs = h("div.buffs");
    R.appendChild(h("div.hud-tl", {}, e.portrait, h("div.bars", {}, e.name, h("div.bar.hp.sh", {}, e.hp, e.hpS, e.hpT), h("div.bar.mp", {}, e.mp, e.mpT), h("div.bar.xp", {}, e.xp), e.buffs)));
    e.tracker = h("div.tracker"); R.appendChild(e.tracker);
    e.zone = h("div.zone-name"); e.danger = h("div.danger"); e.boss = h("div.bossbar", { style: { display: "none" } });
    R.appendChild(h("div.hud-top", {}, e.zone, e.danger, e.boss));
    e.mini = h("div.minimap", { onclick: () => this.panels.open("map") }); e.miniC = document.createElement("canvas"); e.mini.appendChild(e.miniC);
    const mb = (icon, tab, title) => { const art = artIcon("ui_" + tab, 88); const b = h("button.mbtn", { title, class: art ? "art" : "", onclick: () => this.panels.open(tab) }, art ? h("img", { src: art, alt: title }) : icon); return b; };
    e.bBag = mb("🎒", "bag", "Сумка"); e.bSkills = mb("✦", "skills", "Навыки"); e.bHero = mb("♜", "hero", "Герой"); e.bQuests = mb("☰", "quests", "Задания"); e.bMenu = mb("⚙", "menu", "Меню");
    e.gold = h("div.gold-line");
    R.appendChild(h("div.hud-tr", {}, e.mini, h("div.menu-btns", {}, e.bBag, e.bSkills, e.bHero, e.bQuests, e.bMenu), e.gold));
    e.toasts = h("div.toasts"); R.appendChild(e.toasts);
    e.gather = h("div.gatherbar", { style: { display: "none" } }); R.appendChild(e.gather);
    this.buildControls();
    this.refresh();
  }

  buildControls() {
    const R = this.root, e = this.el;
    // джойстик
    const joy = h("div.joy"), base = h("div.joy-base", { style: { display: "none" } }), knob = h("div.joy-knob", { style: { display: "none" } });
    R.appendChild(joy); R.appendChild(base); R.appendChild(knob);
    let jid = null, ox = 0, oy = 0;
    const R0 = 52;
    joy.addEventListener("pointerdown", ev => {
      if (jid !== null) return;
      jid = ev.pointerId; ox = ev.clientX; oy = ev.clientY;
      joy.setPointerCapture(jid);
      base.style.display = knob.style.display = "block";
      base.style.left = knob.style.left = ox + "px"; base.style.top = knob.style.top = oy + "px";
    });
    joy.addEventListener("pointermove", ev => {
      if (ev.pointerId !== jid) return;
      let dx = ev.clientX - ox, dy = ev.clientY - oy;
      const l = Math.hypot(dx, dy);
      if (l > R0) { dx = dx / l * R0; dy = dy / l * R0; }
      knob.style.left = ox + dx + "px"; knob.style.top = oy + dy + "px";
      const m = Math.min(1, l / R0);
      if (l > 8) { G.input.mx = dx / Math.hypot(dx, dy) * (m > 0.5 ? 1 : 0.6); G.input.my = dy / Math.hypot(dx, dy) * (m > 0.5 ? 1 : 0.6); }
      else { G.input.mx = 0; G.input.my = 0; }
    });
    const end = ev => { if (ev.pointerId !== jid) return; jid = null; G.input.mx = G.input.my = 0; base.style.display = knob.style.display = "none"; };
    joy.addEventListener("pointerup", end); joy.addEventListener("pointercancel", end);

    // кнопки действий
    const act = h("div.actions");
    const atkArt = artIcon("ui_attack", 160);
    const atk = h("div.abtn.atk", { class: atkArt ? "art" : "" }, atkArt ? h("img", { src: atkArt, alt: "" }) : "⚔");
    atk.addEventListener("pointerdown", ev => { ev.preventDefault(); atk.setPointerCapture(ev.pointerId); G.input.attack = true; });
    const atkEnd = () => { G.input.attack = false; };
    atk.addEventListener("pointerup", atkEnd); atk.addEventListener("pointercancel", atkEnd);
    act.appendChild(atk);
    // 6 навыков дугой вокруг атаки
    const pos = [[104, 4], [92, 70], [52, 120], [0, 132], [176, 6], [160, 76]];
    e.skillBtns = pos.map(([r, b], i) => {
      const btn = h("div.abtn.sk", { style: { right: r + "px", bottom: b + "px" } });
      btn.addEventListener("pointerdown", ev => { ev.preventDefault(); if (!G.st.slots[i]) { this.panels.open("skills"); return; } G.world && G.world.useSlot(i); });
      act.appendChild(btn); return btn;
    });
    e.potBtns = [0, 1].map(i => {
      const btn = h("div.abtn.pot", { style: { right: (240 - i * 0) + "px", bottom: (i ? 64 : 10) + "px" } });
      btn.addEventListener("pointerdown", ev => { ev.preventDefault(); G.world && G.world.usePotion(i); });
      act.appendChild(btn); return btn;
    });
    // портал в город
    e.portal = h("div.abtn.pot.portal", { style: { right: "240px", bottom: "118px" }, title: "Портал в город" }, "◎");
    e.portal.addEventListener("pointerdown", ev => { ev.preventDefault(); G.world && G.world.openPortal(); });
    act.appendChild(e.portal);
    e.ctx = h("button.ctx", { style: { display: "none" } });
    e.ctx.addEventListener("pointerdown", ev => { ev.preventDefault(); this.contextAction(); });
    R.appendChild(e.ctx);
    R.appendChild(act);
  }

  enterZone(W) {
    if (!this.el) return;
    const z = W.z, dz = DANGER[z.danger];
    this.el.zone.textContent = z.name + (z.lvl ? ` · ${z.lvl} ур.` : "");
    this.el.danger.textContent = dz.name;
    this.el.danger.style.color = dz.color; this.el.danger.style.border = "1px solid " + dz.color;
    const mc = this.el.miniC; mc.width = W.minimap.width; mc.height = W.minimap.height;
    this.bossBar(null);
    this.el.portal.style.display = W.zoneId === "town" ? "none" : "flex";
    this.toast(z.name, dz.color, 2200);
    if (z.danger === "red") this.toast("Красная зона: при смерти теряется часть сумки!", "#ff6050", 4000);
    this.refresh();
  }

  // ---------- обновление ----------
  hudTick(W) {
    const e = this.el; if (!e) return;
    const st = G.st, p = W.player, ps = W.pstats;
    e.hp.style.width = (p.hp / p.maxHp * 100) + "%";
    e.hpS.style.width = Math.min(100, W.shield / p.maxHp * 100) + "%";
    e.hpT.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    e.mp.style.width = (W.mp / ps.mp * 100) + "%";
    e.mpT.textContent = `${Math.floor(W.mp)} / ${ps.mp}`;
    e.xp.style.width = (st.xp / xpToNext(st.level) * 100) + "%";
    // кнопки навыков
    st.slots.forEach((id, i) => {
      const b = e.skillBtns[i];
      const cd = id ? (W.cds[id] || 0) : 0;
      const s = id ? findSkill(id) : null;
      const key = id || "";
      if (b.dataset.k !== key) {
        clear(b); b.dataset.k = key;
        if (s) { b.appendChild(h("img", { src: skillIcon(s.icon, 64) })); b.appendChild(h("div.cd")); b.appendChild(h("div.mp")); b.classList.remove("empty"); }
        else { b.classList.add("empty"); b.appendChild(h("span", { style: { color: "#6a5a40", fontSize: "22px" } }, "+")); }
      }
      if (s) {
        const v = skillValues(st, s);
        const total = v.cd * (1 - ps.cdr / 100) || 1;
        const cdEl = b.querySelector(".cd");
        cdEl.style.setProperty("--p", cd > 0 ? (cd / total * 100) + "%" : "0%");
        cdEl.textContent = cd > 0 ? Math.ceil(cd) : "";
        b.querySelector(".mp").textContent = v.mp || "";
        b.classList.toggle("nomana", W.mp < v.mp);
      }
    });
    st.potionSlots.forEach((id, i) => {
      const b = e.potBtns[i]; const n = id ? countItem(st, id) : 0;
      const key = (id || "") + n;
      if (b.dataset.k !== key) {
        clear(b); b.dataset.k = key;
        if (id) { b.appendChild(h("img", { src: skillIcon(POTIONS[id].icon, 48), style: { width: "100%", height: "100%" } })); b.appendChild(h("b", {}, n)); }
        b.style.opacity = n ? 1 : 0.4;
      }
    });
    // контекстное действие
    let ctx = null;
    if (!p.dead) {
      const npc = W.nearestNpc();
      if (npc) ctx = { label: "Говорить: " + npc.npc.name.split(" ")[0], act: () => this.npc.open(npc.npc) };
      else {
        const n = W.nearestNode();
        if (n) ctx = { label: { wood: "🪓 Рубить", ore: "⛏ Добыть", herb: "✿ Сорвать", fiber: "✂ Собрать" }[n.kind] || "Собрать", act: () => W.startGather(n) };
      }
    }
    this.ctxAct = ctx;
    if (ctx) { e.ctx.style.display = "block"; if (e.ctx.textContent !== ctx.label) e.ctx.textContent = ctx.label; } else e.ctx.style.display = "none";
    if (W.gathering) e.ctx.style.display = "none";
    // мини-карта
    const mc = e.miniC, cx = mc.getContext("2d");
    cx.drawImage(W.minimap, 0, 0);
    const s = 3 / 64;
    cx.fillStyle = "#e04030";
    for (const m of W.monsters) if (!m.dead) { cx.fillRect(m.x * s - 1.5, m.y * s - 1.5, m.def.boss ? 5 : 3, m.def.boss ? 5 : 3); }
    cx.fillStyle = "#f0d060";
    for (const n of W.npcs) { cx.beginPath(); cx.arc(n.x * s, n.y * s, 2.5, 0, 7); cx.fill(); }
    cx.fillStyle = "#ffffff"; cx.strokeStyle = "#000"; cx.beginPath(); cx.arc(p.x * s, p.y * s, 3.5, 0, 7); cx.fill(); cx.stroke();
    const vw = 150, vh = 108;
    mc.style.left = Math.min(0, Math.max(vw - mc.width, vw / 2 - p.x * s)) + "px";
    mc.style.top = Math.min(0, Math.max(vh - mc.height, vh / 2 - p.y * s)) + "px";
    // метки над жителями
    for (const n of W.npcs) { const mk = npcMarker(st, n.npc.id); if (n.mark.text !== mk) n.mark.setText(mk); n.mark.setPosition(n.x, n.y - 62 * n.scale - 36 + Math.sin(W.clock * 4) * 3); n.label.setPosition(n.x, n.y - 62 * n.scale - 14); }
    // эффекты
    const bkey = W.buffs.map(b => b.id).join(",");
    if (e.buffs.dataset.k !== bkey) { clear(e.buffs); e.buffs.dataset.k = bkey; for (const b of W.buffs) e.buffs.appendChild(h("img", { src: skillIcon(b.icon, 32), title: b.name })); }
    if (this.bossM) this.bossTick();
    this.slowT = (this.slowT || 0) + 1;
    if (this.slowT % 5 === 0) this.refresh();
  }

  refresh() {
    const e = this.el; if (!e || !G.st) return;
    const st = G.st;
    e.lvl.textContent = st.level;
    e.name.innerHTML = "";
    e.name.appendChild(h("span", {}, st.name));
    e.name.appendChild(h("span.muted", { style: { fontSize: "12px" } }, (st.sub ? CLASSES[st.cls].subclasses[st.sub].name : CLASSES[st.cls].name)));
    if (!e.portraitC || e.portraitKey !== JSON.stringify(st.look)) { clear(e.portrait); e.portraitC = portraitOf(st, 64); e.portrait.appendChild(e.portraitC); e.portrait.appendChild(e.lvl); e.portraitKey = JSON.stringify(st.look); }
    e.gold.textContent = `◉ ${st.gold} зол.`;
    // точки-уведомления
    const dot = (b, on) => { const d = b.querySelector(".dot"); if (on && !d) b.appendChild(h("i.dot")); if (!on && d) d.remove(); };
    dot(e.bSkills, st.skillPoints > 0); dot(e.bHero, st.statPoints > 0);
    dot(e.bQuests, Object.keys(st.quests.active).some(id => isComplete(st, questById(id))));
    // трекер заданий
    clear(e.tracker);
    for (const id of Object.keys(st.quests.active).slice(0, 3)) {
      const q = questById(id); if (!q) continue;
      const ok = isComplete(st, q);
      e.tracker.appendChild(h("div", {}, h("b", {}, q.title), h("br"), h("span", { class: ok ? "ok" : "" }, ok ? "✔ Вернитесь к " + (q.giver === "elder" ? "старосте" : "наставнику") : progressText(st, q))));
    }
    if (st.bounty) e.tracker.appendChild(h("div", {}, h("b", {}, "Поручение"), h("br"), h("span", { class: st.bounty.got >= st.bounty.n ? "ok" : "" }, `${st.bounty.got}/${st.bounty.n} — ${(MONSTER_NAME(st.bounty.mob))}`)));
  }

  toast(text, color = "#e6dcc6", ms = 2200) {
    if (!this.el) return;
    const t = h("div.toast", { style: { color, borderColor: color + "66" } }, text);
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => { t.style.transition = "opacity .4s"; t.style.opacity = 0; setTimeout(() => t.remove(), 400); }, ms);
  }

  bossBar(m) {
    if (!this.el) return;
    if (m === this.bossM) return;
    this.bossM = m;
    const b = this.el.boss;
    if (!m) { b.style.display = "none"; return; }
    clear(b); b.style.display = "block";
    this.bossFill = h("i", { style: { background: "linear-gradient(#e0503c,#6a0a04)" } }); this.bossText = h("span");
    b.appendChild(h("div.bn", {}, m.def.name)); b.appendChild(h("div.bar", {}, this.bossFill, this.bossText));
  }
  bossTick() {
    const m = this.bossM;
    if (m.dead) { this.bossBar(null); return; }
    this.bossFill.style.width = (m.hp / m.maxHp * 100) + "%";
    this.bossText.textContent = `${Math.ceil(m.hp)} / ${m.maxHp}`;
    if (m.state !== "chase") this.bossBar(null);
  }

  gatherProgress(p, verb) {
    const g = this.el?.gather; if (!g) return;
    if (p == null) { g.style.display = "none"; return; }
    g.style.display = "block";
    if (!g.firstChild) { g.appendChild(h("div")); g.appendChild(h("div.bar", {}, h("i"))); }
    g.firstChild.textContent = verb + "…";
    g.querySelector("i").style.width = Math.min(100, p * 100) + "%";
  }

  contextAction() { if (this.ctxAct) this.ctxAct.act(); }

  itemName(it) { return itemTitle(it); }
  itemColor(it) { return it.cat === "gear" ? QUALITY[it.quality].color : "#e0d0a0"; }
  itemIcon(it) { return it.cat === "gear" ? itemIconUrl(it) : skillIcon(it.cat === "res" ? RES_ICON(it.id) : POTIONS[it.id].icon); }

  death(info) {
    G.paused = false;
    const dz = info.danger;
    const lost = info.lost.length ? h("p", {}, "Потеряно из сумки: ", info.lost.map(i => this.itemName(i) + (i.n > 1 ? " ×" + i.n : "")).join(", ")) : null;
    const m = h("div.modal-bg", {}, h("div.frame.death", {},
      h("h1", {}, "Вы пали"),
      h("p.muted", {}, `${info.zone} — ${dz.name}`),
      info.gold ? h("p", {}, `Потеряно золота: ${info.gold}`) : null,
      info.dur ? h("p", {}, `Снаряжение изношено на ${info.dur}%`) : h("p.muted", {}, "В безопасной зоне вы ничего не теряете."),
      lost,
      h("button.btn.primary", { onclick: () => { m.remove(); G.world.respawn(); } }, "Очнуться в Сером Броде")));
    setTimeout(() => this.root.appendChild(m), 900);
  }

  modal(content, onClose) {
    G.paused = true;
    G.input.mx = G.input.my = 0; G.input.attack = false;
    const bg = h("div.modal-bg");
    bg.appendChild(content);
    bg.addEventListener("pointerdown", ev => { if (ev.target === bg) close(); });
    const close = () => { bg.remove(); G.paused = !!this.root.querySelector(".modal-bg"); onClose && onClose(); this.refresh(); };
    this.root.appendChild(bg);
    return close;
  }
}

import { MONSTERS } from "../data/monsters.js";
import { RESOURCES } from "../data/items.js";
const MONSTER_NAME = id => MONSTERS[id]?.name || id;
const RES_ICON = id => RESOURCES[id].icon;
