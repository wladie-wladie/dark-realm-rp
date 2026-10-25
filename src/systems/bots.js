// Боты-герои для арены: любой класс и подкласс, уровень и снаряжение «как у игрока того же уровня».
// Пользуются навыками своего класса по тем же числам (множители, перезарядка, мана), что и герой.
// Урон между ботами считается одной формулой — это делает арену пригодной для сравнения классов.
import Phaser from "phaser";
import { G } from "../core/G.js";
import { CLASSES, allSkills } from "../data/classes.js";
import { MONSTERS } from "../data/monsters.js";
import { newCharacter, derive, skillValues } from "./state.js";
import { makeGear } from "../data/items.js";
import { Actor } from "./entities.js";
import { artSheet } from "../art/registry.js";
import { heroArtKey } from "../art/looks.js";

const rand = (a, b) => a + Math.random() * (b - a);
// урон героев рассчитан на монстров; между героями он делится, чтобы бой длился 10–30 секунд (как PvP в MMO)
export const PVP = 0.22;
// общий откат навыков: после любого навыка остальные недоступны
export const GCD = 2;

// синтетический герой: уровень, характеристики, навыки и снаряжение по уровню
export function botState(cls, sub, level, gender = "m") {
  const st = newCharacter({ name: CLASSES[cls].name, cls, look: { gender, skin: 1, hair: 0, hairColor: 1, beard: 0, eyes: 0, scar: 0 } });
  st.level = level;
  const c = CLASSES[cls];
  for (const k of Object.keys(c.grow)) st.attr[k] += c.grow[k] * (level - 1);
  // очки характеристик: 3 за уровень — в основные характеристики класса и выносливость
  const main = { warrior: ["str", "vit"], ranger: ["dex", "dex"], rogue: ["dex", "str"], mage: ["int", "int"], cleric: ["str", "int"], warlock: ["int", "vit"] }[cls] || ["str"];
  for (let i = 0; i < (level - 1) * 3; i++) st.attr[i % 3 === 2 ? "vit" : main[i % 2]]++;
  st.sub = level >= 10 ? sub || null : null;
  st.skills = {};
  for (const s of allSkills(cls, st.sub)) if (s.lvl <= level) st.skills[s.id] = Math.min(5, 1 + Math.floor((level - s.lvl) / 3));
  const tier = Math.min(4, 1 + Math.floor((level - 1) / 7)), q = 1;
  st.equip.weapon = makeGear({ slot: "weapon", tier, quality: q, cls });
  for (const slot of ["head", "chest", "boots"]) st.equip[slot] = makeGear({ slot, type: c.armor, tier, quality: q, cls });
  st.equip.ring = makeGear({ slot: "ring", tier, quality: q, cls });
  st.equip.amulet = makeGear({ slot: "amulet", tier, quality: q, cls });
  return st;
}

export class Bots {
  constructor(W) { this.W = W; this.list = []; this.fx = []; this.onDeath = null; }

