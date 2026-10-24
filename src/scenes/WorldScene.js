// Сцена мира: локация, герой, монстры, жители, ресурсы, переходы между землями.
import { style } from "../art/style.js";
import Phaser from "phaser";
import { G } from "../core/G.js";
import { ZONES, TILE, DANGER } from "../data/zones.js";
import { MONSTERS } from "../data/monsters.js";
import { CLASSES, allSkills, findSkill } from "../data/classes.js";
import { RESOURCES, POTIONS, TIER_ROMAN } from "../data/items.js";
import { generateZone } from "../systems/mapgen.js";
import { Actor } from "../systems/entities.js";
import { Combat } from "../systems/combat.js";
import { derive, gainXp, addItem, rollGear, saveGame, skillValues, gatherLevel, countItem, removeItem } from "../systems/state.js";
import { TERRAIN, ensureHumanoid, ensureCreature, propLook, PROP_RES, artSheet } from "../art/registry.js";
import { PROPS } from "../art/props.js";
import { heroArtKey } from "../art/looks.js";
import { canvas } from "../art/paint.js";
import { mulberry32 } from "../core/rng.js";
import { questOnKill, questOnBoss } from "../systems/quests.js";

const genCache = {};
const TOWN_PORTAL = [26, 22.5]; // где в городе стоит обратный портал (клетки)
const HP_MUL = 2.2;
const CHUNK = 1024, CHUNK_RES = 0.75;
const NODE_VERB = { wood: "Рубить", ore: "Добыть руду", herb: "Сорвать", fiber: "Собрать", hide: "Освежевать" };

export class WorldScene extends Phaser.Scene {
  constructor() { super("world"); }

  init(data) {
    this.zoneId = data.zone || G.st.zone || "town";
    this.arrive = data.arrive || null;
  }

