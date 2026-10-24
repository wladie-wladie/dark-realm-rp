// Логика заданий: принятие, прогресс, сдача, поручения с доски.
import { QUESTS, BOUNTIES } from "../data/quests.js";
import { MONSTERS } from "../data/monsters.js";
import { countItem, removeItem, addItem, rollGear } from "./state.js";

export function questById(id) { return QUESTS.find(q => q.id === id); }

export function availableQuests(st, npcId) {
  return QUESTS.filter(q => q.giver === npcId && !st.quests.done.includes(q.id) && !st.quests.active[q.id] && st.level >= q.lvl - 1 && prereqDone(st, q));
}
function prereqDone(st, q) {
  const i = QUESTS.indexOf(q);
  // основная цепочка старосты идёт по порядку
  const prev = QUESTS.slice(0, i).filter(x => x.giver === q.giver);
  return prev.every(x => st.quests.done.includes(x.id) || x.lvl > q.lvl);
}
export function accept(st, q) { st.quests.active[q.id] = { n: 0 }; }

export function questOnKill(st, mid) {
  for (const [id, pr] of Object.entries(st.quests.active)) {
    const q = questById(id);
    if (q && q.goal.type === "kill" && q.goal.mob === mid) pr.n = Math.min(q.goal.n, pr.n + 1);
  }
  if (st.bounty && st.bounty.mob === mid) st.bounty.got = Math.min(st.bounty.n, (st.bounty.got || 0) + 1);
}
export function questOnBoss(st, mid) {
  for (const [id, pr] of Object.entries(st.quests.active)) {
    const q = questById(id);
    if (q && q.goal.type === "boss" && q.goal.mob === mid) pr.n = 1;
  }
}

export function progressText(st, q) {
  const pr = st.quests.active[q.id] || { n: 0 };
  const g = q.goal;
  if (g.type === "kill") return `${MONSTERS[g.mob].name}: ${pr.n}/${g.n}`;
  if (g.type === "boss") return `${MONSTERS[g.mob].name}: ${pr.n ? "повержен" : "жив"}`;
  if (g.type === "gather") return Object.entries(g.items).map(([id, n]) => `${resName(id)}: ${Math.min(n, countItem(st, id))}/${n}`).join(", ");
  if (g.type === "subclass") return st.sub ? "Подкласс выбран" : "Выберите подкласс у Наставника";
  return "";
}
import { RESOURCES } from "../data/items.js";
const resName = id => RESOURCES[id]?.name || id;

export function isComplete(st, q) {
  const pr = st.quests.active[q.id]; if (!pr) return false;
  const g = q.goal;
  if (g.type === "kill") return pr.n >= g.n;
  if (g.type === "boss") return pr.n >= 1;
  if (g.type === "gather") return Object.entries(g.items).every(([id, n]) => countItem(st, id) >= n);
  if (g.type === "subclass") return !!st.sub;
  return false;
}

export function turnIn(st, q) {
  if (!isComplete(st, q)) return null;
  if (q.goal.type === "gather" && q.take) for (const [id, n] of Object.entries(q.goal.items)) removeItem(st, id, n);
  delete st.quests.active[q.id];
  st.quests.done.push(q.id);
  const r = q.reward, got = [];
  st.gold += r.gold || 0;
  for (const [id, n] of r.items || []) { addItem(st, { cat: "potion", id, n }); got.push({ cat: "potion", id, n }); }
  if (r.gear) { const g = rollGear(Math.random, r.gear, st.cls); if (g.quality < 1) { g.quality = 1; } addItem(st, g); got.push(g); }
  return { xp: r.xp || 0, gold: r.gold || 0, items: got };
}

export function newBounty(st) {
  const pool = BOUNTIES.filter(b => b.lvl <= st.level + 1 && b.lvl >= st.level - 7);
  const b = pool[Math.floor(Math.random() * pool.length)] || BOUNTIES[0];
  const m = MONSTERS[b.mob];
  return { mob: b.mob, n: b.n, got: 0, xp: Math.round(m.xp * b.n * 1.2), gold: Math.round((m.gold[0] + m.gold[1]) * b.n * 0.4) };
}

export function npcMarker(st, npcId) {
  for (const id of Object.keys(st.quests.active)) { const q = questById(id); if (q && q.giver === npcId && isComplete(st, q)) return "?"; }
  if (availableQuests(st, npcId).length) return "!";
  if (npcId === "elder" && st.bounty && st.bounty.got >= st.bounty.n) return "?";
  if (npcId === "mentor" && st.level >= 10 && !st.sub) return "!";
  return "";
}
