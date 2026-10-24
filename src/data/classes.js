// Классы, подклассы и навыки. Подкласс выбирается у Наставника на 10-м уровне.
// Активный навык: cast — тип действия (melee/proj/aoe/dash/buff/heal/summon/chain/shield/trap/blink).
// Ранг навыка 1–5 повышается очками навыков; мастерство растёт от применения (как в Albion).

export const STAT_NAMES = {
  str: "Сила", dex: "Ловкость", int: "Интеллект", vit: "Выносливость",
  hp: "Здоровье", mp: "Мана", atk: "Физ. атака", matk: "Маг. атака", def: "Защита",
  crit: "Шанс крита, %", critDmg: "Урон крита, %", aspd: "Скорость атаки, %", move: "Скорость бега, %",
  hpRegen: "Восст. здоровья/с", mpRegen: "Восст. маны/с", lifesteal: "Вампиризм, %", dodge: "Уклонение, %",
  cdr: "Сокращение перезарядки, %", dmg: "Весь урон, %", thorns: "Отражение урона, %", block: "Блок, %",
  heal: "Сила лечения, %", dot: "Урон эффектов, %", summon: "Сила призванных, %",
};

export const STATUS = {
  burn: { name: "Горение", color: "#ff7a30" }, poison: { name: "Яд", color: "#7ad040" },
  bleed: { name: "Кровотечение", color: "#c02020" }, slow: { name: "Замедление", color: "#80b0ff" },
  freeze: { name: "Заморозка", color: "#b0e0ff" }, stun: { name: "Оглушение", color: "#ffe060" },
  weaken: { name: "Уязвимость", color: "#b060ff" }, curse: { name: "Проклятие", color: "#8040a0" },
  fear: { name: "Страх", color: "#605080" },
};

const A = (o) => Object.assign({ kind: "active", rank: 0 }, o);
const P = (o) => Object.assign({ kind: "passive", rank: 0 }, o);