  create() {
    G.world = this;
    const st = G.st;
    st.zone = this.zoneId;
    this.z = ZONES[this.zoneId];
    this.danger = DANGER[this.z.danger];
    this.gen = genCache[this.zoneId] || (genCache[this.zoneId] = generateZone(this.zoneId, this.z));
    this.zoneLvl = parseInt(this.z.lvl) || 1;
    const Wpx = this.gen.W * TILE, Hpx = this.gen.H * TILE;
    this.physics.world.setBounds(0, 0, Wpx, Hpx);
    this.clock = 0; this.buffs = []; this.cds = {}; this.attackCd = 0; this.shield = 0; this.shieldUntil = 0;
    this.invuln = 0; this.dash = null; this.gathering = null; this.loot = []; this.allies = []; this.monsters = [];
    this.saveT = 0; this.hudT = 0; this.fadeT = 0; this.travelling = false; this.monsterGroup = null; this.allyGroup = null;
    this.combat = new Combat(this);
    this.classDef = CLASSES[st.cls];

    this.buildGround();
    this.buildObstacles();
    this.buildProps();
    this.buildPlayer();
    this.buildNpcs();
    this.buildMonsters();
    this.buildAtmosphere();
    this.buildMinimap();

    this.physics.add.collider(this.player.sprite, this.obstacles);
    this.monsterGroup = this.physics.add.group();
    for (const m of this.monsters) this.monsterGroup.add(m.sprite);
    this.physics.add.collider(this.monsterGroup, this.obstacles);
    this.physics.add.collider(this.monsterGroup, this.monsterGroup);
    this.allyGroup = this.physics.add.group();
    this.physics.add.collider(this.allyGroup, this.obstacles);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, Wpx, Hpx);
    cam.startFollow(this.player.sprite, true, 0.12, 0.12, 0, 20);
    this.resize();
    this.scale.on("resize", this.resize, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.resize, this));
    cam.fadeIn(500, 0, 0, 0);

    this.recalc();
    if (st.hp == null) { st.hp = this.player.maxHp; st.mp = this.pstats.mp; }
    this.player.hp = Math.min(st.hp, this.player.maxHp); this.mp = Math.min(st.mp ?? this.pstats.mp, this.pstats.mp);
    if (this.player.hp <= 0) this.player.hp = this.player.maxHp;
    this.setupKeys();
    this.portalObj = null; this.portalArmed = false;
    const pt = st.portal;
    if (pt && pt.stage === "open" && pt.zone === this.zoneId) this.spawnPortal(pt.x, pt.y, "Портал в Серый Брод");
    if (pt && pt.stage === "intown" && this.zoneId === "town") { const [tx, ty] = TOWN_PORTAL; this.spawnPortal(tx * TILE, ty * TILE, "Портал обратно: " + ZONES[pt.zone].name); }
    G.ui && G.ui.enterZone(this);
  }

  resize() {
    const cam = this.cameras.main;
    const h = this.scale.height, w = this.scale.width;
    cam.setSize(w, h);
    cam.setZoom(Math.max(0.45, Math.min(h / (TILE * 6.6), w / (TILE * 10)) * style().zoom));
  }

  // ---------- земля ----------
  buildGround() {
    const { W, H, ter } = this.gen;
    const base = this.z.base;
    const cw = Math.ceil(W * TILE / CHUNK), ch = Math.ceil(H * TILE / CHUNK);
    const order = ["grass", "forest", "swampgrass", "dirt", "mud", "ash", "road", "cobble", "stone", "water", "swampwater"];
    for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
      const key = `ground_${this.zoneId}_${cx}_${cy}`;
      if (!this.textures.exists(key)) {
        const size = CHUNK * CHUNK_RES;
        const c = canvas(size, size), ctx = c.getContext("2d");
        ctx.scale(CHUNK_RES, CHUNK_RES);
        ctx.translate(-cx * CHUNK, -cy * CHUNK);
        ctx.fillStyle = ctx.createPattern(TERRAIN.tex[base], "repeat");
        ctx.fillRect(cx * CHUNK, cy * CHUNK, CHUNK, CHUNK);
        const x0 = Math.floor(cx * CHUNK / TILE) - 2, y0 = Math.floor(cy * CHUNK / TILE) - 2;
        const x1 = x0 + CHUNK / TILE + 4, y1 = y0 + CHUNK / TILE + 4;
        for (const t of order) {
          if (t === base) continue;
          const isWater = t === "water" || t === "swampwater";
          for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
            if (ter[y * W + x] !== t) continue;
            const r = mulberry32(y * 7919 + x * 104729 + t.length);
            const brushes = TERRAIN.brushes[isWater ? "mud" : t];
            const b = brushes[Math.floor(r() * brushes.length)];
            const sz = (isWater ? 170 : 150) * (0.95 + r() * 0.3);
            ctx.save(); ctx.translate((x + 0.5) * TILE, (y + 0.5) * TILE); ctx.rotate(r() * 6.28);
            ctx.drawImage(b, -sz / 2, -sz / 2, sz, sz); ctx.restore();
          }
          if (isWater) {
            for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) {
              if (ter[y * W + x] !== t) continue;
              const r = mulberry32(y * 31 + x * 977);
              const b = TERRAIN.brushes[t][Math.floor(r() * 3)];
              const sz = 120 * (0.95 + r() * 0.25);
              ctx.save(); ctx.translate((x + 0.5) * TILE, (y + 0.5) * TILE); ctx.rotate(r() * 6.28);
              ctx.drawImage(b, -sz / 2, -sz / 2, sz, sz); ctx.restore();
            }
          }
        }
        this.textures.addCanvas(key, c);
      }
      this.add.image(cx * CHUNK, cy * CHUNK, key).setOrigin(0).setScale(1 / CHUNK_RES).setDepth(-100000);
    }
  }

  buildObstacles() {
    const { W, H, water, props } = this.gen;
    this.obstacles = this.physics.add.staticGroup();
    this.solids = [];
    const addRect = (x, y, w, h) => {
      const zn = this.add.zone(x + w / 2, y + h / 2, w, h);
      this.physics.add.existing(zn, true); this.obstacles.add(zn);
      this.solids.push({ r: [x, y, w, h] });
    };
    const addCircle = (x, y, r) => {
      const zn = this.add.zone(x, y, r * 2, r * 2);
      this.physics.add.existing(zn, true); zn.body.setCircle(r); this.obstacles.add(zn);
      this.solids.push({ c: [x, y, r] });
    };
    for (let y = 0; y < H; y++) {
      let run = -1;
      for (let x = 0; x <= W; x++) {
        const wv = x < W && water[y * W + x];
        if (wv && run < 0) run = x;
        if (!wv && run >= 0) { addRect(run * TILE + 10, y * TILE + 6, (x - run) * TILE - 20, TILE - 12); run = -1; }
      }
    }
    for (const p of props) {
      if (p.block) { const [bx, by, bw, bh] = p.block; addRect(p.x - p.w / 2 + bx, p.y - p.h + by + 10, bw, bh); }
      else if (p.col > 0) addCircle(p.x, p.y - p.col * 0.5, p.col);
    }
  }

  blockedAt(x, y) {
    const { W, H, water } = this.gen;
    if (x < 8 || y < 8 || x > W * TILE - 8 || y > H * TILE - 8) return true;
    if (water[Math.floor(y / TILE) * W + Math.floor(x / TILE)]) return true;
    for (const s of this.solids) {
      if (s.c) { if (Math.hypot(x - s.c[0], y - s.c[1]) < s.c[2] + 6) return true; }
      else if (x > s.r[0] - 4 && x < s.r[0] + s.r[2] + 4 && y > s.r[1] - 4 && y < s.r[1] + s.r[3] + 4) return true;
    }
    return false;
  }

  buildProps() {
    this.propSprites = [];
    this.nodes = [];
    this.lights = [];
    for (const p of this.gen.props) {
      const key = `${p.key}_${p.v}`;
      const img = this.add.image(p.x, p.y, "prop_" + key);
      const lk = propLook(this, key, p);
      img.setScale(lk.scale);
      img.setOrigin(0.5, lk.originY);
      img.setDepth(p.flat ? -50000 + p.y : p.y);
      if (lk.h > 120) this.propSprites.push(img);
      if (p.node) {
        const kind = p.node.replace(/[0-9]/g, "");
        const tier = parseInt(p.node.replace(/\D/g, "")) || 1;
        this.nodes.push({ img, x: p.x, y: p.y, kind, tier, res: p.node, charges: 3 + Math.floor(Math.random() * 3), respawn: 0 });
      }
      if (p.key === "lantern") this.addLight(p.x + 2, p.y - 66, 0xffb060, 1.4, 0.55);
      if (p.key === "campfire") { this.addLight(p.x, p.y - 20, 0xff9040, 2.2, 0.6, true); this.emberEmitter(p.x, p.y - 20); }
      if (p.key === "tavern" || p.key === "house" || p.key === "smithy" || p.key === "shop" || p.key === "herbhut" || p.key === "hut") this.addLight(p.x, p.y - 50, 0xffa050, 1.7, 0.2);
      if (p.key === "portal") this.addLight(p.x, p.y - 20, 0x80b0ff, 1.6, 0.35, true);
      if (p.key === "crystal") this.addLight(p.x, p.y - 20, p.v ? 0xa070ff : 0x70a0ff, 1.2, 0.4);
      if (p.key === "mushrooms" && p.v === 1) this.addLight(p.x, p.y - 10, 0x70d0a0, 0.6, 0.35);
    }
    // подписи выходов
    for (const e of this.z.exits || []) {
      const ex = e.x * TILE, ey = e.y * TILE;
      const name = ZONES[e.to].name + (ZONES[e.to].lvl ? ` (${ZONES[e.to].lvl})` : "");
      this.add.text(ex, ey + (e.y < 2 ? 70 : -70), "➜ " + name, { fontFamily: "Georgia, serif", fontSize: "18px", color: "#d8e4ff", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(100001);
    }
  }

  addLight(x, y, color, scale, alpha, flicker = false) {
    const vs = style(); // днём огни почти не видны
    alpha = Math.min(0.95, alpha * (1 + (((this.z.mood && this.z.mood.lights) || 1) - 1) * vs.mood) * (0.3 + 0.7 * Math.max(vs.dark, this.z.cave ? 1 : 0)));
    const l = this.add.image(x, y, "fx_glow_warm").setTint(color).setBlendMode(Phaser.BlendModes.ADD).setScale(scale).setAlpha(alpha).setDepth(99000);
    if (flicker) this.tweens.add({ targets: l, alpha: alpha * 0.7, scale: scale * 0.94, yoyo: true, repeat: -1, duration: 160 + Math.random() * 120 });
    this.lights.push(l);
    return l;
  }
  emberEmitter(x, y) {
    this.add.particles(x, y, "fx_spark", { speedY: { min: -60, max: -20 }, speedX: { min: -15, max: 15 }, lifespan: 1400, scale: { start: 0.35, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffa040, 0xff6020], blendMode: "ADD", frequency: 180 }).setDepth(y + 100);
  }

  buildAtmosphere() {
    const cam = this.cameras.main;
    const Wpx = this.gen.W * TILE, Hpx = this.gen.H * TILE;
    if (this.z.fog) {
      this.fog = this.add.tileSprite(0, 0, Wpx, Hpx, "fx_fog").setOrigin(0).setDepth(99500).setAlpha(Math.min(0.45, this.z.fog * 1.3)).setTileScale(3, 3);
    }
    const amb = this.z.ambient;
    const area = new Phaser.Geom.Rectangle(0, 0, Wpx, Hpx);
    if (amb === "forest" || amb === "swamp") {
      this.add.particles(0, 0, "fx_spark", { emitZone: { type: "random", source: area }, lifespan: 4000, speedX: { min: -12, max: 12 }, speedY: { min: -12, max: 12 }, scale: { start: 0.3, end: 0.1 }, alpha: { start: 0, end: 0.9, ease: "Sine.easeInOut" }, tint: amb === "swamp" ? 0x90ffb0 : 0xe0ff90, blendMode: "ADD", frequency: 120, quantity: 1 }).setDepth(99100);
    }
    if (amb === "mine") {
      this.add.particles(0, 0, "fx_dot", { emitZone: { type: "random", source: area }, lifespan: 6000, speedX: { min: -5, max: 5 }, speedY: { min: 2, max: 8 }, scale: 0.3, alpha: { start: 0.25, end: 0 }, tint: 0xc0b0a0, frequency: 60 }).setDepth(99100);
    }
    if (amb === "town") {
      this.add.particles(0, 0, "fx_dot", { emitZone: { type: "random", source: area }, lifespan: 5000, speedX: { min: -20, max: -5 }, speedY: { min: 30, max: 50 }, scale: 0.25, alpha: { start: 0.2, end: 0 }, tint: 0xd0d8e0, frequency: 90 }).setDepth(99100);
    }
    // погода и время суток у каждой земли своё
    const mood = this.z.mood || {};
    const view = new Phaser.Geom.Rectangle(-100, -100, this.scale.width + 200, this.scale.height + 100);
    if (mood.weather === "snow") {
      this.add.particles(0, 0, "fx_dot", { emitZone: { type: "random", source: view }, lifespan: 7000, speedX: { min: -25, max: 5 }, speedY: { min: 40, max: 80 }, scale: { min: 0.15, max: 0.4 }, alpha: { start: 0.85, end: 0.2 }, tint: 0xf0f6ff, frequency: 25, quantity: 1 }).setScrollFactor(0).setDepth(99600);
    }
    if (mood.weather === "dust") {
      this.add.particles(0, 0, "fx_dot", { emitZone: { type: "random", source: view }, lifespan: 6000, speedX: { min: 15, max: 40 }, speedY: { min: -6, max: 6 }, scale: { min: 0.1, max: 0.25 }, alpha: { start: 0, end: 0.5, ease: "Sine.easeInOut" }, tint: 0xffc080, blendMode: "ADD", frequency: 90, quantity: 1 }).setScrollFactor(0).setDepth(99600);
    }
    if (mood.weather === "leaves") {
      this.add.particles(0, 0, "fx_dot", { emitZone: { type: "random", source: view }, lifespan: 8000, speedX: { min: -40, max: -10 }, speedY: { min: 20, max: 45 }, scaleX: { min: 0.25, max: 0.4 }, scaleY: { min: 0.12, max: 0.2 }, rotate: { start: 0, end: 360 }, alpha: { start: 0.9, end: 0.3 }, tint: [0xc06020, 0xd09030, 0xa04018, 0xc8a040], frequency: 260, quantity: 1 }).setScrollFactor(0).setDepth(99600);
    }
    if (mood.weather === "fireflies") {
      this.add.particles(0, 0, "fx_spark", { emitZone: { type: "random", source: area }, lifespan: 5000, speedX: { min: -10, max: 10 }, speedY: { min: -10, max: 10 }, scale: { start: 0.25, end: 0.08 }, alpha: { start: 0, end: 1, ease: "Sine.easeInOut" }, tint: 0xd0ff70, blendMode: "ADD", frequency: 70, quantity: 1 }).setDepth(99100);
    }
    // свет вокруг героя
    this.playerLight = this.add.image(0, 0, "fx_glow_warm").setBlendMode(Phaser.BlendModes.ADD).setScale(3.2).setAlpha(this.z.cave ? 0.32 : (mood.glow || 0.14)).setDepth(99000).setTint(0xffd0a0);
    // постобработка: тёмная мрачная гамма + виньетка
    if (cam.postFX) {
      const cm = cam.postFX.addColorMatrix();
      const vs = style();
      const dark = (this.z.dark + (mood.extraDark || 0)) * vs.dark + (this.z.cave ? 0.15 * (1 - vs.dark) : 0);
      cm.saturate((mood.sat != null ? mood.sat : -0.25) * vs.mood + vs.sat);
      cm.brightness(1 - dark * 0.55, true);
      if (vs.contrast) cm.contrast(vs.contrast, true);
      if (mood.gain) { const k = vs.mood, [r, g, b] = mood.gain.map(v => 1 + (v - 1) * k); cm.multiply([r, 0, 0, 0, 0, 0, g, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0], true); }
      cam.postFX.addVignette(0.5, 0.5, 0.88, (0.32 + dark * 0.35) * vs.vignette);
    }
  }

  buildMinimap() {
    const { W, H, ter } = this.gen;
    const c = canvas(W * 3, H * 3), ctx = c.getContext("2d");
    const col = { grass: "#2a3520", forest: "#1c2616", swampgrass: "#222a1c", dirt: "#4a3a2a", road: "#5a5244", mud: "#33301f", cobble: "#4a4642", stone: "#2a2724", ash: "#3a3634", water: "#1a3a44", swampwater: "#1e3022" };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { ctx.fillStyle = col[ter[y * W + x]] || "#222"; ctx.fillRect(x * 3, y * 3, 3, 3); }
    ctx.fillStyle = "rgba(10,14,8,0.55)";
    for (const p of this.gen.props) if (p.col > 10 || p.block) { ctx.beginPath(); ctx.arc(p.x / TILE * 3, p.y / TILE * 3, 2, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#7ab0ff";
    for (const e of this.z.exits || []) { ctx.beginPath(); ctx.arc(e.x * 3, e.y * 3, 4, 0, 7); ctx.fill(); }
    this.minimap = c;
  }

  // ---------- герой ----------
  playerLook() {
    const st = G.st, cls = this.classDef, sub = st.sub ? cls.subclasses[st.sub] : null;
    const chest = st.equip.chest, head = st.equip.head;
    return {
      ...st.look,
      armor: chest ? chest.type : "rags",
      helm: head && st.settings.showHelm ? head.type : null,
      weapon: (sub && sub.weapon) || cls.weapon,
      offhand: sub && "offhand" in sub ? sub.offhand : cls.offhand,
      colors: (sub && sub.colors) || cls.colors,
      weaponColor: this.weaponColor(),
      castColor: (sub && sub.castColor) || cls.castColor,
      cape: (sub && sub.colors && sub.colors.trim) || null,
    };
  }
  weaponColor() {
    const st = G.st, cls = this.classDef, sub = st.sub ? cls.subclasses[st.sub] : null;
    const t = st.equip.weapon ? st.equip.weapon.tier : 1;
    return (sub && sub.weaponColor) || cls.weaponColor || ["#8a8e96", "#9aa8b4", "#c0ccd8", "#e0c070"][t - 1];
  }
  buildPlayer() {
    const st = G.st;
    const art = this.heroArt();
    if (!art) ensureHumanoid(this, "hero", this.playerLook());
    let x, y;
    if (this.arrive) { x = (this.arrive[0] + 0.5) * TILE; y = (this.arrive[1] + 0.5) * TILE; }
    else if (st.pos && st.pos.zone === this.zoneId) { x = st.pos.x; y = st.pos.y; }
    else { const s = this.z.spawn || [this.gen.W / 2, this.gen.H / 2]; x = s[0] * TILE; y = s[1] * TILE; }
    this.player = new Actor(this, { kind: "player", sheet: "h", tex: art ? art.key : "hero", idleCol: art ? art.idleCol : 0, x, y, scale: 1.05, radius: 13, hp: 100 });
    this.player.sprite.setCollideWorldBounds(true);
    this.player.name = st.name;
    this.nameTag = this.add.text(x, y, st.name, { fontFamily: "Georgia, serif", fontSize: "15px", color: "#e8dcc0", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(100002);
  }
  // нарисованный в ChatGPT лист героя для класса и пола, если он уже есть
  heroArt() {
    const key = heroArtKey(G.st);
    return key ? artSheet(this, key) : null;
  }
  refreshPlayerLook() {
    const art = this.heroArt();
    if (art) { this.recalc(); return; }
    ensureHumanoid(this, "hero", this.playerLook());
    this.player.sprite.setTexture("hero", 0);
    this.recalc();
  }
  recalc() {
    const st = G.st;
    this.pstats = derive(st, this.buffs);
    const hpWas = this.player.maxHp;
    this.player.maxHp = this.pstats.hp;
    if (this.player.hp > this.player.maxHp) this.player.hp = this.player.maxHp;
    if (hpWas && hpWas !== this.player.maxHp && this.player.hp === hpWas) this.player.hp = this.player.maxHp;
  }
  addBuff(b) {
    const ex = this.buffs.find(x => x.id === b.id);
    if (ex) ex.until = this.clock + b.dur; else this.buffs.push({ ...b, until: this.clock + b.dur });
    this.recalc();
  }
  healPlayer(n, quiet = false) {
    const p = this.player; if (p.dead) return;
    const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + n);
    const d = Math.round(p.hp - before);
    if (!quiet && d > 0) this.combat.text(p.x, p.cy - 30, "+" + d, "#70ff80", 17);
  }
  friendlies() { return [this.player, ...this.allies].filter(a => !a.dead); }

  wearWeapon() { const w = G.st.equip.weapon; if (w && w.dur > 0 && Math.random() < 0.25) { w.dur = Math.max(0, w.dur - 0.08 * (this.danger.durLoss ? 1.5 : 1)); if (w.dur === 0) this.brokeMsg(w); } }
  wearArmor() { for (const k of ["head", "chest", "boots"]) { const a = G.st.equip[k]; if (a && a.dur > 0 && Math.random() < 0.3) { a.dur = Math.max(0, a.dur - 0.1 * (this.danger.durLoss ? 1.5 : 1)); if (a.dur === 0) this.brokeMsg(a); } } }
  brokeMsg(it) { G.ui.toast(`${it.name} сломано! Почините у кузнеца.`, "#ff8060"); this.recalc(); }

  // ---------- жители ----------
  buildNpcs() {
    this.npcs = [];
    for (const n of this.z.npcs || []) {
      const key = "npc_" + n.id;
      const art = artSheet(this, key);
      if (!art && !this.textures.exists(key)) ensureHumanoid(this, key, n.look);
      const a = new Actor(this, { kind: "npc", sheet: "h", tex: key, idleCol: art ? art.idleCol : 0, x: n.x * TILE, y: n.y * TILE, scale: 1.05 });
      a.sprite.body.setImmovable(true); a.sprite.body.moves = false;
      a.npc = n; a.dir = 0;
      a.label = this.add.text(a.x, a.y - 92, n.name, { fontFamily: "Georgia, serif", fontSize: "15px", color: "#f0d890", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(100002);
      a.mark = this.add.text(a.x, a.y - 112, "", { fontFamily: "Georgia, serif", fontSize: "26px", color: "#ffd040", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(100002);
      this.physics.add.collider(this.player.sprite, a.sprite);
      this.npcs.push(a);
    }
  }

  // ---------- монстры ----------
  monsterTex(id) {
    const d = MONSTERS[id];
    const key = "mob_" + id;
    const art = artSheet(this, key);
    if (art) return [art.key, art.sheet, art.idleCol];
    if (this.textures.exists(key)) return [key, d.sprite.humanoid ? "h" : "c"];
    if (d.sprite.humanoid) { ensureHumanoid(this, key, d.sprite.humanoid); return [key, "h"]; }
    ensureCreature(this, key, d.sprite.creature, d.sprite.opts || {}); return [key, "c"];
  }
  spawnMonster(id, x, y, opts = {}) {
    const d = MONSTERS[id];
    const [tex, sheet, idleCol] = this.monsterTex(id);
    const m = new Actor(this, { kind: "monster", sheet, tex, idleCol, x, y, scale: d.scale, radius: d.boss ? 22 : 14, hp: Math.round(d.hp * HP_MUL), flying: d.flying, def: d });
    m.mid = id; m.lvl = d.lvl; m.atk = d.atk; m.defense = d.def; m.speed = d.speed;
    m.home = { x, y }; m.state = "idle"; m.cd = Math.random(); m.wander = 0; m.sp1 = d.special ? d.special.cd * 0.6 : 0; m.sp2 = d.special2 ? d.special2.cd * 0.8 : 0;
    m.spawnIdx = opts.spawnIdx; m.minion = !!opts.minion;
    m.sprite.setCollideWorldBounds(true);
    if (this.monsterGroup) this.monsterGroup.add(m.sprite);
    if (d.boss) m.label = this.add.text(x, y, d.name, { fontFamily: "Georgia, serif", fontSize: "16px", color: "#ff9070", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(100002);
    m.bar = this.add.graphics().setDepth(100001);
    this.monsters.push(m);
    return m;
  }
  buildMonsters() {
    this.spawnPts = this.gen.spawnPts.map(s => ({ ...s, respawnAt: 0, alive: null }));
    this.spawnPts.forEach((s, i) => { s.alive = this.spawnMonster(s.m, s.x, s.y, { spawnIdx: i }); });
    if (this.z.boss) {
      this.bossPt = { m: this.z.boss.m, x: this.z.boss.x * TILE, y: this.z.boss.y * TILE, respawnAt: 0 };
      this.bossPt.alive = this.spawnMonster(this.bossPt.m, this.bossPt.x, this.bossPt.y, { boss: true });
    }
  }
  spawnAlly(id, x, y, dur, baseDmg) {
    const d = MONSTERS[id];
    const [tex, sheet, idleCol] = this.monsterTex(id);
    const ps = this.pstats;
    const a = new Actor(this, { kind: "ally", sheet, tex, idleCol, x, y, scale: d.scale, radius: 12, hp: Math.round(this.player.maxHp * d.hp * (1 + ps.summon / 100)), flying: d.flying, def: d, alpha: d.alpha });
    a.dmg = baseDmg * d.atk * (1 + ps.summon / 100) * 0.5; // приспешник ~ половина удара героя
    a.speed = d.speed; a.defense = ps.def * 0.6; a.cd = 0; a.expire = this.clock + dur;
    a.sprite.setCollideWorldBounds(true);
    this.allyGroup.add(a.sprite);
    this.allies.push(a);
    return a;
  }
  killAlly(a) { a.dead = true; this.combat.burst(a.x, a.cy, "#a0a0a0", 10); a.destroy(); this.allies = this.allies.filter(x => x !== a); }

  killMonster(m) {
    if (m.dead) return;
    m.dead = true;
    const st = G.st, d = m.def;
    m.sprite.body.enable = false;
    m.bar.clear();
    this.tweens.add({ targets: m.sprite, alpha: 0, duration: 700, onComplete: () => m.destroy() });
    this.combat.burst(m.x, m.cy, d.undead ? "#a0c0a0" : "#a02020", 12, 100, 500);
    if (!m.minion || Math.random() < 0.5) {
      // опыт с поправкой на разницу уровней
      const diff = st.level - m.lvl;
      const k = diff > 6 ? 0.2 : diff > 3 ? 0.6 : diff < -3 ? 1.3 : 1;
      const xp = Math.round(d.xp * 1.5 * k);
      this.giveXp(xp, m);
      // золото
      const gold = Math.round(d.gold[0] + Math.random() * (d.gold[1] - d.gold[0]));
      if (gold) this.dropLoot(m.x, m.y, { gold });
      // добыча
      const items = [];
      for (const [id, ch, tier] of d.drops || []) {
        if (Math.random() > ch) continue;
        if (id === "gear") items.push(rollGear(Math.random, tier || 1, st.cls));
        else if (RESOURCES[id]) items.push({ cat: "res", id, n: 1 + (Math.random() < 0.25 ? 1 : 0) });
        else if (POTIONS[id]) items.push({ cat: "potion", id, n: 1 });
      }
      const ztier = this.zoneId === "mine" ? 3 : this.zoneId === "forest" ? 1 : 2;
      if (Math.random() < (d.boss ? 0 : 0.035)) items.push(rollGear(Math.random, ztier, st.cls));
      if (Math.random() < 0.06) items.push({ cat: "potion", id: ztier > 1 ? "hp2" : "hp1", n: 1 });
      for (const it of items) this.dropLoot(m.x + (Math.random() - 0.5) * 50, m.y + (Math.random() - 0.5) * 30, { item: it });
      st.kills[m.mid] = (st.kills[m.mid] || 0) + 1;
      questOnKill(st, m.mid);
      if (d.boss) { questOnBoss(st, m.mid); G.ui.toast(`${d.name} повержен!`, "#ffd040", 3000); }
    }
    if (d.boss) { G.ui.bossBar(null); this.bossPt.respawnAt = this.clock + 240; }
    if (m.spawnIdx != null) this.spawnPts[m.spawnIdx].respawnAt = this.clock + 35 + Math.random() * 20;
    G.ui.refresh();
  }
  giveXp(n, at) {
    const st = G.st;
    const ups = gainXp(st, n);
    if (at) this.combat.text(at.x, at.cy - 44, `+${n} опыта`, "#c0a0ff", 15);
    if (ups) {
      this.recalc(); this.player.hp = this.player.maxHp; this.mp = this.pstats.mp;
      this.combat.ringFx(this.player.x, this.player.y, 120, "#ffd060", 700);
      this.combat.burst(this.player.x, this.player.cy, "#ffd060", 30, 160, 900);
      G.ui.toast(`Новый уровень: ${st.level}! +3 очка характеристик, +1 очко навыков`, "#ffd060", 3500);
      if (st.level === 10 && !st.sub) G.ui.toast("Наставник Ольгерд ждёт вас в Сером Броде: пора выбрать подкласс!", "#ffe090", 5000);
    }
  }

  dropLoot(x, y, o) {
    const tex = o.gold ? "fx_coin" : "fx_loot";
    const s = this.add.image(x, y, tex).setDepth(y - 1).setScale(o.gold ? 0.9 : 1);
    this.tweens.add({ targets: s, y: y - 18, yoyo: true, duration: 220, ease: "Quad.easeOut" });
    let glow = null;
    if (o.item && o.item.cat === "gear") {
      const qc = [0xc8c0b0, 0x7ac070, 0x6aa0e0, 0xb070e0, 0xe0a040][o.item.quality];
      glow = this.add.image(x, y, "fx_glow_white").setTint(qc).setBlendMode(Phaser.BlendModes.ADD).setScale(0.8).setDepth(y - 2);
      this.tweens.add({ targets: glow, alpha: 0.4, yoyo: true, repeat: -1, duration: 600 });
    }
    this.loot.push({ x, y, s, glow, ...o, born: this.clock });
  }
  pickupLoot() {
    const p = this.player, st = G.st;
    for (let i = this.loot.length - 1; i >= 0; i--) {
      const l = this.loot[i];
      if (this.clock - l.born < 0.35) continue;
      if (Math.hypot(l.x - p.x, l.y - p.y) > 58) continue;
      if (l.gold) { st.gold += l.gold; this.combat.text(p.x, p.cy - 50, `+${l.gold} зол.`, "#ffd040", 15); }
      else {
        if (!addItem(st, l.item)) { if (!this.bagFullT || this.clock > this.bagFullT) { G.ui.toast("Сумка полна!", "#ff8060"); this.bagFullT = this.clock + 3; } continue; }
        const title = G.ui.itemName(l.item);
        G.ui.toast(`Получено: ${title}${l.item.n > 1 ? " ×" + l.item.n : ""}`, G.ui.itemColor(l.item), 1800);
      }
      l.s.destroy(); if (l.glow) l.glow.destroy();
      this.loot.splice(i, 1);
      G.ui.refresh();
    }
  }

  // ---------- ИИ ----------
  updateMonster(m, dt) {
    const d = m.def, p = this.player, body = m.sprite.body;
    const mods = this.combat.tickStatuses(m, dt);
    if (m.dead) return;
    m.animate(dt);
    if (m.label) m.label.setPosition(m.x, m.y - 80 * m.scale - 12);
    // полоска здоровья
    m.bar.clear();
    if (m.hp < m.maxHp && !d.boss) {
      const w = 44, x = m.x - w / 2, y = m.y - 74 * m.scale;
      m.bar.fillStyle(0x000000, 0.7).fillRect(x - 1, y - 1, w + 2, 7);
      m.bar.fillStyle(0xc02a20, 1).fillRect(x, y, w * Math.max(0, m.hp / m.maxHp), 5);
    }
    if (m.knock) { body.setVelocity(m.knock.vx, m.knock.vy); m.knock.t -= dt; if (m.knock.t <= 0) m.knock = null; return; }
    if (m.charging) {
      m.charging.t -= dt; body.setVelocity(m.charging.vx, m.charging.vy);
      if (!m.charging.hit && Math.hypot(p.x - m.x, p.y - m.y) < m.radius + 26) { m.charging.hit = true; this.combat.hitFriendly(p, m.atk, { mul: d.special.mul, src: m }); }
      if (m.charging.t <= 0) m.charging = null;
      return;
    }
    if (mods.stunned) { body.setVelocity(0, 0); return; }
    const spd = m.speed * mods.slow;
    // цель: герой или ближайший союзник
    let target = p.dead ? null : p, td = p.dead ? 1e9 : Math.hypot(p.x - m.x, p.y - m.y);
    for (const a of this.allies) { const ad = Math.hypot(a.x - m.x, a.y - m.y); if (ad < td * 0.8) { target = a; td = ad; } }
    if (mods.fear && target) { const a = Math.atan2(m.y - target.y, m.x - target.x); body.setVelocity(Math.cos(a) * spd, Math.sin(a) * spd); m.face(Math.cos(a), Math.sin(a)); return; }
    const homeD = Math.hypot(m.x - m.home.x, m.y - m.home.y);
    if (m.state !== "return" && target && (td < d.aggro || (m.aggro && td < d.aggro * 2.2))) m.state = "chase";
    if (m.state === "chase" && (homeD > 900 || !target || td > d.aggro * 2.6)) { m.state = "return"; m.aggro = false; }
    if (m.state === "return") {
      const a = Math.atan2(m.home.y - m.y, m.home.x - m.x);
      body.setVelocity(Math.cos(a) * spd * 1.3, Math.sin(a) * spd * 1.3); m.face(Math.cos(a), Math.sin(a));
      m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.2 * dt);
      if (homeD < 30) m.state = "idle";
      return;
    }
    if (m.state === "idle") {
      m.wander -= dt;
      if (m.wander <= 0) {
        m.wander = 2 + Math.random() * 3;
        if (Math.random() < 0.5) { body.setVelocity(0, 0); m.wdir = null; }
        else { const a = Math.random() * 6.28; m.wdir = [Math.cos(a), Math.sin(a)]; }
      }
      if (m.wdir) {
        if (homeD > 180) { const a = Math.atan2(m.home.y - m.y, m.home.x - m.x); m.wdir = [Math.cos(a), Math.sin(a)]; }
        body.setVelocity(m.wdir[0] * spd * 0.35, m.wdir[1] * spd * 0.35); m.face(m.wdir[0], m.wdir[1]);
      }
      return;
    }
    // бой
    if (d.boss && target === p) G.ui.bossBar(m);
    m.cd -= dt; m.sp1 -= dt; m.sp2 -= dt;
    const dx = target.x - m.x, dy = target.y - m.y;
    m.face(dx, dy);
    // особые приёмы
    for (const [sp, key] of [[d.special, "sp1"], [d.special2, "sp2"]]) {
      if (!sp || m[key] > 0) continue;
      if (sp.type === "charge" && td < sp.dist + 40 && td > 80) {
        m[key] = sp.cd; const a = Math.atan2(dy, dx);
        this.combat.zoneMark(m.x + Math.cos(a) * sp.dist / 2, m.y + Math.sin(a) * sp.dist / 2, 30, "#ff4030", 0.5);
        m.cd = 1; body.setVelocity(0, 0);
        this.combat.later(0.45, () => { if (!m.dead) m.charging = { vx: Math.cos(a) * sp.dist / 0.35, vy: Math.sin(a) * sp.dist / 0.35, t: 0.35 }; });
        return;
      }
      if (sp.type === "aoe" && td < sp.radius * 1.2) {
        m[key] = sp.cd; m.startAttack(0.6); body.setVelocity(0, 0);
        this.combat.area({ x: m.x, y: m.y, radius: sp.radius, delay: 0.75, color: sp.color, owner: "enemy",
          onTick: ts => { for (const t of ts) this.combat.hitFriendly(t, m.atk, { mul: sp.mul, status: sp.status, src: m }); } });
        m.cd = 1.2; return;
      }
      if (sp.type === "summon" && this.monsters.filter(x => x.minion && !x.dead).length < 6) {
        m[key] = sp.cd; m.startCast(0.5);
        for (let i = 0; i < sp.count; i++) { const mm = this.spawnMonster(sp.mob, m.x + (Math.random() - 0.5) * 120, m.y + (Math.random() - 0.5) * 80, { minion: true }); mm.state = "chase"; mm.aggro = true; }
        this.combat.ringFx(m.x, m.y, 120, "#c0ffa0");
      }
    }
    const atk = d.attack;
    const ranged = !!atk.proj;
    const reach = atk.range + target.radius;
    if (td > reach * (ranged ? 0.9 : 0.85)) {
      const a = Math.atan2(dy, dx);
      body.setVelocity(Math.cos(a) * spd, Math.sin(a) * spd);
    } else if (ranged && d.kite && td < 140) {
      const a = Math.atan2(-dy, -dx); body.setVelocity(Math.cos(a) * spd * 0.8, Math.sin(a) * spd * 0.8);
    } else body.setVelocity(0, 0);
    if (td <= reach && m.cd <= 0) {
      m.cd = atk.cd; m.startAttack(0.35);
      if (ranged) {
        const a = Math.atan2(target.cy - m.cy, dx);
        this.combat.proj({ x: m.x, y: m.cy, angle: a, speed: 380, range: atk.range + 60, tex: atk.proj === "arrow" ? "arrow" : atk.proj, owner: "enemy", color: "#a0ffc0",
          onHit: t => this.combat.hitFriendly(t, m.atk, { status: atk.status, src: m }) });
      } else {
        this.combat.later(0.15, () => { if (!m.dead && !target.dead && Math.hypot(target.x - m.x, target.y - m.y) < reach + 20) this.combat.hitFriendly(target, m.atk, { status: atk.status, src: m }); });
      }
    }
  }

  updateAlly(a, dt) {
    const p = this.player, body = a.sprite.body;
    a.animate(dt);
    if (this.clock > a.expire) { this.killAlly(a); return; }
    a.cd -= dt;
    const t = this.combat.nearestEnemy(380, a);
    const pd = Math.hypot(p.x - a.x, p.y - a.y);
    if (t && pd < 500) {
      const td = Math.hypot(t.x - a.x, t.y - a.y), reach = a.def.attack.range + t.radius;
      a.face(t.x - a.x, t.y - a.y);
      if (td > reach * 0.85) { const an = Math.atan2(t.y - a.y, t.x - a.x); body.setVelocity(Math.cos(an) * a.speed, Math.sin(an) * a.speed); }
      else body.setVelocity(0, 0);
      if (td <= reach && a.cd <= 0) {
        a.cd = a.def.attack.cd; a.startAttack(0.3);
        if (a.def.attack.proj) this.combat.proj({ x: a.x, y: a.cy, angle: Math.atan2(t.cy - a.cy, t.x - a.x), speed: 500, range: 320, tex: a.def.attack.proj, owner: "ally", color: "#e0e0ff", onHit: tt => this.combat.hitMonster(tt, a.dmg, { ally: true }) });
        else this.combat.hitMonster(t, a.dmg, { ally: true });
      }
    } else if (pd > 90) {
      const an = Math.atan2(p.y - a.y, p.x - a.x); const sp = Math.min(a.speed * 1.2, pd * 3);
      body.setVelocity(Math.cos(an) * sp, Math.sin(an) * sp); a.face(Math.cos(an), Math.sin(an));
      if (pd > 700) a.sprite.setPosition(p.x + 30, p.y + 10);
    } else body.setVelocity(0, 0);
  }

  // ---------- управление ----------
  setupKeys() {
    const kb = this.input.keyboard; if (!kb) return;
    this.keys = kb.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,J,SPACE,ONE,TWO,THREE,FOUR,FIVE,SIX,Q,E,F,T");
    const map = { ONE: 0, TWO: 1, THREE: 2, FOUR: 3, FIVE: 4, SIX: 5 };
    for (const [k, i] of Object.entries(map)) this.keys[k].on("down", () => this.useSlot(i));
    this.keys.Q.on("down", () => this.usePotion(0));
    this.keys.E.on("down", () => this.usePotion(1));
    this.keys.F.on("down", () => G.ui.contextAction());
    this.keys.T.on("down", () => this.openPortal());
  }

  useSlot(i) {
    const id = G.st.slots[i]; if (!id) return;
    const s = findSkill(id); if (!s || s.kind !== "active" || !G.st.skills[id]) return;
    if (this.player.dead || G.paused) return;
    if ((this.cds[id] || 0) > 0) return;
    const v = skillValues(G.st, s);
    if (this.mp < v.mp) { G.ui.toast("Не хватает маны", "#80a0ff", 1000); return; }
    if (this.player.statuses.some(x => x.type === "stun" || x.type === "freeze")) return;
    this.gathering = null;
    if (this.combat.castSkill(s) === false) return;
    this.mp -= v.mp;
    this.cds[id] = v.cd * (1 - this.pstats.cdr / 100);
    G.st.mastery[id] = (G.st.mastery[id] || 0) + 1;
  }
  usePotion(i) {
    const st = G.st, id = st.potionSlots[i]; if (!id || this.player.dead) return;
    if ((this.cds["pot_" + i] || 0) > 0) return;
    if (!countItem(st, id)) { G.ui.toast("Зелья закончились", "#c0a080", 1000); return; }
    const pd = POTIONS[id];
    removeItem(st, id, 1);
    if (pd.heal) this.healPlayer(this.player.maxHp * pd.heal);
    if (pd.mana) { this.mp = Math.min(this.pstats.mp, this.mp + this.pstats.mp * pd.mana); this.combat.text(this.player.x, this.player.cy - 40, "+мана", "#80a0ff", 15); }
    this.cds["pot_" + i] = 2;
    this.combat.burst(this.player.x, this.player.cy, pd.heal ? "#ff6060" : "#6080ff", 10, 60, 500);
    G.ui.refresh();
  }

  // ---------- сбор ресурсов ----------
  nearestNode(r = 75) {
    const p = this.player; let best = null, bd = r;
    for (const n of this.nodes) { if (n.charges <= 0) continue; const d = Math.hypot(n.x - p.x, n.y - 12 - p.y); if (d < bd) { bd = d; best = n; } }
    return best;
  }
  nearestNpc(r = 95) {
    const p = this.player; let best = null, bd = r;
    for (const n of this.npcs) { const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < bd) { bd = d; best = n; } }
    return best;
  }
  startGather(n) {
    const lvl = gatherLevel(G.st, n.kind);
    this.gathering = { node: n, t: 0, need: Math.max(0.5, 1.4 - lvl * 0.04) };
    this.player.face(n.x - this.player.x, n.y - this.player.y);
  }
  updateGather(dt) {
    const g = this.gathering; if (!g) return;
    const p = this.player;
    if (p.moving || Math.hypot(g.node.x - p.x, g.node.y - 12 - p.y) > 90) { this.gathering = null; G.ui.gatherProgress(null); return; }
    g.t += dt;
    if (Math.floor(g.t * 3) !== Math.floor((g.t - dt) * 3)) { p.startAttack(0.25); this.combat.burst(g.node.x, g.node.y - 20, g.node.kind === "ore" ? "#c0b0a0" : g.node.kind === "wood" ? "#a08060" : "#90c070", 4, 60, 300); }
    G.ui.gatherProgress(g.t / g.need, NODE_VERB[g.node.kind]);
    if (g.t >= g.need) {
      const st = G.st, n = g.node, lvl = gatherLevel(st, n.kind);
      const amt = 1 + (Math.random() < lvl * 0.04 ? 1 : 0) + (Math.random() < lvl * 0.015 ? 1 : 0);
      if (!addItem(st, { cat: "res", id: n.res, n: amt })) { G.ui.toast("Сумка полна!", "#ff8060"); this.gathering = null; G.ui.gatherProgress(null); return; }
      st.gather[n.kind] = (st.gather[n.kind] || 0) + n.tier;
      this.combat.text(n.x, n.y - 60, `+${amt} ${RESOURCES[n.res].name}`, "#e0d0a0", 15);
      if (n.kind === "ore" && Math.random() < 0.04 && n.tier >= 3) addItem(st, { cat: "res", id: "crystal", n: 1 });
      n.charges--;
      if (n.charges <= 0) { n.img.setAlpha(0.25); n.respawn = this.clock + 60; this.gathering = null; G.ui.gatherProgress(null); }
      else g.t = 0;
      const newLvl = gatherLevel(st, n.kind);
      if (newLvl > lvl) G.ui.toast(`Мастерство «${NODE_VERB[n.kind]}» выросло до ${newLvl}`, "#a0e0a0");
      G.ui.refresh();
    }
  }

  // ---------- портал в город (бесплатный, туда и обратно, потом закрывается) ----------
  openPortal() {
    const st = G.st, p = this.player;
    if (p.dead || this.travelling) return;
    if (this.zoneId === "town") { G.ui.toast("В городе портал не открыть", "#c0c0c0"); return; }
    const [fx, fy] = p.faceVec();
    let x = p.x + fx * 70, y = p.y + fy * 50;
    if (this.blockedAt(x, y)) { x = p.x; y = p.y + 40; }
    if (this.portalObj) this.closePortalSprite();
    st.portal = { zone: this.zoneId, x, y, stage: "open" };
    this.spawnPortal(x, y, "Портал в Серый Брод");
    this.portalArmed = true;
    this.combat.ringFx(x, y, 80, "#80b0ff", 600);
    G.ui.toast("Портал открыт: войдите в него", "#a0c8ff");
  }
  spawnPortal(x, y, label) {
    const glow = this.add.image(x, y - 30, "fx_glow_cold").setBlendMode(Phaser.BlendModes.ADD).setScale(0.38, 0.55).setAlpha(0.55).setDepth(y + 1);
    const core = this.add.image(x, y - 30, "fx_ring").setBlendMode(Phaser.BlendModes.ADD).setTint(0x80b0ff).setScale(0.28, 0.42).setDepth(y + 2);
    this.tweens.add({ targets: core, angle: 360, duration: 3000, repeat: -1 });
    this.tweens.add({ targets: glow, alpha: 0.3, yoyo: true, repeat: -1, duration: 700 });
    const text = this.add.text(x, y - 80, label, { fontFamily: "Georgia, serif", fontSize: "15px", color: "#c8dcff", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(100002);
    const light = this.addLight(x, y - 30, 0x80b0ff, 0.9, 0.3, true);
    this.portalObj = { x, y, parts: [glow, core, text, light] };
    // нельзя сразу шагнуть обратно: сначала отойти
    this.portalArmed = Math.hypot(this.player ? this.player.x - x : 999, this.player ? this.player.y - y : 999) > 90;
  }
  closePortalSprite() { if (!this.portalObj) return; for (const o of this.portalObj.parts) o.destroy(); this.portalObj = null; }
  checkPortal() {
    const po = this.portalObj, p = this.player, st = G.st;
    if (!po || !st.portal) return;
    const d = Math.hypot(p.x - po.x, p.y - po.y);
    if (!this.portalArmed) { if (d > 90) this.portalArmed = true; return; }
    if (d > 42) return;
    if (st.portal.stage === "open") {
      st.portal.stage = "intown";
      this.travel("town", [TOWN_PORTAL[0], TOWN_PORTAL[1] + 1.2]);
    } else if (st.portal.stage === "intown" && this.zoneId === "town") {
      const back = st.portal; st.portal = null;
      this.travel(back.zone, [back.x / TILE - 0.5, back.y / TILE + 0.6]);
    }
  }

  // ---------- смерть и переходы ----------
  playerDied() {
    const p = this.player; if (p.dead) return;
    p.dead = true; p.hp = 0; this.gathering = null;
    p.sprite.body.setVelocity(0, 0);
    this.tweens.add({ targets: p.sprite, alpha: 0.3, angle: 80, duration: 600 });
    const st = G.st, dz = this.danger;
    st.deaths++;
    const lossGold = Math.floor(st.gold * dz.goldLoss);
    st.gold -= lossGold;
    for (const it of Object.values(st.equip)) if (it) it.dur = Math.max(0, it.dur - dz.durLoss);
    const lost = [];
    if (dz.bagLoss) {
      for (let i = st.bag.length - 1; i >= 0; i--) if (Math.random() < dz.bagLoss) { lost.push(st.bag[i]); st.bag.splice(i, 1); }
    }
    G.ui.death({ gold: lossGold, dur: dz.durLoss, lost, zone: this.z.name, danger: dz });
  }
  respawn() {
    const st = G.st;
    st.hp = null; st.mp = null; st.pos = null;
    this.travel("town", null, true);
  }

  travel(zone, arrive, fromDeath = false) {
    if (this.travelling) return;
    this.travelling = true;
    const st = G.st;
    if (!fromDeath) { st.hp = this.player.hp; st.mp = this.mp; }
    st.zone = zone; st.pos = null;
    saveGame(st, G.slot);
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.time.delayedCall(360, () => this.scene.restart({ zone, arrive }));
  }

  checkExits() {
    const p = this.player;
    for (const e of this.z.exits || []) {
      const ex = e.x * TILE, ey = e.y * TILE, w = e.w * TILE;
      const inside = e.vertical ? Math.abs(p.y - ey) < w / 2 && Math.abs(p.x - ex) < 46 : Math.abs(p.x - ex) < w / 2 && Math.abs(p.y - ey) < 46;
      if (!inside) continue;
      if (e.minLvl && G.st.level < e.minLvl) {
        if (!this.lvlMsgT || this.clock > this.lvlMsgT) { G.ui.toast(`${ZONES[e.to].name}: нужен ${e.minLvl}-й уровень`, "#ff9070"); this.lvlMsgT = this.clock + 2; }
        const a = Math.atan2(p.y - ey, p.x - ex); p.sprite.setPosition(p.x + Math.cos(a) * 30 + (e.vertical ? -30 : 0), p.y + (e.vertical ? 0 : (ey < 100 ? 30 : -30)));
        return;
      }
      this.travel(e.to, e.arrive);
      return;
    }
  }

  // ---------- цикл ----------
  update(time, delta) {
    if (this.travelling) return;
    const dt = Math.min(delta / 1000, 0.05);
    if (G.paused) { this.physics.world.pause(); return; } else if (this.physics.world.isPaused) this.physics.world.resume();
    this.clock += dt;
    const st = G.st, p = this.player, ps = this.pstats;
    st.playtime += dt;

    // эффекты на герое
    const mods = this.combat.tickStatuses(p, dt);
    if (this.invuln > 0) this.invuln -= dt;
    if (!p.dead) {
      // движение
      let mx = G.input.mx, my = G.input.my;
      if (this.keys) {
        const k = this.keys;
        const kx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
        const ky = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
        if (kx || ky) { const l = Math.hypot(kx, ky); mx = kx / l; my = ky / l; }
      }
      const speed = 170 * (1 + ps.move / 100) * mods.slow;
      if (this.dash) {
        p.sprite.body.setVelocity(this.dash.vx, this.dash.vy);
        this.dash.t -= dt;
        if (this.dash.dmg) for (const m of this.monsters) if (!m.dead && !this.dash.hit.has(m) && Math.hypot(m.x - p.x, m.y - p.y) < m.radius + 34) { this.dash.hit.add(m); this.combat.hitMonster(m, this.dash.dmg, this.dash.opts); }
        if (Math.random() < 0.7) { const gh = this.add.image(p.x, p.y, "hero", p.sprite.frame.name).setOrigin(p.sprite.originX, p.sprite.originY).setScale(p.sprite.scaleX).setFlipX(p.sprite.flipX).setAlpha(0.4).setTint(0x8080ff).setDepth(p.y - 1); this.tweens.add({ targets: gh, alpha: 0, duration: 250, onComplete: () => gh.destroy() }); }
        if (this.dash.t <= 0) this.dash = null;
      } else if (mods.stunned) p.sprite.body.setVelocity(0, 0);
      else {
        p.sprite.body.setVelocity(mx * speed, my * speed);
        if ((mx || my) && p.attackT < 0) p.face(mx, my);
      }
      // атака
      this.attackCd -= dt;
      const attackHeld = G.input.attack || (this.keys && (this.keys.J.isDown || this.keys.SPACE.isDown));
      if (attackHeld && this.attackCd <= 0 && !mods.stunned) {
        this.gathering = null;
        this.combat.basicAttack();
        this.attackCd = 0.62 / (this.classDef.attack.speed * (1 + ps.aspd / 100));
      }
      // восстановление
      const inCombat = this.monsters.some(m => m.state === "chase" && !m.dead);
      p.hp = Math.min(p.maxHp, p.hp + ps.hpRegen * dt * (inCombat ? 1 : 3));
      this.mp = Math.min(ps.mp, this.mp + ps.mpRegen * dt * (inCombat ? 1 : 2));
      this.updateGather(dt);
      this.pickupLoot();
      this.checkExits();
      this.checkPortal();
    }
    p.animate(dt);
    if (p.dead) p.sprite.clearTint();
    this.nameTag.setPosition(p.x, p.y - 62 * p.scale - 14);
    this.playerLight.setPosition(p.x, p.y - 30);

    for (const k of Object.keys(this.cds)) if (this.cds[k] > 0) this.cds[k] -= dt;
    let changed = false;
    for (let i = this.buffs.length - 1; i >= 0; i--) if (this.clock > this.buffs[i].until) { this.buffs.splice(i, 1); changed = true; }
    if (changed) this.recalc();
    if (this.shield > 0 && this.clock > this.shieldUntil) this.shield = 0;

    for (const m of this.monsters) if (!m.dead) this.updateMonster(m, dt);
    this.monsters = this.monsters.filter(m => !m.dead || m.sprite.active);
    for (const a of [...this.allies]) if (!a.dead) this.updateAlly(a, dt);
    for (const n of this.npcs) { n.animate(dt); const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < 200) n.face(p.x - n.x, p.y - n.y); }
    this.combat.update(dt);

    // возрождение монстров и ресурсов
    for (const s of this.spawnPts) {
      if (s.alive && s.alive.dead && s.respawnAt && this.clock > s.respawnAt && Math.hypot(s.x - p.x, s.y - p.y) > 500) { s.alive = this.spawnMonster(s.m, s.x, s.y, { spawnIdx: this.spawnPts.indexOf(s) }); s.respawnAt = 0; }
    }
    if (this.bossPt && this.bossPt.alive.dead && this.bossPt.respawnAt && this.clock > this.bossPt.respawnAt && Math.hypot(this.bossPt.x - p.x, this.bossPt.y - p.y) > 700) { this.bossPt.alive = this.spawnMonster(this.bossPt.m, this.bossPt.x, this.bossPt.y); this.bossPt.respawnAt = 0; }
    for (const n of this.nodes) if (n.charges <= 0 && this.clock > n.respawn) { n.charges = 3 + Math.floor(Math.random() * 3); n.img.setAlpha(1); }

    // прозрачность деревьев, закрывающих героя
    this.fadeT -= dt;
    if (this.fadeT <= 0) {
      this.fadeT = 0.15;
      for (const img of this.propSprites) {
        const b = img.getBounds();
        const behind = p.y < img.y - 4 && p.x > b.x + 10 && p.x < b.right - 10 && p.y > b.y + 10;
        const target = behind ? 0.45 : 1;
        if (img.alpha !== target) img.setAlpha(img.alpha + (target - img.alpha) * 0.6);
      }
    }
    if (this.fog) { this.fog.tilePositionX += dt * 8; this.fog.tilePositionY += dt * 2; }

    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = 0.1; G.ui.hudTick(this); }
    this.saveT += dt;
    if (this.saveT > 15 && !p.dead) { this.saveT = 0; this.persist(); }
  }

  persist() {
    const st = G.st, p = this.player;
    if (p.dead) return;
    st.hp = p.hp; st.mp = this.mp; st.pos = { zone: this.zoneId, x: p.x, y: p.y };
    saveGame(st, G.slot);
  }
}
