// Состояние персонажа: характеристики, сумка, навыки, задания, сохранение.
import { CLASSES, allSkills, findSkill } from "../data/classes.js";
import { makeGear, AFFIXES, RESOURCES, POTIONS } from "../data/items.js";

export const BAG_SIZE = 48;
export const xpToNext = lvl => Math.round(40 * Math.pow(lvl, 1.55) + 40);
export const MAX_LEVEL = 30;

export function newCharacter({ name, cls, look }) {
  const c = CLASSES[cls];
  const st = {
    v: 1, name, cls, sub: null, level: 1, xp: 0, look,
    attr: { ...c.base }, statPoints: 0, skillPoints: 1,
    skills: {}, mastery: {}, slots: [null, null, null, null, null, null], potionSlots: ["hp1", "mp1"],
    gold: 40, bag: [], equip: { weapon: null, head: null, chest: null, boots: null, ring: null, amulet: null },
    quests: { active: {}, done: [] }, bounty: null, kills: {},
    gather: { wood: 0, ore: 0, herb: 0, fiber: 0, hide: 0, craft: 0, alchemy: 0 },
    zone: "town", pos: null, hp: null, mp: null, created: Date.now(), playtime: 0, deaths: 0,
    settings: { showHelm: true, autoAim: true },
  };
  const wpn = makeGear({ slot: "weapon", tier: 1, quality: 0, cls }); st.equip.weapon = wpn;
  st.equip.chest = makeGear({ slot: "chest", type: c.armor, tier: 1, quality: 0, cls });
  st.equip.boots = makeGear({ slot: "boots", type: c.armor, tier: 1, quality: 0, cls });
  addItem(st, { cat: "potion", id: "hp1", n: 5 });
  addItem(st, { cat: "potion", id: "mp1", n: 3 });
  // первый навык класса сразу изучен и стоит на панели
  const first = c.skills[0];
  st.skills[first.id] = 1; st.skillPoints = 0; st.slots[0] = first.id;
  return st;
}

// ---------- сумка ----------
export function addItem(st, it) {
  if (it.cat === "res" || it.cat === "potion") {
    const ex = st.bag.find(b => b.cat === it.cat && b.id === it.id);
    if (ex) { ex.n += it.n || 1; return true; }
    if (st.bag.length >= BAG_SIZE) return false;
    st.bag.push({ cat: it.cat, id: it.id, n: it.n || 1 }); return true;
  }
  if (st.bag.length >= BAG_SIZE) return false;
  st.bag.push(it); return true;
}
export function countItem(st, id) { const e = st.bag.find(b => b.id === id); return e ? e.n : 0; }
export function removeItem(st, id, n) {
  const e = st.bag.find(b => b.id === id); if (!e || e.n < n) return false;
  e.n -= n; if (e.n <= 0) st.bag.splice(st.bag.indexOf(e), 1); return true;
}

// ---------- характеристики ----------
const MAIN = { warrior: ["str"], ranger: ["dex"], rogue: ["dex"], mage: ["int"], cleric: ["str", "int"], warlock: ["int"] };

export function passiveTotals(st) {
  const t = {};
  for (const s of allSkills(st.cls, st.sub)) {
    if (s.kind !== "passive") continue;
    const r = st.skills[s.id] || 0; if (!r) continue;
    for (const [k, v] of Object.entries(s.per)) t[k] = (t[k] || 0) + v * r;
  }
  return t;
}

export function derive(st, buffs = []) {
  const gear = {};
  let durBroken = 0;
  for (const it of Object.values(st.equip)) {
    if (!it) continue;
    if (it.dur <= 0) { durBroken++; continue; }
    for (const [k, v] of Object.entries(it.stats)) gear[k] = (gear[k] || 0) + v;
  }
  const a = { str: st.attr.str + (gear.str || 0), dex: st.attr.dex + (gear.dex || 0), int: st.attr.int + (gear.int || 0), vit: st.attr.vit + (gear.vit || 0) };
  const p = passiveTotals(st);
  const b = {};
  for (const bf of buffs) for (const [k, v] of Object.entries(bf.stats || {})) b[k] = (b[k] || 0) + v;
  const L = st.level;
  const main = MAIN[st.cls].reduce((s, k) => s + a[k], 0) / MAIN[st.cls].length;
  const d = {};
  d.attr = a;
  d.atk = Math.round(((gear.atk || 0) + main * 2.2 + a.str * 0.6 + L * 1.6) * (1 + (p.atkPct || 0) / 100));
  d.matk = Math.round(((gear.matk || 0) + a.int * 2.6 + L * 1.6) * (1 + (p.matkPct || 0) / 100));
  d.hp = Math.round((90 + a.vit * 14 + a.str * 2 + L * 12 + (gear.hp || 0) + (p.hp || 0)) * (1 + (p.hpPct || 0) / 100));
  d.mp = Math.round((40 + a.int * 6 + L * 4 + (gear.mp || 0) + (p.mp || 0)) * (1 + (p.mpPct || 0) / 100));
  d.def = Math.round(((gear.def || 0) + a.vit * 0.6 + L * 0.5 + (b.def || 0)) * (1 + (p.defPct || 0) / 100));
  d.crit = Math.min(75, 5 + a.dex * 0.3 + (gear.crit || 0) + (p.crit || 0) + (b.crit || 0));
  d.critDmg = 150 + (gear.critDmg || 0) + (p.critDmg || 0);
  d.aspd = a.dex * 0.4 + (gear.aspd || 0) + (p.aspd || 0) + (b.aspd || 0);
  d.move = (gear.move || 0) + (p.move || 0) + (b.move || 0);
  d.dodge = Math.min(50, a.dex * 0.12 + (gear.dodge || 0) + (p.dodge || 0) + (b.dodge || 0));
  d.hpRegen = 0.4 + a.vit * 0.05 + L * 0.05 + (gear.hpRegen || 0) + (p.hpRegen || 0) + (b.hpRegen || 0);
  d.mpRegen = 1 + a.int * 0.08 + (gear.mpRegen || 0) + (p.mpRegen || 0) + (b.mpRegen || 0);
  d.lifesteal = (gear.lifesteal || 0) + (p.lifesteal || 0) + (b.lifesteal || 0);
  d.cdr = Math.min(40, (gear.cdr || 0) + (p.cdr || 0));
  d.dmg = (p.dmg || 0) + (b.dmg || 0);
  d.thorns = p.thorns || 0; d.block = p.block || 0;
  d.heal = p.heal || 0; d.dot = p.dot || 0; d.summon = p.summon || 0;
  d.lowHpDmg = p.lowHpDmg || 0; d.executeDmg = p.executeDmg || 0;
  d.bleedChance = p.bleedChance || 0; d.poisonChance = p.poisonChance || 0; d.burnChance = p.burnChance || 0;
  d.broken = durBroken;
  return d;
}

