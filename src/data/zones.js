// Локации: стартовый город и ближние земли. Координаты — в клетках (64 px).
// danger: safe — город; blue — без потерь; yellow — сильнее износ; red — при смерти теряется часть сумки (как в Albion).
export const TILE = 64;

export const DANGER = {
  safe:   { name: "Безопасная зона", color: "#6ab0ff", durLoss: 0, bagLoss: 0, goldLoss: 0 },
  blue:   { name: "Синяя зона", color: "#4a90e0", durLoss: 8, bagLoss: 0, goldLoss: 0.05 },
  yellow: { name: "Жёлтая зона", color: "#e0c040", durLoss: 15, bagLoss: 0, goldLoss: 0.1 },
  red:    { name: "Красная зона", color: "#e04030", durLoss: 20, bagLoss: 0.35, goldLoss: 0.15 },
};

export const ZONES = {
  town: {
    name: "Серый Брод", danger: "safe", lvl: "", size: [46, 34], base: "grass", seed: 11,
    mood: { name: "Вечер", gain: [1.07, 0.95, 0.84], sat: -0.15, lights: 1.6, glow: 0.2 },
    tint: 0x9aa0b0, dark: 0.25, ambient: "town",
    paths: [
      { pts: [[23, 0], [23, 13]], w: 2.2, t: "road" },
      { pts: [[23, 20], [23, 34]], w: 2.2, t: "road" },
      { pts: [[30, 17], [46, 16]], w: 2.2, t: "road" },
      { pts: [[0, 18], [16, 17]], w: 1.6, t: "dirt" },
    ],
    plazas: [{ x: 23, y: 16.5, rx: 8, ry: 5.5, t: "cobble" }],
    border: { props: ["pine", "oak"], depth: 2 },
    scatter: [{ p: "tuft", d: 0.12 }, { p: "bush", d: 0.02 }, { p: "fern", d: 0.02 }],
    trees: { p: ["oak", "pine"], d: 0.035 },
    fixed: [
      ["tavern", 14, 11], ["smithy", 33, 11], ["shop", 13, 24], ["herbhut", 33, 24], ["house", 6, 9], ["house", 40, 26, 1], ["house", 5, 27, 1],
      ["well", 23, 16.6], ["stall", 19, 19.5], ["stall", 27.5, 19.5, 1], ["lantern", 17, 14], ["lantern", 29.5, 14], ["lantern", 17, 20], ["lantern", 29.5, 20],
      ["lantern", 22, 3], ["lantern", 24.5, 30], ["lantern", 40, 15], ["anvil", 36.5, 13.2], ["barrel", 37.8, 12.8], ["crate", 30.5, 13], ["barrel", 10.6, 12.4], ["crate", 18.7, 12.6],
      ["cart", 41, 18.5], ["fence", 8, 31], ["fence", 9.4, 31], ["fence", 37, 31], ["fence", 38.4, 31], ["signpost", 25, 4], ["signpost", 42, 14.2],
      ["campfire", 9, 19], ["log", 7.5, 20.6], ["portal", 23, 1.3], ["portal", 44.6, 16], ["portal", 23, 32.8],
    ],
    npcs: [
      { id: "elder", name: "Староста Годрик", role: "quests", x: 21, y: 15.4, look: { gender: "m", skin: 1, hair: 3, hairColor: 6, beard: 3, armor: "cloth", colors: { main: "#3a3428", trim: "#7a6a40" } } },
      { id: "smith", name: "Кузнец Бруно", role: "smith", x: 35, y: 13.6, look: { gender: "m", skin: 2, hair: 0, hairColor: 0, beard: 2, armor: "leather", colors: { main: "#3a2a1e", trim: "#1a1410" }, weapon: "mace" } },
      { id: "trader", name: "Торговка Ирма", role: "shop", x: 15, y: 26.6, look: { gender: "f", skin: 0, hair: 7, hairColor: 3, armor: "cloth", colors: { main: "#4a2a2a", trim: "#a08040" } } },
      { id: "alch", name: "Травница Вела", role: "alchemy", x: 34.5, y: 26.4, look: { gender: "f", skin: 1, hair: 1, hairColor: 7, armor: "cloth", colors: { main: "#2a3a2a", trim: "#6a8a4a" } } },
      { id: "mentor", name: "Наставник Ольгерд", role: "mentor", x: 26.5, y: 15.6, look: { gender: "m", skin: 3, hair: 0, hairColor: 6, beard: 1, scar: 1, armor: "plate", colors: { main: "#4a4a50", trim: "#6a5a30" }, weapon: "sword" } },
      { id: "guard", name: "Стражник", role: "talk", x: 24.6, y: 5, look: { gender: "m", skin: 2, hair: 0, armor: "plate", helm: "plate", weapon: "sword", offhand: "shield" }, lines: ["К северу — Сумрачный лес. Волки там совсем озверели.", "Без зелий за ворота не ходи."] },
      { id: "guard2", name: "Стражница", role: "talk", x: 42.5, y: 17.6, look: { gender: "f", skin: 3, hair: 2, hairColor: 0, armor: "plate", helm: "plate", weapon: "sword", offhand: "shield" }, lines: ["На восток — Старый тракт. Разбойники да мертвецы на погосте.", "Дальше по тракту — заброшенная шахта. Это красная зона: умрёшь — потеряешь часть добра."] },
    ],
    exits: [
      { to: "forest", x: 23, y: 0.4, w: 3, arrive: [27, 38] },
      { to: "tract", x: 45.6, y: 16, w: 3, vertical: true, arrive: [2, 21] },
      { to: "swamp", x: 23, y: 33.6, w: 3, arrive: [25, 2], minLvl: 5 },
    ],
    spawn: [23, 22],
  },

  forest: {
    name: "Сумрачный лес", danger: "blue", lvl: "1–6", size: [56, 40], base: "forest", seed: 23,
    mood: { name: "Осенний день", gain: [1.06, 1.0, 0.84], sat: -0.1, lights: 0.8, glow: 0.12, weather: "leaves" },
    tint: 0x8a9a8a, dark: 0.35, fog: 0.15, ambient: "forest",
    paths: [{ pts: [[27, 40], [26, 30], [20, 22], [24, 14], [33, 9], [38, 4]], w: 1.6, t: "dirt" }, { pts: [[20, 22], [10, 20], [6, 12]], w: 1.2, t: "dirt" }],
    plazas: [{ x: 38, y: 8, rx: 7, ry: 5, t: "grass" }, { x: 12, y: 30, rx: 5, ry: 4, t: "grass" }],
    water: [{ x: 44, y: 26, rx: 5, ry: 3.5 }],
    border: { props: ["pine", "pine", "oak"], depth: 2 },
    scatter: [{ p: "tuft", d: 0.08 }, { p: "fern", d: 0.06 }, { p: "bush", d: 0.03 }, { p: "mushrooms", d: 0.02 }, { p: "stump", d: 0.006 }, { p: "log", d: 0.004 }, { p: "rock", d: 0.008 }],
    trees: { p: ["pine", "pine", "oak", "deadtree"], d: 0.14 },
    fixed: [["portal", 27, 39.2], ["campfire", 12, 30], ["log", 10.4, 31.4], ["bones", 38, 8], ["signpost", 25, 37]],
    nodes: [["node_wood1", 10], ["node_ore1", 6], ["node_herb1", 9], ["node_fiber1", 8]],
    spawns: [{ m: "wolf", n: 9 }, { m: "boar", n: 6 }, { m: "spider", n: 6, area: [10, 10, 10] }],
    boss: { m: "alpha", x: 38, y: 7 },
    exits: [{ to: "town", x: 27, y: 39.6, w: 3, arrive: [23, 3] }],
  },

  swamp: {
    name: "Гнилые топи", danger: "yellow", lvl: "5–10", size: [56, 42], base: "swampgrass", seed: 37,
    mood: { name: "Ночь", gain: [0.78, 0.9, 1.1], sat: -0.3, lights: 1.9, glow: 0.34, extraDark: 0.03, weather: "fireflies" },
    tint: 0x80907a, dark: 0.42, fog: 0.35, ambient: "swamp",
    paths: [{ pts: [[25, 0], [24, 10], [30, 18], [26, 28], [32, 36]], w: 1.4, t: "mud" }, { pts: [[30, 18], [44, 20]], w: 1.2, t: "mud" }],
    plazas: [{ x: 33, y: 36, rx: 6, ry: 4, t: "mud" }],
    water: [{ x: 12, y: 14, rx: 6, ry: 4, t: "swampwater" }, { x: 44, y: 9, rx: 5, ry: 4, t: "swampwater" }, { x: 14, y: 32, rx: 7, ry: 4.5, t: "swampwater" }, { x: 46, y: 31, rx: 4, ry: 3, t: "swampwater" }],
    border: { props: ["swamptree", "deadtree"], depth: 2 },
    scatter: [{ p: "reeds", d: 0.06 }, { p: "drytuft", d: 0.05 }, { p: "mushrooms", d: 0.02, v: 1 }, { p: "bones", d: 0.004 }, { p: "log", d: 0.004 }],
    waterScatter: [{ p: "lily", d: 0.12 }],
    trees: { p: ["deadtree", "swamptree", "deadtree"], d: 0.08 },
    fixed: [["portal", 25, 1], ["hut", 37, 33], ["bones", 30, 35], ["boat", 19.5, 30.5], ["boat", 7, 16.5]],
    nodes: [["node_herb2", 10], ["node_fiber2", 8], ["node_wood2", 6], ["node_herb1", 4]],
    spawns: [{ m: "toad", n: 8 }, { m: "ghoul", n: 9 }, { m: "wisp", n: 6 }],
    boss: { m: "witch", x: 33, y: 37 },
    exits: [{ to: "town", x: 25, y: 0.4, w: 3, arrive: [23, 31] }],
  },

  tract: {
    name: "Старый тракт", danger: "yellow", lvl: "8–13", size: [60, 40], base: "grass", seed: 51,
    mood: { name: "Закат", gain: [1.14, 0.92, 0.76], sat: -0.12, lights: 1.3, glow: 0.18, weather: "dust" },
    tint: 0x9a9488, dark: 0.38, fog: 0.1, ambient: "tract",
    paths: [{ pts: [[0, 21], [14, 20], [26, 24], [40, 22], [52, 14], [56, 3]], w: 2, t: "road" }, { pts: [[26, 24], [24, 34]], w: 1.2, t: "dirt" }],
    plazas: [{ x: 23, y: 33, rx: 8, ry: 5, t: "dirt" }, { x: 42, y: 30, rx: 6, ry: 4, t: "dirt" }],
    border: { props: ["oak", "pine", "deadtree"], depth: 2 },
    scatter: [{ p: "drytuft", d: 0.06 }, { p: "tuft", d: 0.05 }, { p: "bush", d: 0.03 }, { p: "rock", d: 0.01 }, { p: "pebble", d: 0.02 }],
    trees: { p: ["oak", "deadtree", "pine"], d: 0.07 },
    fixed: [["portal", 1, 21], ["portal", 56, 1.4], ["grave", 19, 31], ["grave", 21, 30.5, 1], ["grave", 23, 31.4, 2], ["grave", 25, 30.7], ["grave", 27, 31.5, 1], ["grave", 20, 34, 2], ["grave", 22.4, 35, 0], ["grave", 26, 34.6, 1], ["grave", 28, 33.6, 2],
      ["ruinwall", 17, 28], ["ruinwall", 29, 28, 1], ["pillar", 31, 32], ["pillar", 15, 33, 1], ["cart", 33, 22], ["crate", 35, 21.4], ["barrel", 31.5, 21.2], ["campfire", 42, 30], ["crate", 40, 29], ["barrel", 44, 29], ["signpost", 4, 19.5], ["ruinwall", 46, 33]],
    nodes: [["node_ore2", 8], ["node_wood2", 7], ["node_fiber2", 4], ["node_ore1", 4]],
    spawns: [{ m: "bandit", n: 9, area: [40, 26, 12] }, { m: "archer", n: 5, area: [40, 26, 12] }, { m: "skeleton", n: 8, area: [23, 32, 8] }, { m: "bat", n: 6 }],
    boss: { m: "ataman", x: 43, y: 31 },
    exits: [{ to: "town", x: 0.4, y: 21, w: 3, vertical: true, arrive: [43, 16] }, { to: "mine", x: 56, y: 0.4, w: 3, arrive: [30, 36], minLvl: 11 }],
  },

  mine: {
    name: "Заброшенная шахта", danger: "red", lvl: "12–18", size: [56, 40], base: "stone", seed: 67,
    tint: 0x8a8070, dark: 0.6, fog: 0.05, ambient: "mine", cave: true,
    paths: [{ pts: [[30, 40], [28, 30], [18, 24], [22, 12], [34, 8]], w: 1.6, t: "ash" }, { pts: [[28, 30], [42, 26], [46, 16]], w: 1.4, t: "ash" }],
    plazas: [{ x: 34, y: 8, rx: 7, ry: 5, t: "ash" }],
    water: [{ x: 10, y: 34, rx: 4, ry: 3 }],
    border: { props: ["boulder", "rock"], depth: 2 },
    scatter: [{ p: "pebble", d: 0.06 }, { p: "bones", d: 0.01 }, { p: "cobweb", d: 0.01 }, { p: "crystal", d: 0.006 }],
    trees: { p: ["boulder", "rock", "rock", "pillar"], d: 0.08 },
    fixed: [["mine", 30, 39.5], ["beam", 27, 32], ["beam", 22, 20], ["beam", 40, 26], ["minecart", 25, 28], ["minecart", 44, 22], ["lantern", 29, 33], ["lantern", 20, 18], ["lantern", 36, 12], ["crystal", 37, 6, 1], ["crystal", 30, 6]],
    nodes: [["node_ore3", 10], ["node_ore2", 6], ["node_fiber3", 0]],
    spawns: [{ m: "cavespider", n: 9 }, { m: "miner", n: 9 }, { m: "golem", n: 4 }, { m: "bat", n: 5 }],
    boss: { m: "heartgolem", x: 34, y: 7 },
    exits: [{ to: "tract", x: 30, y: 39.6, w: 3, arrive: [55, 4] }],
  },
};

export const ZONE_LINKS_TEXT = { forest: "Сумрачный лес", tract: "Старый тракт", swamp: "Гнилые топи", mine: "Заброшенная шахта", town: "Серый Брод" };