export const CLASSES = {
  warrior: {
    name: "Воин", desc: "Боец ближнего боя в тяжёлой броне. Много здоровья, мощные удары по площади.",
    weapon: "sword", offhand: "shield", armor: "plate", colors: { main: "#5a5e66", trim: "#3a3c40" }, castColor: "#ffc070",
    base: { str: 8, dex: 4, int: 2, vit: 7 }, grow: { str: 2, dex: 1, int: 0, vit: 2 },
    attack: { type: "melee", range: 62, arc: 110, mul: 1, dmgType: "phys", speed: 1.0 },
    skills: [
      A({ id: "w_cleave", name: "Рассекающий удар", lvl: 1, mp: 8, cd: 4, icon: ["⚔", "#d0a060"], desc: "Широкий удар перед собой.", cast: "melee", range: 80, arc: 160, mul: 1.8 }),
      A({ id: "w_charge", name: "Рывок", lvl: 3, mp: 12, cd: 8, icon: ["➶", "#c0c0d0"], desc: "Бросок вперёд, оглушая врагов на пути.", cast: "dash", dist: 190, mul: 1.2, status: ["stun", 1] }),
      A({ id: "w_warcry", name: "Боевой клич", lvl: 5, mp: 18, cd: 20, icon: ["☈", "#e08040"], desc: "Повышает атаку и защиту на 10 с.", cast: "buff", dur: 10, stats: { dmg: 20, def: 15 } }),
      A({ id: "w_quake", name: "Сотрясение земли", lvl: 8, mp: 22, cd: 12, icon: ["✹", "#a08060"], desc: "Удар по земле: урон вокруг и замедление.", cast: "aoe", at: "self", radius: 120, mul: 2.2, status: ["slow", 3], color: "#a08060" }),
      P({ id: "w_iron", name: "Железная кожа", lvl: 2, icon: ["⛨", "#909aa8"], desc: "+6% защиты и +4% здоровья за ранг.", per: { defPct: 6, hpPct: 4 } }),
      P({ id: "w_fury", name: "Ярость боя", lvl: 4, icon: ["♨", "#d05030"], desc: "+3% урона за ранг.", per: { dmg: 3 } }),
      P({ id: "w_second", name: "Второе дыхание", lvl: 7, icon: ["❤", "#c04040"], desc: "+0.6 восст. здоровья в секунду за ранг.", per: { hpRegen: 0.6 } }),
    ],
    subclasses: {
      berserker: { name: "Берсерк", desc: "Двуручное оружие, кровь и неистовство. Чем меньше здоровья, тем страшнее удары.", weapon: "greatsword", offhand: null, colors: { main: "#5a3a2a", trim: "#7a2a1a" },
        skills: [
          A({ id: "b_whirl", name: "Вихрь стали", lvl: 10, mp: 20, cd: 9, icon: ["✺", "#d04030"], desc: "Кружится с клинком, нанося урон вокруг 4 раза.", cast: "aoe", at: "self", radius: 105, mul: 0.9, ticks: 4, interval: 0.25, color: "#d04030" }),
          A({ id: "b_rage", name: "Неистовство", lvl: 13, mp: 15, cd: 25, icon: ["♆", "#ff4020"], desc: "+35% скорости атаки и вампиризм 8% на 8 с.", cast: "buff", dur: 8, stats: { aspd: 35, lifesteal: 8 } }),
          A({ id: "b_execute", name: "Казнь", lvl: 16, mp: 25, cd: 14, icon: ["☠", "#a01010"], desc: "Сокрушительный удар; втрое сильнее по раненым врагам.", cast: "melee", range: 85, arc: 70, mul: 3.2, execute: true }),
          P({ id: "b_blood", name: "Жажда крови", lvl: 11, icon: ["♥", "#b01818"], desc: "+1.5% вампиризма за ранг.", per: { lifesteal: 1.5 } }),
          P({ id: "b_edge", name: "На грани", lvl: 14, icon: ["⚡", "#e05020"], desc: "До +6% урона за ранг, когда здоровья меньше половины.", per: { lowHpDmg: 6 } }),
          P({ id: "b_heavy", name: "Тяжёлая рука", lvl: 18, icon: ["⚒", "#b07040"], desc: "+5% урона крита за ранг.", per: { critDmg: 5 } }),
        ] },
      guardian: { name: "Страж", desc: "Щит и непробиваемая броня. Держит врагов на себе и отражает урон.", colors: { main: "#6a6e78", trim: "#2a3a6a" },
        skills: [
          A({ id: "g_bash", name: "Удар щитом", lvl: 10, mp: 14, cd: 7, icon: ["⛉", "#8090c0"], desc: "Оглушает врагов перед собой на 2 с.", cast: "melee", range: 70, arc: 100, mul: 1.4, status: ["stun", 2] }),
          A({ id: "g_bulwark", name: "Бастион", lvl: 13, mp: 20, cd: 22, icon: ["▣", "#a0b0d0"], desc: "Щит, поглощающий 30% здоровья, на 8 с.", cast: "shield", pct: 30, dur: 8 }),
          A({ id: "g_taunt", name: "Вызов", lvl: 16, mp: 16, cd: 16, icon: ["⚑", "#c0a040"], desc: "Притягивает внимание врагов и делает их уязвимыми.", cast: "aoe", at: "self", radius: 200, mul: 0.5, status: ["weaken", 6], color: "#c0a040" }),
          P({ id: "g_block", name: "Мастер щита", lvl: 11, icon: ["⛊", "#8090b0"], desc: "+3% шанса заблокировать удар за ранг.", per: { block: 3 } }),
          P({ id: "g_spikes", name: "Шипы", lvl: 14, icon: ["✶", "#909090"], desc: "+4% урона возвращается атакующему за ранг.", per: { thorns: 4 } }),
          P({ id: "g_wall", name: "Непоколебимость", lvl: 18, icon: ["⛫", "#7080a0"], desc: "+8% здоровья за ранг.", per: { hpPct: 8 } }),
        ] },
      blademaster: { name: "Мастер клинка", desc: "Быстрые точные выпады и критические удары.", colors: { main: "#4a4a52", trim: "#8a7040" }, offhand: null,
        skills: [
          A({ id: "m_flurry", name: "Шквал выпадов", lvl: 10, mp: 16, cd: 6, icon: ["≋", "#d0d0e0"], desc: "Три стремительных удара подряд.", cast: "melee", range: 75, arc: 80, mul: 0.9, hits: 3 }),
          A({ id: "m_step", name: "Теневой шаг", lvl: 13, mp: 14, cd: 9, icon: ["↯", "#a0a0c0"], desc: "Мгновенный рывок с ударом сквозь врагов.", cast: "dash", dist: 170, mul: 1.8 }),
          A({ id: "m_focus", name: "Сосредоточение", lvl: 16, mp: 18, cd: 24, icon: ["◎", "#e0c060"], desc: "+30% шанса крита на 8 с.", cast: "buff", dur: 8, stats: { crit: 30 } }),
          P({ id: "m_precise", name: "Точность", lvl: 11, icon: ["⌖", "#e0e0a0"], desc: "+2% шанса крита за ранг.", per: { crit: 2 } }),
          P({ id: "m_dance", name: "Танец клинков", lvl: 14, icon: ["✧", "#c0c0e0"], desc: "+2% уклонения и +3% скорости атаки за ранг.", per: { dodge: 2, aspd: 3 } }),
          P({ id: "m_bleed", name: "Глубокие раны", lvl: 18, icon: ["♦", "#c02020"], desc: "+5% шанса вызвать кровотечение за ранг.", per: { bleedChance: 5 } }),
        ] },
    },
  },

  ranger: {
    name: "Следопыт", desc: "Лучник и охотник. Бьёт издалека, ставит ловушки, держит дистанцию.",
    weapon: "bow", offhand: null, armor: "leather", colors: { main: "#3e4a2e", trim: "#2a2014" }, castColor: "#a0e070",
    base: { str: 4, dex: 9, int: 3, vit: 5 }, grow: { str: 1, dex: 2, int: 1, vit: 1 },
    attack: { type: "proj", range: 360, mul: 1, dmgType: "phys", speed: 1.0, proj: "arrow", pspeed: 620 },
    skills: [
      A({ id: "r_power", name: "Прицельный выстрел", lvl: 1, mp: 8, cd: 4, icon: ["➹", "#d0c080"], desc: "Мощная стрела, пробивающая врагов.", cast: "proj", proj: "arrow", speed: 820, range: 480, mul: 2.0, pierce: 3 }),
      A({ id: "r_multi", name: "Веер стрел", lvl: 3, mp: 12, cd: 7, icon: ["⋔", "#c0d080"], desc: "Пять стрел веером.", cast: "proj", proj: "arrow", speed: 640, range: 360, mul: 0.9, count: 5, spread: 40 }),
      A({ id: "r_roll", name: "Перекат", lvl: 5, mp: 8, cd: 6, icon: ["↶", "#a0a090"], desc: "Отскок назад от врагов.", cast: "dash", dist: 150, mul: 0, back: true }),
      A({ id: "r_trap", name: "Капкан", lvl: 8, mp: 14, cd: 12, icon: ["⊛", "#a08060"], desc: "Ловушка: урон и обездвиживание.", cast: "trap", radius: 50, mul: 2.4, status: ["stun", 2.5], dur: 20 }),
      P({ id: "r_eagle", name: "Орлиный глаз", lvl: 2, icon: ["◉", "#d0c060"], desc: "+2% шанса крита за ранг.", per: { crit: 2 } }),
      P({ id: "r_light", name: "Лёгкая поступь", lvl: 4, icon: ["≫", "#90b080"], desc: "+3% скорости бега и +1% уклонения за ранг.", per: { move: 3, dodge: 1 } }),
      P({ id: "r_quick", name: "Быстрые руки", lvl: 7, icon: ["⇶", "#c0b070"], desc: "+4% скорости атаки за ранг.", per: { aspd: 4 } }),
    ],
    subclasses: {
      sniper: { name: "Снайпер", desc: "Убийственная точность на огромной дистанции.", colors: { main: "#3a3e34", trim: "#5a4a2a" },
        skills: [
          A({ id: "s_heart", name: "Выстрел в сердце", lvl: 10, mp: 22, cd: 12, icon: ["✛", "#ff6050"], desc: "Медленная стрела огромной силы.", cast: "proj", proj: "bolt", speed: 1100, range: 620, mul: 4.5, pierce: 5 }),
          A({ id: "s_mark", name: "Метка охотника", lvl: 13, mp: 12, cd: 14, icon: ["⊕", "#e0a040"], desc: "Враги в области становятся уязвимы.", cast: "aoe", at: "target", radius: 110, mul: 0.3, status: ["weaken", 8], color: "#e0a040" }),
          A({ id: "s_rain", name: "Ливень стрел", lvl: 16, mp: 28, cd: 16, icon: ["☔", "#c0c0a0"], desc: "Град стрел по области 2 секунды.", cast: "aoe", at: "target", radius: 120, mul: 0.7, ticks: 6, interval: 0.33, color: "#c0c0a0" }),
          P({ id: "s_far", name: "Дальнобойность", lvl: 11, icon: ["↦", "#c0c080"], desc: "+4% урона за ранг.", per: { dmg: 4 } }),
          P({ id: "s_crit", name: "Смертельный выстрел", lvl: 14, icon: ["☄", "#ff8060"], desc: "+8% урона крита за ранг.", per: { critDmg: 8 } }),
          P({ id: "s_calm", name: "Хладнокровие", lvl: 18, icon: ["❄", "#a0c0e0"], desc: "+3% сокращения перезарядки за ранг.", per: { cdr: 3 } }),
        ] },
      beastmaster: { name: "Зверолов", desc: "Сражается вместе с призванным волком, ставит ловушки.", colors: { main: "#4a3a26", trim: "#6a5a3a" },
        skills: [
          A({ id: "z_wolf", name: "Зов стаи", lvl: 10, mp: 25, cd: 30, icon: ["🐺", "#a0a0a0"], desc: "Призывает двух волков на 25 с.", cast: "summon", mob: "pet_wolf", count: 2, dur: 25 }),
          A({ id: "z_net", name: "Сеть", lvl: 13, mp: 12, cd: 10, icon: ["#", "#c0b090"], desc: "Сеть обездвиживает врагов в области.", cast: "aoe", at: "target", radius: 90, mul: 0.4, status: ["stun", 2], color: "#c0b090" }),
          A({ id: "z_poison", name: "Ядовитая стрела", lvl: 16, mp: 16, cd: 8, icon: ["☣", "#80d040"], desc: "Отравляет цель и всех рядом.", cast: "proj", proj: "arrow", speed: 640, range: 400, mul: 1.2, aoe: 80, status: ["poison", 6] }),
          P({ id: "z_bond", name: "Связь со зверем", lvl: 11, icon: ["♞", "#b09070"], desc: "+10% силы призванных за ранг.", per: { summon: 10 } }),
          P({ id: "z_hunter", name: "Охотник", lvl: 14, icon: ["⚘", "#80a060"], desc: "+4% урона эффектов и +2% урона за ранг.", per: { dot: 4, dmg: 2 } }),
          P({ id: "z_skin", name: "Шкура зверя", lvl: 18, icon: ["⛨", "#806040"], desc: "+5% здоровья за ранг.", per: { hpPct: 5 } }),
        ] },
      windwalker: { name: "Странник ветра", desc: "Подвижный стрелок: перекаты, серии выстрелов, ветер.", colors: { main: "#3a4a52", trim: "#6a8a9a" },
        skills: [
          A({ id: "ww_gale", name: "Порыв", lvl: 10, mp: 16, cd: 8, icon: ["≈", "#a0d0e0"], desc: "Волна ветра отбрасывает и ранит врагов.", cast: "proj", proj: "wind", speed: 520, range: 340, mul: 1.6, pierce: 99, kb: 80 }),
          A({ id: "ww_volley", name: "Шквальный огонь", lvl: 13, mp: 20, cd: 10, icon: ["⫸", "#c0e0f0"], desc: "Серия из 6 быстрых стрел.", cast: "proj", proj: "arrow", speed: 760, range: 380, mul: 0.75, count: 6, burst: 0.08 }),
          A({ id: "ww_haste", name: "Попутный ветер", lvl: 16, mp: 14, cd: 20, icon: ["➳", "#80c0e0"], desc: "+40% скорости бега и +20% атаки на 8 с.", cast: "buff", dur: 8, stats: { move: 40, aspd: 20 } }),
          P({ id: "ww_flow", name: "Поток", lvl: 11, icon: ["∿", "#90c0d0"], desc: "+3% уклонения за ранг.", per: { dodge: 3 } }),
          P({ id: "ww_swift", name: "Стремительность", lvl: 14, icon: ["≫", "#a0d0f0"], desc: "+5% скорости атаки за ранг.", per: { aspd: 5 } }),
          P({ id: "ww_breath", name: "Дыхание ветра", lvl: 18, icon: ["☁", "#c0d0e0"], desc: "+0.5 восст. маны за ранг.", per: { mpRegen: 0.5 } }),
        ] },
    },
  },

  rogue: {
    name: "Разбойник", desc: "Два кинжала, скорость и критические удары. Хрупкий, но смертоносный.",
    weapon: "dagger", offhand: "dagger", armor: "leather", colors: { main: "#2e2a2c", trim: "#5a2a2a" }, castColor: "#c060ff",
    base: { str: 5, dex: 9, int: 3, vit: 4 }, grow: { str: 1, dex: 2, int: 0, vit: 1 },
    attack: { type: "melee", range: 52, arc: 80, mul: 0.75, dmgType: "phys", speed: 1.6 },
    skills: [
      A({ id: "g_backstab", name: "Удар в спину", lvl: 1, mp: 8, cd: 4, icon: ["†", "#c0c0c0"], desc: "Точный удар с высоким шансом крита.", cast: "melee", range: 60, arc: 60, mul: 2.2, critBonus: 40 }),
      A({ id: "g_dash", name: "Тень", lvl: 3, mp: 10, cd: 7, icon: ["↠", "#9070c0"], desc: "Рывок сквозь врагов с порезами.", cast: "dash", dist: 170, mul: 1.0, status: ["bleed", 4] }),
      A({ id: "g_fan", name: "Веер ножей", lvl: 5, mp: 14, cd: 8, icon: ["✴", "#b0b0c0"], desc: "Метает 8 ножей во все стороны.", cast: "proj", proj: "knife", speed: 600, range: 260, mul: 0.9, count: 8, spread: 360 }),
      A({ id: "g_smoke", name: "Дымовая завеса", lvl: 8, mp: 16, cd: 18, icon: ["☁", "#808080"], desc: "Ослепляет врагов вокруг и даёт +40% уклонения на 5 с.", cast: "buff", dur: 5, stats: { dodge: 40 }, aoeStatus: ["stun", 1.5], radius: 120 }),
      P({ id: "g_lethal", name: "Смертоносность", lvl: 2, icon: ["✝", "#d0d0d0"], desc: "+2.5% шанса крита за ранг.", per: { crit: 2.5 } }),
      P({ id: "g_agile", name: "Проворство", lvl: 4, icon: ["≻", "#a090c0"], desc: "+2% уклонения и +2% скорости бега за ранг.", per: { dodge: 2, move: 2 } }),
      P({ id: "g_twin", name: "Парные клинки", lvl: 7, icon: ["⚔", "#c0a0a0"], desc: "+4% скорости атаки за ранг.", per: { aspd: 4 } }),
    ],
    subclasses: {
      assassin: { name: "Убийца", desc: "Мгновенные убийства одной серией. Крит — его религия.", colors: { main: "#1e1c1e", trim: "#6a1a1a" },
        skills: [
          A({ id: "as_mark", name: "Метка смерти", lvl: 10, mp: 18, cd: 14, icon: ["☩", "#c01010"], desc: "Мощный удар, после которого цель уязвима.", cast: "melee", range: 60, arc: 60, mul: 2.6, status: ["weaken", 6] }),
          A({ id: "as_blink", name: "Шаг сквозь тень", lvl: 13, mp: 14, cd: 8, icon: ["⇝", "#8060c0"], desc: "Телепорт за спину ближайшего врага и удар.", cast: "blink", range: 300, mul: 2.0 }),
          A({ id: "as_frenzy", name: "Кровавая серия", lvl: 16, mp: 24, cd: 15, icon: ["✖", "#e02020"], desc: "Пять ударов подряд.", cast: "melee", range: 62, arc: 90, mul: 0.85, hits: 5 }),
          P({ id: "as_cruel", name: "Жестокость", lvl: 11, icon: ["☠", "#a02020"], desc: "+10% урона крита за ранг.", per: { critDmg: 10 } }),
          P({ id: "as_shadow", name: "Тень", lvl: 14, icon: ["◐", "#605080"], desc: "+3% уклонения за ранг.", per: { dodge: 3 } }),
          P({ id: "as_kill", name: "Добивание", lvl: 18, icon: ["⚰", "#802020"], desc: "До +6% урона за ранг по раненым врагам.", per: { executeDmg: 6 } }),
        ] },
      poisoner: { name: "Отравитель", desc: "Яды, газ и медленная смерть врагов.", colors: { main: "#2a3424", trim: "#5a7a2a" },
        skills: [
          A({ id: "po_cloud", name: "Ядовитое облако", lvl: 10, mp: 20, cd: 12, icon: ["☁", "#80c030"], desc: "Облако яда на 4 с.", cast: "aoe", at: "target", radius: 110, mul: 0.4, ticks: 8, interval: 0.5, status: ["poison", 4], color: "#80c030" }),
          A({ id: "po_vial", name: "Склянка", lvl: 13, mp: 14, cd: 7, icon: ["⚗", "#a0e040"], desc: "Бросок склянки — взрыв яда.", cast: "proj", proj: "vial", speed: 480, range: 320, mul: 1.6, aoe: 90, status: ["poison", 6] }),
          A({ id: "po_blades", name: "Отравленные клинки", lvl: 16, mp: 16, cd: 22, icon: ["⚔", "#60a020"], desc: "Каждый удар отравляет, +20% урона, 10 с.", cast: "buff", dur: 10, stats: { dmg: 20 }, onHit: ["poison", 4] }),
          P({ id: "po_toxin", name: "Токсины", lvl: 11, icon: ["☣", "#70b030"], desc: "+8% урона ядов за ранг.", per: { dot: 8 } }),
          P({ id: "po_immune", name: "Иммунитет", lvl: 14, icon: ["✚", "#60a060"], desc: "+5% здоровья за ранг.", per: { hpPct: 5 } }),
          P({ id: "po_venom", name: "Ядовитые клинки", lvl: 18, icon: ["♠", "#90c040"], desc: "+5% шанса отравить ударом за ранг.", per: { poisonChance: 5 } }),
        ] },
      shadowblade: { name: "Клинок теней", desc: "Магия тьмы и клинки: телепорты, клоны, тёмные взрывы.", colors: { main: "#241e30", trim: "#5a3a8a" },
        skills: [
          A({ id: "sh_nova", name: "Тёмный всплеск", lvl: 10, mp: 18, cd: 9, icon: ["✸", "#8050d0"], desc: "Взрыв тьмы вокруг себя.", cast: "aoe", at: "self", radius: 120, mul: 2.0, dmgType: "magic", status: ["slow", 2], color: "#8050d0" }),
          A({ id: "sh_clone", name: "Двойник", lvl: 13, mp: 22, cd: 28, icon: ["♊", "#9070e0"], desc: "Призывает теневого двойника на 15 с.", cast: "summon", mob: "pet_shade", count: 1, dur: 15 }),
          A({ id: "sh_bolt", name: "Теневой клинок", lvl: 16, mp: 16, cd: 6, icon: ["➤", "#a080ff"], desc: "Летящий клинок тьмы, пробивающий всех.", cast: "proj", proj: "shadow", speed: 700, range: 420, mul: 2.2, pierce: 99, dmgType: "magic" }),
          P({ id: "sh_veil", name: "Покров", lvl: 11, icon: ["◑", "#7050a0"], desc: "+3% урона и +1% уклонения за ранг.", per: { dmg: 3, dodge: 1 } }),
          P({ id: "sh_mind", name: "Тёмный разум", lvl: 14, icon: ["✦", "#8060c0"], desc: "+4% маг. атаки и +3 маны за ранг.", per: { matkPct: 4, mp: 3 } }),
          P({ id: "sh_quick", name: "Мгновенность", lvl: 18, icon: ["⌁", "#a090e0"], desc: "+3% сокращения перезарядки за ранг.", per: { cdr: 3 } }),
        ] },
    },
  },

  mage: {
    name: "Маг", desc: "Повелитель стихий. Разрушительная магия по площади, но слабая защита.",
    weapon: "staff", offhand: null, armor: "cloth", colors: { main: "#2a2a4a", trim: "#8a7040" }, castColor: "#7090ff", weaponColor: "#7aa0ff",
    base: { str: 2, dex: 4, int: 10, vit: 4 }, grow: { str: 0, dex: 1, int: 3, vit: 1 },
    attack: { type: "proj", range: 340, mul: 1, dmgType: "magic", speed: 0.9, proj: "orb", pspeed: 480 },
    skills: [
      A({ id: "m_fireball", name: "Огненный шар", lvl: 1, mp: 10, cd: 3, icon: ["☀", "#ff7020"], desc: "Взрывается при попадании.", cast: "proj", proj: "fire", speed: 520, range: 400, mul: 1.9, aoe: 70, status: ["burn", 3], dmgType: "magic" }),
      A({ id: "m_frost", name: "Ледяная стрела", lvl: 3, mp: 10, cd: 5, icon: ["❄", "#80d0ff"], desc: "Замедляет цель.", cast: "proj", proj: "ice", speed: 600, range: 420, mul: 1.6, status: ["slow", 3], dmgType: "magic" }),
      A({ id: "m_blink", name: "Скачок", lvl: 5, mp: 12, cd: 8, icon: ["✧", "#b0a0ff"], desc: "Телепорт вперёд по направлению взгляда.", cast: "dash", dist: 200, mul: 0, teleport: true }),
      A({ id: "m_nova", name: "Ледяная волна", lvl: 8, mp: 24, cd: 12, icon: ["✱", "#a0e0ff"], desc: "Замораживает врагов вокруг.", cast: "aoe", at: "self", radius: 140, mul: 1.6, status: ["freeze", 2], dmgType: "magic", color: "#a0e0ff" }),
      P({ id: "m_arcane", name: "Тайное знание", lvl: 2, icon: ["✡", "#9080ff"], desc: "+5% маг. атаки за ранг.", per: { matkPct: 5 } }),
      P({ id: "m_well", name: "Источник маны", lvl: 4, icon: ["◈", "#6080ff"], desc: "+6% маны и +0.4 восст. маны за ранг.", per: { mpPct: 6, mpRegen: 0.4 } }),
      P({ id: "m_focus", name: "Концентрация", lvl: 7, icon: ["◎", "#a0a0ff"], desc: "+2% сокращения перезарядки за ранг.", per: { cdr: 2 } }),
    ],
    subclasses: {
      pyromancer: { name: "Пиромант", desc: "Пламя, взрывы и горящие поля.", colors: { main: "#4a1e18", trim: "#c07020" }, weaponColor: "#ff7a30", castColor: "#ff7a30",
        skills: [
          A({ id: "py_meteor", name: "Метеор", lvl: 10, mp: 30, cd: 14, icon: ["☄", "#ff5010"], desc: "Метеор падает через секунду, огромный урон.", cast: "aoe", at: "target", radius: 120, mul: 4.0, delay: 0.9, status: ["burn", 4], dmgType: "magic", color: "#ff5010" }),
          A({ id: "py_wall", name: "Огненная земля", lvl: 13, mp: 22, cd: 12, icon: ["♨", "#ff8030"], desc: "Пламя под врагами 4 с.", cast: "aoe", at: "target", radius: 100, mul: 0.5, ticks: 8, interval: 0.5, status: ["burn", 2], dmgType: "magic", color: "#ff8030" }),
          A({ id: "py_breath", name: "Дыхание дракона", lvl: 16, mp: 20, cd: 8, icon: ["≋", "#ff9040"], desc: "Конус пламени перед собой.", cast: "melee", range: 150, arc: 70, mul: 2.4, status: ["burn", 3], dmgType: "magic", fx: "fire" }),
          P({ id: "py_heat", name: "Жар", lvl: 11, icon: ["♁", "#ff6020"], desc: "+5% урона горения за ранг и +2% урона.", per: { dot: 5, dmg: 2 } }),
          P({ id: "py_ignite", name: "Воспламенение", lvl: 14, icon: ["✹", "#ffa040"], desc: "+5% шанса поджечь любым ударом за ранг.", per: { burnChance: 5 } }),
          P({ id: "py_fury", name: "Огненная ярость", lvl: 18, icon: ["♆", "#ff3010"], desc: "+6% урона крита и +1% крита за ранг.", per: { critDmg: 6, crit: 1 } }),
        ] },
      cryomancer: { name: "Криомант", desc: "Лёд и холод: контроль, заморозка, ледяные щиты.", colors: { main: "#1e2e44", trim: "#a0c0e0" }, weaponColor: "#a0e0ff", castColor: "#a0e0ff",
        skills: [
          A({ id: "cr_storm", name: "Вьюга", lvl: 10, mp: 26, cd: 14, icon: ["❅", "#c0f0ff"], desc: "Ледяная буря 3 с, сильно замедляет.", cast: "aoe", at: "target", radius: 140, mul: 0.6, ticks: 6, interval: 0.5, status: ["slow", 2], dmgType: "magic", color: "#c0f0ff" }),
          A({ id: "cr_armor", name: "Ледяной доспех", lvl: 13, mp: 18, cd: 24, icon: ["⛉", "#a0d0f0"], desc: "Щит в 25% здоровья и +20 защиты.", cast: "shield", pct: 25, dur: 10, stats: { def: 20 } }),
          A({ id: "cr_lance", name: "Ледяное копьё", lvl: 16, mp: 20, cd: 8, icon: ["➶", "#80e0ff"], desc: "Пронзает всех на пути и замораживает.", cast: "proj", proj: "ice", speed: 760, range: 460, mul: 2.6, pierce: 99, status: ["freeze", 1.5], dmgType: "magic" }),
          P({ id: "cr_cold", name: "Вечный холод", lvl: 11, icon: ["❄", "#a0d0ff"], desc: "+4% урона за ранг.", per: { dmg: 4 } }),
          P({ id: "cr_shatter", name: "Раскол", lvl: 14, icon: ["✲", "#c0e0ff"], desc: "+8% урона крита за ранг.", per: { critDmg: 8 } }),
          P({ id: "cr_ice", name: "Ледяная кровь", lvl: 18, icon: ["♢", "#80c0e0"], desc: "+5% защиты и +3% здоровья за ранг.", per: { defPct: 5, hpPct: 3 } }),
        ] },
      stormcaller: { name: "Повелитель бурь", desc: "Молнии, скачущие между врагами, и гром.", colors: { main: "#24243a", trim: "#d0c060" }, weaponColor: "#f0f080", castColor: "#f0f080",
        skills: [
          A({ id: "st_chain", name: "Цепная молния", lvl: 10, mp: 18, cd: 5, icon: ["ϟ", "#f0f060"], desc: "Перескакивает на 5 врагов.", cast: "chain", jumps: 5, range: 360, mul: 1.6, dmgType: "magic" }),
          A({ id: "st_thunder", name: "Раскат грома", lvl: 13, mp: 22, cd: 11, icon: ["☇", "#e0e0a0"], desc: "Удар грома оглушает в области.", cast: "aoe", at: "target", radius: 110, mul: 2.2, status: ["stun", 1.5], dmgType: "magic", color: "#f0f080" }),
          A({ id: "st_storm", name: "Гроза", lvl: 16, mp: 32, cd: 20, icon: ["☈", "#d0d0ff"], desc: "6 молний бьют по врагам вокруг.", cast: "aoe", at: "self", radius: 230, mul: 1.1, ticks: 6, interval: 0.35, dmgType: "magic", color: "#f0f080", strikes: true }),
          P({ id: "st_charge", name: "Заряд", lvl: 11, icon: ["⌁", "#f0f080"], desc: "+4% маг. атаки и +2% скорости атаки за ранг.", per: { matkPct: 4, aspd: 2 } }),
          P({ id: "st_static", name: "Статика", lvl: 14, icon: ["✺", "#e0e070"], desc: "+2% крита за ранг.", per: { crit: 2 } }),
          P({ id: "st_flow", name: "Ток", lvl: 18, icon: ["∿", "#c0c0ff"], desc: "+0.6 восст. маны за ранг.", per: { mpRegen: 0.6 } }),
        ] },
    },
  },

  cleric: {
    name: "Жрец", desc: "Воин веры с булавой. Лечит себя, крепок в бою, бьёт светом.",
    weapon: "mace", offhand: "shield", armor: "plate", colors: { main: "#6a6458", trim: "#c0a050" }, castColor: "#fff0a0", weaponColor: "#b0a080",
    base: { str: 6, dex: 3, int: 7, vit: 6 }, grow: { str: 1, dex: 0, int: 2, vit: 2 },
    attack: { type: "melee", range: 58, arc: 100, mul: 1, dmgType: "phys", speed: 0.95 },
    skills: [
      A({ id: "c_smite", name: "Кара", lvl: 1, mp: 10, cd: 4, icon: ["✝", "#fff0a0"], desc: "Удар светом по области перед собой.", cast: "aoe", at: "front", radius: 70, mul: 1.8, dmgType: "magic", color: "#fff0a0" }),
      A({ id: "c_heal", name: "Исцеление", lvl: 3, mp: 18, cd: 8, icon: ["✚", "#80ff90"], desc: "Восстанавливает 25% здоровья.", cast: "heal", pct: 25 }),
      A({ id: "c_bless", name: "Благословение", lvl: 5, mp: 16, cd: 22, icon: ["☼", "#ffe080"], desc: "+20% урона и восстановление здоровья, 10 с.", cast: "buff", dur: 10, stats: { dmg: 20, hpRegen: 6 } }),
      A({ id: "c_hammer", name: "Молот света", lvl: 8, mp: 22, cd: 10, icon: ["⚒", "#ffe0a0"], desc: "Небесный молот оглушает врагов.", cast: "aoe", at: "target", radius: 90, mul: 2.4, delay: 0.4, status: ["stun", 1.5], dmgType: "magic", color: "#ffe0a0" }),
      P({ id: "c_faith", name: "Вера", lvl: 2, icon: ["☦", "#f0e0a0"], desc: "+6% силы лечения и +3% маг. атаки за ранг.", per: { heal: 6, matkPct: 3 } }),
      P({ id: "c_armor", name: "Священная броня", lvl: 4, icon: ["⛨", "#c0b080"], desc: "+5% защиты за ранг.", per: { defPct: 5 } }),
      P({ id: "c_grace", name: "Благодать", lvl: 7, icon: ["❀", "#a0f0a0"], desc: "+0.4 восст. здоровья и маны за ранг.", per: { hpRegen: 0.4, mpRegen: 0.4 } }),
    ],
    subclasses: {
      inquisitor: { name: "Инквизитор", desc: "Карающий меч веры: огонь и свет против нечисти.", colors: { main: "#5a2a24", trim: "#d0a040" },
        skills: [
          A({ id: "in_purge", name: "Очищение огнём", lvl: 10, mp: 22, cd: 10, icon: ["♨", "#ffb040"], desc: "Священное пламя вокруг себя.", cast: "aoe", at: "self", radius: 130, mul: 2.2, status: ["burn", 3], dmgType: "magic", color: "#ffb040" }),
          A({ id: "in_verdict", name: "Приговор", lvl: 13, mp: 18, cd: 8, icon: ["⚖", "#ffe060"], desc: "Мощный удар, против нежити вдвое сильнее.", cast: "melee", range: 70, arc: 80, mul: 2.8, holy: true }),
          A({ id: "in_zeal", name: "Рвение", lvl: 16, mp: 16, cd: 20, icon: ["☀", "#ff9020"], desc: "+30% скорости атаки и +15% урона, 8 с.", cast: "buff", dur: 8, stats: { aspd: 30, dmg: 15 } }),
          P({ id: "in_hunt", name: "Охота на ведьм", lvl: 11, icon: ["☩", "#c08030"], desc: "+4% урона за ранг.", per: { dmg: 4 } }),
          P({ id: "in_steel", name: "Стальная вера", lvl: 14, icon: ["⛊", "#a09070"], desc: "+4% здоровья и +3% защиты за ранг.", per: { hpPct: 4, defPct: 3 } }),
          P({ id: "in_crit", name: "Божий гнев", lvl: 18, icon: ["ϟ", "#ffd040"], desc: "+2% крита за ранг.", per: { crit: 2 } }),
        ] },
      healer: { name: "Целитель", desc: "Неубиваемый: мощное лечение и восстановление.", colors: { main: "#d0c8b0", trim: "#5a8a5a" },
        skills: [
          A({ id: "he_renew", name: "Обновление", lvl: 10, mp: 20, cd: 14, icon: ["❁", "#90ffa0"], desc: "Лечит 40% здоровья за 8 с.", cast: "heal", pct: 0, hot: 40, dur: 8 }),
          A({ id: "he_sanct", name: "Святилище", lvl: 13, mp: 26, cd: 24, icon: ["◯", "#c0ffc0"], desc: "Круг: лечит вас и жжёт врагов 6 с.", cast: "aoe", at: "self", radius: 130, mul: 0.5, ticks: 12, interval: 0.5, healPct: 2, dmgType: "magic", color: "#c0ffc0", follow: true }),
          A({ id: "he_aegis", name: "Эгида", lvl: 16, mp: 22, cd: 26, icon: ["⛉", "#f0f0c0"], desc: "Щит в 40% здоровья на 6 с.", cast: "shield", pct: 40, dur: 6 }),
          P({ id: "he_power", name: "Сила света", lvl: 11, icon: ["✺", "#a0ffa0"], desc: "+10% силы лечения за ранг.", per: { heal: 10 } }),
          P({ id: "he_life", name: "Жизнь", lvl: 14, icon: ["♥", "#80e080"], desc: "+6% здоровья за ранг.", per: { hpPct: 6 } }),
          P({ id: "he_calm", name: "Безмятежность", lvl: 18, icon: ["☯", "#c0e0c0"], desc: "+1 восст. здоровья в секунду за ранг.", per: { hpRegen: 1 } }),
        ] },
      oracle: { name: "Оракул", desc: "Пророк: призывает духов-стражей и обрушивает кары небес.", colors: { main: "#2a3a5a", trim: "#d0c080" }, weaponColor: "#c0d0ff", castColor: "#c0d0ff",
        skills: [
          A({ id: "or_spirit", name: "Дух-хранитель", lvl: 10, mp: 26, cd: 30, icon: ["☥", "#c0d0ff"], desc: "Призывает светлого духа на 20 с.", cast: "summon", mob: "pet_spirit", count: 1, dur: 20 }),
          A({ id: "or_rays", name: "Лучи небес", lvl: 13, mp: 22, cd: 9, icon: ["✶", "#e0e0ff"], desc: "Пять лучей света веером.", cast: "proj", proj: "holy", speed: 640, range: 380, mul: 1.1, count: 5, spread: 50, dmgType: "magic" }),
          A({ id: "or_judg", name: "Последний суд", lvl: 16, mp: 34, cd: 22, icon: ["☉", "#ffffff"], desc: "Колонна света: огромный урон через 1 с.", cast: "aoe", at: "target", radius: 150, mul: 4.2, delay: 1.0, dmgType: "magic", color: "#ffffe0" }),
          P({ id: "or_vision", name: "Прозрение", lvl: 11, icon: ["◉", "#c0c0ff"], desc: "+3% крита за ранг.", per: { crit: 3 } }),
          P({ id: "or_comm", name: "Общение с духами", lvl: 14, icon: ["☥", "#a0b0ff"], desc: "+12% силы призванных за ранг.", per: { summon: 12 } }),
          P({ id: "or_star", name: "Звезда", lvl: 18, icon: ["★", "#e0e0a0"], desc: "+5% маг. атаки за ранг.", per: { matkPct: 5 } }),
        ] },
    },
  },

  warlock: {
    name: "Чернокнижник", desc: "Тёмная магия: проклятия, похищение жизни и слуги из мира мёртвых.",
    weapon: "scythe", offhand: null, armor: "cloth", colors: { main: "#241a24", trim: "#6a2a4a" }, castColor: "#a040c0", weaponColor: "#8a8a9a",
    base: { str: 3, dex: 4, int: 9, vit: 5 }, grow: { str: 0, dex: 1, int: 3, vit: 1 },
    attack: { type: "proj", range: 320, mul: 1, dmgType: "magic", speed: 0.9, proj: "dark", pspeed: 460 },
    skills: [
      A({ id: "k_drain", name: "Похищение жизни", lvl: 1, mp: 10, cd: 4, icon: ["♥", "#a02040"], desc: "Тёмный снаряд, лечит на 40% урона.", cast: "proj", proj: "dark", speed: 520, range: 380, mul: 1.7, drain: 40, dmgType: "magic" }),
      A({ id: "k_curse", name: "Проклятие агонии", lvl: 3, mp: 12, cd: 7, icon: ["☾", "#8040a0"], desc: "Проклинает врагов в области: урон со временем.", cast: "aoe", at: "target", radius: 100, mul: 0.3, status: ["curse", 6], dmgType: "magic", color: "#8040a0" }),
      A({ id: "k_skel", name: "Поднять мертвеца", lvl: 5, mp: 22, cd: 25, icon: ["☠", "#d0d0b0"], desc: "Поднимает скелета-слугу на 30 с.", cast: "summon", mob: "pet_skeleton", count: 1, dur: 30 }),
      A({ id: "k_fear", name: "Ужас", lvl: 8, mp: 18, cd: 16, icon: ["☹", "#604080"], desc: "Враги вокруг в страхе бегут 3 с.", cast: "aoe", at: "self", radius: 150, mul: 0.6, status: ["fear", 3], dmgType: "magic", color: "#604080" }),
      P({ id: "k_dark", name: "Тёмный дар", lvl: 2, icon: ["☽", "#9040b0"], desc: "+5% маг. атаки за ранг.", per: { matkPct: 5 } }),
      P({ id: "k_pact", name: "Договор", lvl: 4, icon: ["⚶", "#a02040"], desc: "+1.5% вампиризма за ранг.", per: { lifesteal: 1.5 } }),
      P({ id: "k_rot", name: "Тлен", lvl: 7, icon: ["☣", "#608040"], desc: "+6% урона эффектов за ранг.", per: { dot: 6 } }),
    ],
    subclasses: {
      necromancer: { name: "Некромант", desc: "Армия мёртвых сражается за него.", colors: { main: "#1a1e1a", trim: "#6a8a5a" }, weaponColor: "#a0e0a0", castColor: "#80ff90",
        skills: [
          A({ id: "ne_army", name: "Армия костей", lvl: 10, mp: 34, cd: 35, icon: ["☠", "#c0e0b0"], desc: "Поднимает трёх скелетов на 25 с.", cast: "summon", mob: "pet_skeleton", count: 3, dur: 25 }),
          A({ id: "ne_explode", name: "Взрыв трупа", lvl: 13, mp: 18, cd: 8, icon: ["✹", "#90c070"], desc: "Взрыв некротической энергии в точке.", cast: "aoe", at: "target", radius: 110, mul: 2.6, dmgType: "magic", color: "#90c070" }),
          A({ id: "ne_golem", name: "Костяной голем", lvl: 16, mp: 40, cd: 45, icon: ["♜", "#d0d0c0"], desc: "Призывает голема на 30 с.", cast: "summon", mob: "pet_golem", count: 1, dur: 30 }),
          P({ id: "ne_master", name: "Владыка мёртвых", lvl: 11, icon: ["♛", "#a0c090"], desc: "+12% силы призванных за ранг.", per: { summon: 12 } }),
          P({ id: "ne_bone", name: "Костяная броня", lvl: 14, icon: ["⛨", "#c0c0b0"], desc: "+6% защиты за ранг.", per: { defPct: 6 } }),
          P({ id: "ne_souls", name: "Жатва душ", lvl: 18, icon: ["☾", "#80c080"], desc: "+0.6 восст. маны за ранг.", per: { mpRegen: 0.6 } }),
        ] },
      hexer: { name: "Проклинатель", desc: "Проклятия, гниение и медленная мучительная смерть.", colors: { main: "#2a1a30", trim: "#8a3aa0" }, weaponColor: "#c060ff", castColor: "#c060ff",
        skills: [
          A({ id: "hx_plague", name: "Мор", lvl: 10, mp: 24, cd: 12, icon: ["☣", "#a0c040"], desc: "Яд и проклятие на всех врагов вокруг.", cast: "aoe", at: "self", radius: 170, mul: 0.4, status: ["poison", 6], status2: ["curse", 6], dmgType: "magic", color: "#a0c040" }),
          A({ id: "hx_weak", name: "Порча", lvl: 13, mp: 16, cd: 10, icon: ["✖", "#c060ff"], desc: "Враги в области получают на 20% больше урона.", cast: "aoe", at: "target", radius: 120, mul: 0.5, status: ["weaken", 8], dmgType: "magic", color: "#c060ff" }),
          A({ id: "hx_doom", name: "Рок", lvl: 16, mp: 28, cd: 14, icon: ["☄", "#7020a0"], desc: "Медленная сфера тьмы с огромным уроном.", cast: "proj", proj: "doom", speed: 260, range: 420, mul: 4.0, aoe: 110, dmgType: "magic" }),
          P({ id: "hx_malice", name: "Злоба", lvl: 11, icon: ["☾", "#a040c0"], desc: "+8% урона эффектов за ранг.", per: { dot: 8 } }),
          P({ id: "hx_long", name: "Долгое проклятие", lvl: 14, icon: ["∞", "#8030a0"], desc: "+4% урона за ранг.", per: { dmg: 4 } }),
          P({ id: "hx_soul", name: "Похититель душ", lvl: 18, icon: ["♥", "#a02060"], desc: "+1% вампиризма за ранг.", per: { lifesteal: 1 } }),
        ] },
      bloodmage: { name: "Кровавый маг", desc: "Платит здоровьем за чудовищную силу и пьёт кровь врагов.", colors: { main: "#3a1014", trim: "#a01a20" }, weaponColor: "#ff3030", castColor: "#ff3040",
        skills: [
          A({ id: "bm_spear", name: "Кровавое копьё", lvl: 10, mp: 10, cd: 5, icon: ["➶", "#ff2020"], desc: "Пробивает всех; стоит 5% здоровья, лечит на 30% урона.", cast: "proj", proj: "blood", speed: 720, range: 420, mul: 2.6, pierce: 99, drain: 30, hpCost: 5, dmgType: "magic" }),
          A({ id: "bm_boil", name: "Вскипание крови", lvl: 13, mp: 20, cd: 12, icon: ["♨", "#d02020"], desc: "Кровь врагов вокруг вскипает: кровотечение.", cast: "aoe", at: "self", radius: 140, mul: 1.6, status: ["bleed", 5], dmgType: "magic", color: "#d02020" }),
          A({ id: "bm_ritual", name: "Ритуал", lvl: 16, mp: 0, cd: 30, icon: ["✡", "#ff4040"], desc: "Жертвует 20% здоровья: +45% урона на 10 с.", cast: "buff", dur: 10, stats: { dmg: 45, lifesteal: 10 }, hpCost: 20 }),
          P({ id: "bm_thirst", name: "Жажда", lvl: 11, icon: ["♥", "#c01020"], desc: "+2% вампиризма за ранг.", per: { lifesteal: 2 } }),
          P({ id: "bm_vigor", name: "Сила крови", lvl: 14, icon: ["♦", "#e02020"], desc: "+6% здоровья за ранг.", per: { hpPct: 6 } }),
          P({ id: "bm_frenzy", name: "Багровое безумие", lvl: 18, icon: ["☀", "#ff2040"], desc: "До +6% урона за ранг при низком здоровье.", per: { lowHpDmg: 6 } }),
        ] },
    },
  },
};

export const CLASS_ORDER = ["warrior", "ranger", "rogue", "mage", "cleric", "warlock"];

export function allSkills(classId, subId) {
  const c = CLASSES[classId];
  const list = [...c.skills];
  if (subId) list.push(...c.subclasses[subId].skills);
  return list;
}
export function findSkill(id) {
  for (const c of Object.values(CLASSES)) {
    for (const s of c.skills) if (s.id === id) return s;
    for (const sc of Object.values(c.subclasses)) for (const s of sc.skills) if (s.id === id) return s;
  }
  return null;
}