export function power(st) {
  const items = Object.values(st.equip).filter(Boolean);
  if (!items.length) return 0;
  return Math.round(items.reduce((s, i) => s + i.ip, 0) / items.length);
}

// ---------- опыт ----------
export function gainXp(st, n) {
  if (st.level >= MAX_LEVEL) return 0;
  st.xp += n; let ups = 0;
  while (st.xp >= xpToNext(st.level) && st.level < MAX_LEVEL) {
    st.xp -= xpToNext(st.level); st.level++; ups++;
    st.statPoints += 3; st.skillPoints += 1;
    const g = CLASSES[st.cls].grow;
    for (const k of Object.keys(g)) st.attr[k] += g[k];
  }
  return ups;
}

// ---------- навыки ----------
export function canLearn(st, s) {
  if (st.level < s.lvl) return "Нужен " + s.lvl + "-й уровень";
  if ((st.skills[s.id] || 0) >= 5) return "Максимальный ранг";
  if (st.skillPoints <= 0) return "Нет очков навыков";
  return null;
}
export function masteryLevel(st, id) { return Math.min(10, Math.floor(Math.sqrt((st.mastery[id] || 0) / 4))); }
export function gatherLevel(st, kind) { return Math.min(20, Math.floor(Math.sqrt((st.gather[kind] || 0) / 3))); }

// Значения навыка с учётом ранга и мастерства
export function skillValues(st, s) {
  const r = Math.max(1, st.skills[s.id] || 1), m = masteryLevel(st, s.id);
  return {
    mul: (s.mul || 0) * (1 + 0.15 * (r - 1)) * (1 + m * 0.02),
    mp: Math.round((s.mp || 0) * (1 + 0.08 * (r - 1))),
    cd: (s.cd || 0) * (1 - m * 0.01),
    dur: (s.dur || 0) * (1 + 0.06 * (r - 1)),
    pct: (s.pct || 0) * (1 + 0.1 * (r - 1)),
    rank: r, mastery: m,
  };
}

// ---------- лут ----------
export function rollGear(rng, tier, cls, opts = {}) {
  const slots = ["weapon", "head", "chest", "boots", "ring", "amulet", "chest", "head", "boots"];
  const slot = opts.slot || slots[Math.floor(rng() * slots.length)];
  const types = ["cloth", "leather", "plate"];
  const type = slot === "weapon" || slot === "ring" || slot === "amulet" ? null : (rng() < 0.55 ? CLASSES[cls].armor : types[Math.floor(rng() * 3)]);
  const qr = rng();
  const quality = qr < 0.5 ? 0 : qr < 0.78 ? 1 : qr < 0.92 ? 2 : qr < 0.985 ? 3 : 4;
  const nAff = rng() < 0.35 ? (rng() < 0.3 ? 2 : 1) : 0;
  const affixes = [];
  for (let i = 0; i < nAff; i++) {
    const a = AFFIXES[Math.floor(rng() * AFFIXES.length)];
    if (affixes.find(x => x.stat === a.stat)) continue;
    const v = a.min + (a.max - a.min) * rng();
    affixes.push({ stat: a.stat, v: Math.round(v * tier * (a.max < 5 ? 10 : 1)) / (a.max < 5 ? 10 : 1) });
  }
  return makeGear({ slot, type, tier, quality, cls, affixes });
}

// ---------- сохранения ----------
const KEY = n => "drpg_slot_" + n;
export function saveGame(st, slot) {
  try { st.savedAt = Date.now(); localStorage.setItem(KEY(slot), JSON.stringify(st)); return true; } catch (e) { return false; }
}
export function loadGame(slot) {
  try { const s = localStorage.getItem(KEY(slot)); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
export function deleteGame(slot) { try { localStorage.removeItem(KEY(slot)); } catch (e) {} }
export function listSaves() { return [0, 1, 2].map(i => loadGame(i)); }

export function itemIcon(it) {
  if (it.cat === "res") return RESOURCES[it.id].icon;
  if (it.cat === "potion") return POTIONS[it.id].icon;
  return null;
}
export { findSkill };
