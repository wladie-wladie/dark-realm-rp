// Предметы: ресурсы (как в Albion — по тирам), снаряжение с тиром, качеством и износом, зелья.
export const TIER_NAMES = ["", "Грубый", "Добротный", "Мастерский", "Легендарный"];
export const TIER_ROMAN = ["", "I", "II", "III", "IV"];
export const QUALITY = [
  { name: "Обычное", mul: 1.0, color: "#c8c0b0" },
  { name: "Хорошее", mul: 1.1, color: "#7ac070" },
  { name: "Выдающееся", mul: 1.22, color: "#6aa0e0" },
  { name: "Превосходное", mul: 1.36, color: "#b070e0" },
  { name: "Шедевр", mul: 1.55, color: "#e0a040" },
];
export const SLOTS = { weapon: "Оружие", head: "Голова", chest: "Тело", boots: "Ноги", ring: "Кольцо", amulet: "Амулет" };

export const RESOURCES = {
  wood1: { name: "Сосновые брёвна", icon: ["▤", "#a08060"], tier: 1, value: 4 },
  wood2: { name: "Ясеневые брёвна", icon: ["▤", "#8a6a48"], tier: 2, value: 10 },
  wood3: { name: "Чёрный дуб", icon: ["▤", "#5a4a40"], tier: 3, value: 24 },
  ore1:  { name: "Медная руда", icon: ["◆", "#c07040"], tier: 1, value: 5 },
  ore2:  { name: "Железная руда", icon: ["◆", "#8a9aa8"], tier: 2, value: 12 },
  ore3:  { name: "Серебряная руда", icon: ["◆", "#d8e0e8"], tier: 3, value: 28 },
  hide1: { name: "Грубая шкура", icon: ["▰", "#8a6a4a"], tier: 1, value: 4 },
  hide2: { name: "Толстая шкура", icon: ["▰", "#6a4a32"], tier: 2, value: 11 },
  hide3: { name: "Шкура зверя", icon: ["▰", "#4a3424"], tier: 3, value: 26 },
  herb1: { name: "Кровохлёбка", icon: ["❦", "#c84a5a"], tier: 1, value: 3 },
  herb2: { name: "Синецвет", icon: ["❦", "#6a7ad0"], tier: 2, value: 9 },
  herb3: { name: "Мертвоцвет", icon: ["❦", "#d0c050"], tier: 3, value: 22 },
  fiber1:{ name: "Лён", icon: ["≋", "#c0b890"], tier: 1, value: 3 },
  fiber2:{ name: "Конопля", icon: ["≋", "#9a9a70"], tier: 2, value: 9 },
  fiber3:{ name: "Паучий шёлк", icon: ["≋", "#e0e0f0"], tier: 3, value: 22 },
  crystal: { name: "Рунный кристалл", icon: ["✦", "#7a9ad0"], tier: 3, value: 40 },
  fang:  { name: "Клык волка", icon: ["◣", "#e0d8c0"], tier: 1, value: 6 },
  ichor: { name: "Болотная слизь", icon: ["●", "#6a8a3a"], tier: 2, value: 10 },
  bone:  { name: "Древняя кость", icon: ["⊸", "#d0c8b0"], tier: 2, value: 12 },
  heart: { name: "Каменное сердце", icon: ["♥", "#ff8a40"], tier: 4, value: 400 },
};

export const POTIONS = {
  hp1: { name: "Малое зелье здоровья", icon: ["⚱", "#d03030"], heal: 0.3, value: 15, desc: "Восстанавливает 30% здоровья." },
  hp2: { name: "Зелье здоровья", icon: ["⚱", "#ff3030"], heal: 0.55, value: 45, desc: "Восстанавливает 55% здоровья." },
  mp1: { name: "Малое зелье маны", icon: ["⚱", "#3050d0"], mana: 0.35, value: 15, desc: "Восстанавливает 35% маны." },
  mp2: { name: "Зелье маны", icon: ["⚱", "#4070ff"], mana: 0.6, value: 45, desc: "Восстанавливает 60% маны." },
  town: { name: "Свиток возвращения", icon: ["✉", "#d0c080"], recall: true, value: 30, desc: "Переносит в Серый Брод." },
};

// Типы оружия по классам: внешний вид и характеристика
export const WEAPON_TYPES = {
  warrior: { names: ["Меч"], look: "sword", stat: "atk" },
  ranger:  { names: ["Лук"], look: "bow", stat: "atk" },
  rogue:   { names: ["Кинжалы"], look: "dagger", stat: "atk" },
  mage:    { names: ["Посох"], look: "staff", stat: "matk" },
  cleric:  { names: ["Булава"], look: "mace", stat: "both" },
  warlock: { names: ["Коса"], look: "scythe", stat: "matk" },
};

// Броня (как в Albion: любой класс может носить любую)
export const ARMOR_TYPES = {
  cloth:   { name: "Ткань", head: "Капюшон", chest: "Мантия", boots: "Сандалии", def: 0.5, extra: { matk: 3, mpRegen: 0.15 } },
  leather: { name: "Кожа", head: "Шапка", chest: "Куртка", boots: "Сапоги", def: 1.0, extra: { crit: 0.6, dodge: 0.5 } },
  plate:   { name: "Латы", head: "Шлем", chest: "Кираса", boots: "Латные сапоги", def: 1.7, extra: { hp: 12 }, move: -2 },
};