  // team: "A" | "B"; против героя — "B", герой считается командой "A"
  spawn(cls, sub, level, x, y, team, gender = "m") {
    const W = this.W, st = botState(cls, sub, level, gender);
    const key = heroArtKey(st) || "hero";
    const art = artSheet(W, key);
    const b = new Actor(W, { kind: "monster", sheet: "h", tex: art ? art.key : "hero", idleCol: art ? art.idleCol : 0, x, y, scale: 1.05, radius: 13, hp: 100 });
    b.bot = true; b.team = team; b.st = st; b.cls = cls; b.buffs = []; b.cds = {}; b.cd = 0.5; b.shield = 0;
    b.def = { name: CLASSES[cls].name + (st.sub ? " · " + CLASSES[cls].subclasses[st.sub].name : ""), lvl: level, xp: 0, gold: [0, 0], attack: { range: 50 } };
    b.mid = "bot"; b.lvl = level; b.speed = 150; b.home = { x, y };
    this.recalc(b); b.hp = b.maxHp; b.mp = b.ps.mp;
    b.label = W.add.text(x, y, b.def.name, { fontFamily: "Georgia, serif", fontSize: "14px", color: team === "A" ? "#a0d0ff" : "#ff9a80", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(100002);
    b.bar = W.add.graphics().setDepth(100001);
    b.sprite.setCollideWorldBounds(true);
    W.monsters.push(b); if (W.monsterGroup) W.monsterGroup.add(b.sprite);
    b.stats = { dealt: 0, taken: 0, healed: 0, born: W.clock };
    this.list.push(b);
    return b;
  }
  recalc(b) {
    b.ps = derive(b.st, b.buffs.filter(x => x.until > this.W.clock));
    const frac = b.maxHp ? b.hp / b.maxHp : 1;
    b.maxHp = b.ps.hp; b.hp = Math.max(1, Math.round(b.maxHp * frac)); b.defense = b.ps.def; b.atk = b.ps.atk;
    b.speed = 150 * (1 + b.ps.move / 100);
  }
  enemiesOf(b) {
    const W = this.W, out = this.list.filter(o => !o.dead && o.team !== b.team);
    if (b.team === "B" && !W.player.dead && !W.arenaSpectate) out.push(W.player, ...W.allies.filter(a => !a.dead));
    return out;
  }
  nearest(b, list) { let best = null, bd = 1e9; for (const t of list) { const d = Math.hypot(t.x - b.x, t.y - b.y); if (d < bd) { bd = d; best = t; } } return [best, bd]; }

  // ---------- урон ----------
  damage(src, t, base, o = {}) {
    const W = this.W;
    if (!t || t.dead) return 0;
    base *= PVP;
    if (t === W.player) { W.combat.hitFriendly(t, base / 1.6, { status: o.status, src }); src.stats.dealt += base; return base; }
    if (!t.bot) { // союзник героя
      W.combat.hitFriendly(t, base / 1.4, {}); return base;
    }
    const sp = src.ps || { dmg: 0, crit: 5, critDmg: 150, lifesteal: 0 }, tp = t.ps;
    if (Math.random() * 100 < tp.dodge) { W.combat.text(t.x, t.cy - 24, "Уклонение", "#a0d0ff", 14); return 0; }
    let dmg = base * rand(0.9, 1.1) * (1 + (sp.dmg || 0) / 100);
    if (o.execute && t.hp < t.maxHp * 0.35) dmg *= 3;
    let crit = false;
    if (Math.random() * 100 < (sp.crit || 0) + (o.critBonus || 0)) { crit = true; dmg *= (sp.critDmg || 150) / 100; }
    dmg *= 100 / (100 + tp.def * 1.5);
    if (Math.random() * 100 < tp.block) { dmg *= 0.4; W.combat.text(t.x, t.cy - 30, "Блок", "#c0c0d0", 13); }
    dmg = Math.max(1, Math.round(dmg));
    if (t.shield > 0) { const ab = Math.min(t.shield, dmg); t.shield -= ab; dmg -= ab; }
    t.hp -= dmg; t.hurtT = 0.08;
    src.stats && (src.stats.dealt += dmg); t.stats && (t.stats.taken += dmg);
    W.combat.text(t.x, t.cy - 20, String(dmg), crit ? "#ffd040" : o.magic ? "#a8c8ff" : "#ffffff", crit ? 18 : 16, crit);
    if (sp.lifesteal && src.hp > 0) this.heal(src, dmg * sp.lifesteal / 100, true);
    if (o.drain) this.heal(src, dmg * o.drain / 100, true);
    if (tp.thorns && !src.dead && src.bot) { src.hp -= Math.round(dmg * tp.thorns / 100); }
    if (o.status) W.combat.status(t, o.status, "bot");
    if (o.status2) W.combat.status(t, o.status2, "bot");
    if (t.hp <= 0) this.kill(t);
    return dmg;
  }
  heal(b, n, quiet) {
    if (b.dead) return; const before = b.hp; b.hp = Math.min(b.maxHp, b.hp + n);
    const d = Math.round(b.hp - before); if (b.stats) b.stats.healed += d;
    if (!quiet && d > 0) this.W.combat.text(b.x, b.cy - 30, "+" + d, "#70ff80", 15);
  }
  kill(b) {
    if (b.dead) return;
    b.dead = true; b.sprite.body.enable = false; b.bar.clear(); if (b.label) b.label.destroy();
    this.W.tweens.add({ targets: b.sprite, alpha: 0, duration: 700, onComplete: () => b.destroy() });
    this.W.combat.burst(b.x, b.cy, "#a02020", 12, 100, 500);
    this.onDeath && this.onDeath(b);
  }

  // самонаводящийся снаряд бота (попадает в выбранную цель)
  shoot(b, t, tex, color, speed, onHit) {
    const W = this.W, isArrow = tex === "arrow";
    const s = W.add.image(b.x, b.cy, isArrow ? "fx_arrow" : "fx_glow_" + tex).setDepth(b.y + 100);
    if (!isArrow) s.setBlendMode(Phaser.BlendModes.ADD).setScale(0.7);
    this.fx.push({ s, t, speed, onHit, color });
  }

  // ---------- навыки ----------
  useSkill(b, s, t, td) {
    const W = this.W, v = skillValues(b.st, s), ps = b.ps, C = W.combat;
    const magic = s.dmgType === "magic", base = (magic ? ps.matk : ps.atk) * v.mul;
    const color = s.color || (s.icon && s.icon[1]) || "#ffffff";
    const o = { magic, status: s.status, status2: s.status2, critBonus: s.critBonus, execute: s.execute, drain: s.drain };
    const foes = this.enemiesOf(b);
    const inR = (x, y, r) => foes.filter(f => Math.hypot(f.x - x, (f.y - y) * 1.3) < r + f.radius);
    if (s.hpCost) b.hp = Math.max(1, b.hp - b.maxHp * s.hpCost / 100);
    switch (s.cast) {
      case "melee": {
        if (!t || td > s.range + t.radius + 10) return false;
        b.startAttack(0.3);
        const ang = Math.atan2(t.y - b.y, t.x - b.x);
        C.slashFx(b, ang, s.range, s.arc, color);
        for (let i = 0; i < (s.hits || 1); i++) C.later(i * 0.12, () => { for (const f of inR(b.x, b.y, s.range)) { const a = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(f.y - b.y, f.x - b.x) - ang)); if (a < s.arc / 2 * Math.PI / 180 + 0.3) this.damage(b, f, base, o); } });
        return true;
      }
      case "proj": {
        if (!t || td > s.range) return false;
        b.startCast(0.3);
        const n = s.count || 1;
        const targets = foes.filter(f => Math.hypot(f.x - b.x, f.y - b.y) < s.range).sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y));
        for (let i = 0; i < n; i++) {
          const tt = s.burst ? t : targets[i % Math.max(1, Math.min(targets.length, s.pierce ? 1 : n))] || t;
          C.later(s.burst ? i * s.burst : 0, () => this.shoot(b, tt, s.proj || "orb", color, s.speed || 520, f => {
            if (s.aoe) { C.ringFx(f.x, f.y, s.aoe, color, 350); for (const g of inR(f.x, f.y, s.aoe)) this.damage(b, g, base, o); }
            else this.damage(b, f, base, o);
          }));
        }
        return true;
      }
      case "aoe": {
        let x = b.x, y = b.y;
        if (s.at === "target") { if (!t || td > 460) return false; x = t.x; y = t.y; }
        else if (s.at === "front") { if (!t || td > 200) return false; const a = Math.atan2(t.y - b.y, t.x - b.x); x += Math.cos(a) * 70; y += Math.sin(a) * 60; }
        else if (!t || td > s.radius + 30) return false;
        b.startCast(0.35);
        C.area({ x, y, radius: s.radius, delay: s.delay || 0, ticks: s.ticks || 1, interval: s.interval || 0.5, color, owner: "bot", strikes: s.strikes,
          onTick: () => { if (s.healPct) this.heal(b, b.maxHp * s.healPct / 100 * (1 + ps.heal / 100) * 0.5); for (const f of inR(x, y, s.radius)) this.damage(b, f, base, o); } });
        return true;
      }
      case "dash": case "blink": {
        if (!t || td > (s.dist || s.range || 200) + 40 || td < 70) return false;
        b.startAttack(0.25);
        const a = Math.atan2(t.y - b.y, t.x - b.x), d = Math.max(0, td - t.radius - 26);
        C.burst(b.x, b.cy, color, 10, 100, 300);
        b.sprite.setPosition(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d);
        this.damage(b, t, base, { ...o, critBonus: s.cast === "blink" ? 25 : 0 });
        return true;
      }
      case "chain": {
        if (!t || td > s.range) return false;
        b.startCast(0.3);
        let fx = b.x, fy = b.cy; const hit = new Set();
        for (let j = 0; j < s.jumps; j++) {
          let best = null, bd = j === 0 ? s.range : 220;
          for (const f of foes) { if (hit.has(f)) continue; const d = Math.hypot(f.x - fx, f.y - fy); if (d < bd) { bd = d; best = f; } }
          if (!best) break; hit.add(best); C.beam(fx, fy, best.x, best.cy, "#f0f080"); this.damage(b, best, base * Math.pow(0.88, j), o); fx = best.x; fy = best.cy;
        }
        return true;
      }
      case "trap": {
        if (!t || td > 260) return false;
        b.startCast(0.3);
        C.area({ x: t.x, y: t.y, radius: s.radius * 1.6, delay: 0.6, color: "#c0a070", owner: "bot", onTick: () => { for (const f of inR(t.x, t.y, s.radius * 1.6)) this.damage(b, f, base, o); } });
        return true;
      }
      case "buff": {
        if (!t || td > 420) return false;
        b.startCast(0.35);
        b.buffs = b.buffs.filter(x => x.id !== s.id); b.buffs.push({ id: s.id, stats: s.stats, until: W.clock + v.dur }); this.recalc(b);
        C.ringFx(b.x, b.y, 80, color, 450);
        if (s.aoeStatus) for (const f of inR(b.x, b.y, s.radius || 150)) W.combat.status(f, s.aoeStatus, "bot");
        return true;
      }
      case "heal": {
        if (b.hp > b.maxHp * 0.65) return false;
        b.startCast(0.35);
        const mul = 1 + ps.heal / 100;
        if (v.pct) this.heal(b, b.maxHp * v.pct / 100 * mul);
        if (s.hot) { b.buffs.push({ id: s.id, stats: { hpRegen: b.maxHp * s.hot / 100 / s.dur * mul }, until: W.clock + s.dur }); this.recalc(b); }
        C.burst(b.x, b.cy, "#80ff90", 16, 90, 600);
        return true;
      }
      case "shield": {
        if (!t || td > 420) return false;
        b.startCast(0.35);
        b.shield = Math.max(b.shield, b.maxHp * v.pct / 100);
        if (s.stats) { b.buffs.push({ id: s.id, stats: s.stats, until: W.clock + s.dur }); this.recalc(b); }
        C.ringFx(b.x, b.y, 70, color, 500);
        return true;
      }
      case "summon": {
        if (!t || td > 420 || this.list.filter(m => m.minionOf === b && !m.dead).length >= 4) return false;
        b.startCast(0.45);
        const powr = Math.max(ps.atk, ps.matk) * (1 + 0.12 * (v.rank - 1)) * (1 + v.mastery * 0.02);
        for (let i = 0; i < s.count; i++) this.spawnMinion(b, s.mob, powr, s.dur);
        C.burst(b.x, b.y, color, 16, 120, 500);
        return true;
      }
    }
    return false;
  }

  spawnMinion(owner, mob, powr, dur) {
    const W = this.W, d = MONSTERS[mob];
    const [tex, sheet, idleCol] = W.monsterTex(mob);
    const m = new Actor(W, { kind: "monster", sheet, tex, idleCol, x: owner.x + rand(-50, 50), y: owner.y + rand(-30, 30), scale: d.scale, radius: 12, hp: Math.round(owner.maxHp * d.hp * (1 + owner.ps.summon / 100)), flying: d.flying, def: d, alpha: d.alpha });
    m.bot = true; m.minionOf = owner; m.team = owner.team; m.def = { ...d, name: d.name, lvl: owner.lvl, xp: 0, gold: [0, 0] };
    m.mid = "bot"; m.ps = { dodge: 0, def: owner.ps.def * 0.6, block: 0, dmg: owner.ps.summon || 0, crit: 5, critDmg: 150, thorns: 0, lifesteal: 0 };
    m.defense = m.ps.def; m.dmgPow = powr * d.atk * (1 + owner.ps.summon / 100) * 0.5; m.speed = d.speed; m.cd = 0.5; m.expire = W.clock + dur;
    m.stats = owner.stats; m.bar = W.add.graphics().setDepth(100001); m.shield = 0;
    W.monsters.push(m); if (W.monsterGroup) W.monsterGroup.add(m.sprite);
    this.list.push(m);
  }

  // ---------- ход ----------
  update(dt) {
    const W = this.W;
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i], s = f.s;
      if (!f.t || f.t.dead) { s.destroy(); this.fx.splice(i, 1); continue; }
      const dx = f.t.x - s.x, dy = f.t.cy - s.y, d = Math.hypot(dx, dy), step = f.speed * dt;
      s.setRotation(Math.atan2(dy, dx));
      if (d <= step + 10) { f.onHit(f.t); W.combat.burst(s.x, s.y, f.color, 5, 80, 250); s.destroy(); this.fx.splice(i, 1); continue; }
      s.x += dx / d * step; s.y += dy / d * step; s.setDepth(s.y + 100);
    }
    for (const b of this.list) if (!b.dead) this.tick(b, dt);
    this.list = this.list.filter(b => !b.dead || b.sprite.active);
  }

  tick(b, dt) {
    const W = this.W, body = b.sprite.body;
    const mods = W.combat.tickStatuses(b, dt);
    if (b.dead) return;
    b.animate(dt);
    if (b.label) b.label.setPosition(b.x, b.y - 62 * b.scale - 16);
    b.bar.clear();
    const w = 48, x = b.x - w / 2, y = b.y - 62 * b.scale - 6;
    b.bar.fillStyle(0x000000, 0.7).fillRect(x - 1, y - 1, w + 2, 7);
    b.bar.fillStyle(b.team === "A" ? 0x3a90e0 : 0xc02a20, 1).fillRect(x, y, w * Math.max(0, b.hp / b.maxHp), 5);
    if (b.shield > 0) b.bar.fillStyle(0xa0c0ff, 1).fillRect(x, y - 3, Math.min(w, w * b.shield / b.maxHp), 2);
    if (b.minionOf) {
      if (W.clock > b.expire || b.minionOf.dead) return this.kill(b);
    } else {
      // восстановление, баффы
      b.hp = Math.min(b.maxHp, b.hp + b.ps.hpRegen * dt); b.mp = Math.min(b.ps.mp, b.mp + b.ps.mpRegen * dt);
      if (b.buffs.some(x => x.until <= W.clock)) { b.buffs = b.buffs.filter(x => x.until > W.clock); this.recalc(b); }
      for (const k of Object.keys(b.cds)) b.cds[k] -= dt;
    }
    if (mods.stunned) { body.setVelocity(0, 0); return; }
    const [t, td] = this.nearest(b, this.enemiesOf(b));
    if (!t) { body.setVelocity(0, 0); return; }
    b.face(t.x - b.x, t.y - b.y);
    const spd = b.speed * mods.slow;
    // навыки (у героев-ботов)
    b.gcd = (b.gcd || 0) - dt;
    if (!b.minionOf && b.cd <= 0.3 && b.gcd <= 0) {
      for (const s of allSkills(b.cls, b.st.sub)) {
        if (s.kind !== "active" || !b.st.skills[s.id] || (b.cds[s.id] || 0) > 0) continue;
        const v = skillValues(b.st, s);
        if (b.mp < v.mp) continue;
        if (this.useSkill(b, s, t, td)) { b.mp -= v.mp; b.cds[s.id] = v.cd * (1 - b.ps.cdr / 100); b.cd = 0.45; b.gcd = GCD; break; }
      }
    }
    // обычная атака
    const atk = b.minionOf ? { type: b.def.attack.proj ? "proj" : "melee", range: b.def.attack.range, proj: b.def.attack.proj } : CLASSES[b.cls].attack;
    const reach = (atk.range || 60) + t.radius;
    if (td > reach * 0.85) { const a = Math.atan2(t.y - b.y, t.x - b.x); body.setVelocity(Math.cos(a) * spd, Math.sin(a) * spd); }
    else if (atk.type === "proj" && td < 130 && !b.minionOf) { const a = Math.atan2(b.y - t.y, b.x - t.x); body.setVelocity(Math.cos(a) * spd * 0.7, Math.sin(a) * spd * 0.7); }
    else body.setVelocity(0, 0);
    b.cd -= dt;
    if (td <= reach && b.cd <= 0) {
      if (b.minionOf) { b.cd = b.def.attack.cd || 1.2; b.startAttack(0.3); this.damage(b, t, b.dmgPow, {}); return; }
      b.cd = 0.62 / ((atk.speed || 1) * (1 + b.ps.aspd / 100));
      b.startAttack(0.28);
      const base = (atk.dmgType === "magic" ? b.ps.matk : b.ps.atk) * atk.mul;
      if (atk.type === "melee") { W.combat.slashFx(b, Math.atan2(t.y - b.y, t.x - b.x), atk.range, atk.arc || 90); this.damage(b, t, base, {}); }
      else this.shoot(b, t, atk.proj === "arrow" ? "arrow" : atk.proj, { orb: "#80c0ff", dark: "#a040d0" }[atk.proj] || "#ffffff", atk.pspeed || 520, f => this.damage(b, f, base, { magic: atk.dmgType === "magic" }));
    }
  }

  clear() { for (const b of this.list) { if (b.label) b.label.destroy(); b.bar && b.bar.destroy(); if (!b.dead) b.destroy(); b.dead = true; } this.list = []; this.W.monsters = this.W.monsters.filter(m => !m.bot); for (const f of this.fx) f.s.destroy(); this.fx = []; }
}
