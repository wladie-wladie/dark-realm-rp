// Арена: дуэль с ботом, бой ботов и турнир всех классов — с таблицей побед для проверки баланса.
import { G } from "../core/G.js";
import { CLASSES, CLASS_ORDER } from "../data/classes.js";
import { tw } from "../core/iso.js";
import { h, clear } from "../ui/dom.js";

const KEY = "arenaStats_v1";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) { return {}; } };
const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (_) {} };
const name = (cls, sub) => CLASSES[cls].name + (sub ? " · " + CLASSES[cls].subclasses[sub].name : "");

export class Arena {
  constructor(W) {
    this.W = W; this.mode = null; this.queue = []; this.round = null; this.speed = 1;
    W.bots.onDeath = b => this.onBotDeath(b);
  }
  center() { return tw(8, 8); }

  clearField() { this.W.bots.clear(); this.round = null; }
  setSpeed(k) {
    const W = this.W; this.speed = k; G.speed = k;
    W.physics.world.timeScale = 1 / k; W.tweens.timeScale = k; W.time.timeScale = k;
  }

  // ---------- режимы ----------
  duel(cls, sub, level) {
    const W = this.W; this.clearField(); this.mode = "duel"; W.arenaSpectate = false; this.setSpeed(1);
    const [cx, cy] = this.center();
    W.player.sprite.body.reset(cx - 90, cy + 20); W.player.hp = W.player.maxHp; W.mp = W.pstats.mp;
    G.ui.toast(`Бой: вы против «${name(cls, sub)}» (${level} ур.)`, "#ffd060", 2500);
    this.W.combat.later(1.2, () => { const b = W.bots.spawn(cls, sub, level, cx + 90, cy - 20, "B", Math.random() < 0.5 ? "m" : "f"); this.round = { a: { you: true, cls: G.st.cls, sub: G.st.sub }, b: { cls, sub, bot: b }, level, t0: W.clock }; });
  }
  botFight(A, B, level, rounds) {
    this.mode = "bots"; this.W.arenaSpectate = true;
    this.queue = Array.from({ length: rounds }, () => [A, B, level]);
    this.next();
  }
  tournament(level, perPair) {
    const W = this.W; this.mode = "bots"; W.arenaSpectate = true;
    const pick = cls => { const subs = Object.keys(CLASSES[cls].subclasses); return level >= 10 ? subs.map(s => [cls, s]) : [[cls, null]]; };
    const all = CLASS_ORDER.flatMap(pick);
    this.queue = [];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) for (let k = 0; k < perPair; k++) this.queue.push(k % 2 ? [all[j], all[i], level] : [all[i], all[j], level]);
    this.queue.sort(() => Math.random() - 0.5);
    G.ui.toast(`Турнир: ${this.queue.length} боёв`, "#ffd060", 2500);
    this.next();
  }
  next() {
    const W = this.W; this.clearField();
    if (!this.queue.length) { this.mode = null; W.arenaSpectate = false; this.setSpeed(1); G.ui.toast("Бои закончены — итоги у распорядителя", "#ffd060", 3000); return; }
    const [[ca, sa], [cb, sb], level] = this.queue.shift();
    const [cx, cy] = this.center();
    W.player.sprite.body.reset(cx, cy + 45);
    const a = W.bots.spawn(ca, sa, level, cx - 110, cy + 10, "A", "m"), b = W.bots.spawn(cb, sb, level, cx + 110, cy + 10, "B", "f");
    this.round = { a: { cls: ca, sub: sa, bot: a }, b: { cls: cb, sub: sb, bot: b }, level, t0: W.clock };
    G.ui.toast(`${name(ca, sa)}  против  ${name(cb, sb)}   · осталось ${this.queue.length}`, "#e0d0b0", 2200);
  }
  stop() { this.queue = []; this.mode = null; this.W.arenaSpectate = false; this.setSpeed(1); this.clearField(); }

  // ---------- итоги ----------
  record(win, lose, level, secs, hpLeft) {
    const d = load(), k = `L${level}`; d[k] = d[k] || {};
    const add = (id, w) => { const e = d[k][id] = d[k][id] || { w: 0, l: 0, t: 0, hp: 0 }; e[w ? "w" : "l"]++; e.t += secs; if (w) e.hp += hpLeft; };
    add(win, true); add(lose, false);
    const pk = `${win}>${lose}`; d[k]._pairs = d[k]._pairs || {}; d[k]._pairs[pk] = (d[k]._pairs[pk] || 0) + 1;
    save(d);
  }
  onBotDeath(b) {
    const r = this.round, W = this.W;
    if (!r || b.minionOf) return;
    const secs = Math.round(W.clock - r.t0);
    if (this.mode === "duel" && b === r.b.bot) {
      this.record("Вы: " + name(r.a.cls, r.a.sub), name(r.b.cls, r.b.sub), r.level, secs, W.player.hp / W.player.maxHp);
      G.ui.toast(`Победа за ${secs} с!`, "#80ff90", 3000); this.round = null; this.mode = null;
      W.combat.later(2, () => this.clearField());
      return;
    }
    if (this.mode === "bots") {
      const win = b === r.a.bot ? r.b : r.a, lose = b === r.a.bot ? r.a : r.b;
      this.record(name(win.cls, win.sub), name(lose.cls, lose.sub), r.level, secs, win.bot.hp / win.bot.maxHp);
      this.round = null;
      W.combat.later(1.4, () => this.next());
    }
  }
  onPlayerDeath() {
    const r = this.round, W = this.W;
    if (r && this.mode === "duel") { this.record(name(r.b.cls, r.b.sub), "Вы: " + name(r.a.cls, r.a.sub), r.level, Math.round(W.clock - r.t0), r.b.bot.hp / r.b.bot.maxHp); }
    G.ui.toast("Поражение. На арене ничего не теряется.", "#ff9070", 3000);
    this.mode = null; this.round = null;
    W.combat.later(2, () => { const p = W.player; this.clearField(); p.dead = false; p.sprite.setAlpha(1).setAngle(0); p.hp = p.maxHp; W.mp = W.pstats.mp; G.ui.refresh(); });
  }

  // ---------- окно распорядителя ----------
  menu() {
    const st = G.st;
    let lvl = st.level, clsA = CLASS_ORDER[0], subA = null, clsB = CLASS_ORDER[1], subB = null, rounds = 5;
    const body = h("div.col.scroll", { style: { maxHeight: "72vh", gap: "8px" } });
    const box = h("div.frame.dlg", { style: { maxWidth: "720px" } }, h("div", { style: { flex: 1, minWidth: 0 } }, h("div.nm", {}, "Распорядитель арены"), body));
    const close = G.ui.modal(box);
    const seg = (opts, cur, fn) => h("div.seg", { style: { flexWrap: "wrap" } }, opts.map(([v, t]) => h("button", { class: v === cur ? "on" : "", onclick: () => fn(v) }, t)));
    const subs = cls => [[null, "без подкласса"], ...Object.entries(CLASSES[cls].subclasses).map(([k, v]) => [k, v.name])];
    const render = () => {
      clear(body);
      body.appendChild(h("p.muted", {}, "Здесь можно сразиться с героем любого класса или посмотреть, как боты дерутся между собой. На арене ничего не теряется."));
      body.appendChild(h("div.row", {}, h("span", {}, "Уровень ботов:"), h("button.btn.small", { onclick: () => { lvl = Math.max(1, lvl - 1); render(); } }, "−"), h("b", {}, String(lvl)), h("button.btn.small", { onclick: () => { lvl = Math.min(30, lvl + 1); render(); } }, "+")));
      body.appendChild(h("h3", {}, "Противник (или первый боец)"));
      body.appendChild(seg(CLASS_ORDER.map(c => [c, CLASSES[c].name]), clsA, v => { clsA = v; subA = null; render(); }));
      if (lvl >= 10) body.appendChild(seg(subs(clsA), subA, v => { subA = v; render(); }));
      body.appendChild(h("div.row", {}, h("button.btn.primary", { onclick: () => { close(); G.world.arena.duel(clsA, lvl >= 10 ? subA : null, lvl); } }, "Дуэль: я против него")));
      body.appendChild(h("h3", {}, "Второй боец (для боя ботов)"));
      body.appendChild(seg(CLASS_ORDER.map(c => [c, CLASSES[c].name]), clsB, v => { clsB = v; subB = null; render(); }));
      if (lvl >= 10) body.appendChild(seg(subs(clsB), subB, v => { subB = v; render(); }));
      body.appendChild(h("div.row", {}, h("span", {}, "Боёв:"), seg([[1, "1"], [5, "5"], [10, "10"], [20, "20"]], rounds, v => { rounds = v; render(); })));
      body.appendChild(h("div.row", { style: { flexWrap: "wrap" } },
        h("button.btn", { onclick: () => { close(); G.world.arena.botFight([clsA, lvl >= 10 ? subA : null], [clsB, lvl >= 10 ? subB : null], lvl, rounds); } }, "Бой ботов"),
        h("button.btn", { onclick: () => { close(); G.world.arena.tournament(lvl, 2); } }, "Турнир всех классов"),
        G.world.arena.mode ? h("button.btn.danger", { onclick: () => { G.world.arena.stop(); close(); } }, "Остановить") : null));
      body.appendChild(h("div.row", {}, h("span", {}, "Скорость боя ботов:"), seg([[1, "×1"], [2, "×2"], [4, "×4"]], G.world.arena.speed, v => { G.world.arena.setSpeed(v); render(); })));
      // таблица
      const d = load()[`L${lvl}`] || {};
      const rows = Object.entries(d).filter(([k]) => k !== "_pairs").map(([k, e]) => ({ k, ...e, n: e.w + e.l })).sort((a, b) => b.w / Math.max(1, b.n) - a.w / Math.max(1, a.n));
      body.appendChild(h("h3", {}, `Итоги боёв на ${lvl} уровне`));
      if (!rows.length) body.appendChild(h("p.muted", {}, "Пока боёв не было."));
      else {
        const tb = h("table.arena-table", {}, h("tr", {}, h("th", {}, "Класс"), h("th", {}, "Побед"), h("th", {}, "Боёв"), h("th", {}, "% побед"), h("th", {}, "Ср. бой, с"), h("th", {}, "Ср. HP победителя")));
        for (const r of rows) tb.appendChild(h("tr", {}, h("td", {}, r.k), h("td", {}, String(r.w)), h("td", {}, String(r.n)), h("td", {}, Math.round(r.w / Math.max(1, r.n) * 100) + "%"), h("td", {}, String(Math.round(r.t / Math.max(1, r.n)))), h("td", {}, r.w ? Math.round(r.hp / r.w * 100) + "%" : "—")));
        body.appendChild(tb);
        body.appendChild(h("button.btn.small", { onclick: () => { const all = load(); delete all[`L${lvl}`]; save(all); render(); } }, "Сбросить итоги этого уровня"));
      }
      body.appendChild(h("button.btn", { onclick: close }, "Закрыть"));
    };
    render();
  }
}