export const AFFIXES = [
  { stat: "str", min: 1, max: 3 }, { stat: "dex", min: 1, max: 3 }, { stat: "int", min: 1, max: 3 }, { stat: "vit", min: 1, max: 3 },
  { stat: "crit", min: 1, max: 3 }, { stat: "aspd", min: 2, max: 5 }, { stat: "hp", min: 10, max: 30 }, { stat: "mp", min: 8, max: 20 },
  { stat: "lifesteal", min: 1, max: 2 }, { stat: "move", min: 2, max: 5 }, { stat: "cdr", min: 1, max: 3 }, { stat: "hpRegen", min: 0.3, max: 1 },
];

// Рецепты крафта у кузнеца/кожевника/ткача и алхимика
export function gearRecipe(slot, type, tier) {
  const t = tier;
  if (slot === "weapon") {
    if (type === "ranger" || type === "mage" || type === "warlock") return { [`wood${t}`]: 6, [`ore${t}`]: 2 };
    if (type === "rogue") return { [`ore${t}`]: 4, [`hide${t}`]: 2 };
    return { [`ore${t}`]: 6, [`wood${t}`]: 2 };
  }
  const n = slot === "chest" ? 6 : 3;
  if (type === "plate") return { [`ore${t}`]: n, [`hide${t}`]: Math.ceil(n / 3) };
  if (type === "leather") return { [`hide${t}`]: n, [`fiber${t}`]: Math.ceil(n / 3) };
  if (type === "cloth") return { [`fiber${t}`]: n, [`herb${t}`]: Math.ceil(n / 3) };
  if (slot === "ring") return { [`ore${t}`]: 3, [`herb${t}`]: 1 };
  if (slot === "amulet") return { [`ore${t}`]: 2, [`fiber${t}`]: 2 };
  return {};
}
export const POTION_RECIPES = {
  hp1: { herb1: 2 }, mp1: { herb1: 1, fiber1: 1 },
  hp2: { herb2: 2, herb1: 1 }, mp2: { herb2: 2, fiber2: 1 },
  town: { fiber1: 2, herb1: 1 },
};

// Построение предмета снаряжения
let uid = Date.now() % 100000;
export function makeGear({ slot, type, tier, quality = 0, cls, affixes = [] }) {
  const q = QUALITY[quality].mul;
  const it = { uid: "g" + (uid++), cat: "gear", slot, type, tier, quality, cls, dur: 100, affixes, stats: {} };
  const s = it.stats;
  if (slot === "weapon") {
    const wt = WEAPON_TYPES[cls];
    it.name = `${wt.names[0]}`;
    const base = Math.round((8 + tier * tier * 7 + tier * 6) * q);
    if (wt.stat === "atk") s.atk = base; else if (wt.stat === "matk") s.matk = base; else { s.atk = Math.round(base * 0.7); s.matk = Math.round(base * 0.7); }
  } else if (slot === "head" || slot === "chest" || slot === "boots") {
    const at = ARMOR_TYPES[type];
    it.name = at[slot];
    const slotMul = slot === "chest" ? 1 : 0.55;
    s.def = Math.round((3 + tier * tier * 3 + tier * 3) * at.def * slotMul * q);
    for (const [k, v] of Object.entries(at.extra)) s[k] = Math.round(v * tier * slotMul * q * 10) / 10 * (k === "hp" ? 1 : 1);
    if (at.move) s.move = at.move;
  } else if (slot === "ring") {
    it.name = "Кольцо"; s.crit = Math.round(tier * 1.2 * q * 10) / 10; s.atk = Math.round(tier * 2 * q); s.matk = Math.round(tier * 2 * q);
  } else if (slot === "amulet") {
    it.name = "Амулет"; s.hp = Math.round(tier * 14 * q); s.mp = Math.round(tier * 8 * q);
  }
  for (const a of affixes) s[a.stat] = Math.round(((s[a.stat] || 0) + a.v) * 10) / 10;
  it.ip = tier * 100 + quality * 20 + affixes.length * 10; // сила предмета
  return it;
}

export function itemValue(it) {
  if (it.cat === "gear") return Math.round((10 + it.tier * it.tier * 18) * QUALITY[it.quality].mul * (1 + it.affixes.length * 0.25));
  if (it.cat === "res") return RESOURCES[it.id].value;
  if (it.cat === "potion") return POTIONS[it.id].value;
  return 1;
}

export function itemTitle(it) {
  if (it.cat === "gear") {
    const tier = TIER_NAMES[it.tier];
    const name = it.name;
    // согласование прилагательного по роду
    const fem = ["Мантия", "Куртка", "Кираса", "Шапка", "Булава", "Коса"].includes(name);
    const plur = ["Кинжалы", "Сандалии", "Сапоги", "Латные сапоги"].includes(name);
    const neut = [].includes(name);
    let adj = tier;
    if (fem) adj = tier.replace(/ый$|ий$/, m => (m === "ый" ? "ая" : "ая")).replace("Мастерская", "Мастерская");
    if (plur) adj = tier.replace(/ый$|ий$/, "ые");
    if (neut) adj = tier.replace(/ый$/, "ое");
    if (fem && tier.endsWith("ий")) adj = tier.slice(0, -2) + "ая";
    if (plur && tier.endsWith("ий")) adj = tier.slice(0, -2) + "ие";
    return `${adj} ${name.toLowerCase()} ${TIER_ROMAN[it.tier]}`.replace(/^(.)/, c => c.toUpperCase());
  }
  if (it.cat === "res") return RESOURCES[it.id].name;
  if (it.cat === "potion") return POTIONS[it.id].name;
  return "?";
}
