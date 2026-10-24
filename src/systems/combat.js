// Бой: урон, эффекты, снаряды, области, применение навыков героя.
import Phaser from "phaser";
import { G } from "../core/G.js";
import { STATUS } from "../data/classes.js";
import { skillValues, derive } from "./state.js";

const rand = (a, b) => a + Math.random() * (b - a);
const colInt = hex => parseInt(hex.replace("#", ""), 16);

export class Combat {
  constructor(W) {
    this.W = W;
    this.projs = []; this.areas = []; this.traps = []; this.delayed = [];
  }

  // ---------- эффекты ----------
  text(x, y, str, color = "#ffffff", size = 20, crit = false) {
    const t = this.W.add.text(x + rand(-8, 8), y, str, {
      fontFamily: "Georgia, serif", fontSize: (crit ? size * 1.35 : size) + "px", color, stroke: "#000000", strokeThickness: 4, fontStyle: crit ? "bold" : "normal",
    }).setOrigin(0.5).setDepth(100000);
    this.W.tweens.add({ targets: t, y: y - 46, alpha: { from: 1, to: 0 }, scale: crit ? { from: 1.3, to: 1 } : 1, duration: 900, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
  }
  burst(x, y, color, n = 10, speed = 120, life = 500, tex = "fx_spark", scale = 0.6) {
    const W = this.W;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = speed * (0.4 + Math.random() * 0.8);
      const p = W.add.image(x, y, tex).setTint(colInt(color)).setBlendMode(Phaser.BlendModes.ADD).setScale(scale * rand(0.6, 1.2)).setDepth(y + 50);
      W.tweens.add({ targets: p, x: x + Math.cos(a) * sp * life / 1000, y: y + Math.sin(a) * sp * life / 1000 - 10, alpha: 0, scale: 0.1, duration: life * rand(0.7, 1.2), onComplete: () => p.destroy() });
    }
  }
  slashFx(a, angle, range, arc, color = "#fff6e0") {
    const s = this.W.add.image(a.x, a.cy + 6, "fx_slash").setBlendMode(Phaser.BlendModes.ADD).setTint(colInt(color)).setDepth(a.y + 40);
    s.setRotation(angle); s.setScale(range / 62 * (arc > 140 ? 1.1 : 1), range / 62 * Math.max(0.6, arc / 120));
    this.W.tweens.add({ targets: s, alpha: { from: 0.95, to: 0 }, scale: s.scaleX * 1.15, duration: 230, onComplete: () => s.destroy() });
  }
  ringFx(x, y, radius, color, dur = 400) {
    const r = this.W.add.image(x, y, "fx_ring").setBlendMode(Phaser.BlendModes.ADD).setTint(colInt(color)).setDepth(y + 30).setScale(0.1, 0.06);
    this.W.tweens.add({ targets: r, scaleX: radius / 110, scaleY: radius / 110 * 0.6, alpha: { from: 1, to: 0 }, duration: dur, ease: "Cubic.easeOut", onComplete: () => r.destroy() });
  }
  zoneMark(x, y, radius, color, dur) {
    const z = this.W.add.image(x, y, "fx_zone").setTint(colInt(color)).setBlendMode(Phaser.BlendModes.ADD).setDepth(1).setScale(radius / 127, radius / 127 * 0.6).setAlpha(0.8);
    this.W.tweens.add({ targets: z, alpha: 0.35, yoyo: true, repeat: -1, duration: 300 });
    this.W.time.delayedCall(dur * 1000, () => z.destroy());
    return z;
  }
  lightning(x, y) {
    const l = this.W.add.image(x, y, "fx_lightning").setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(y + 60).setScale(1, 1.2);
    this.W.tweens.add({ targets: l, alpha: 0, duration: 260, onComplete: () => l.destroy() });
    this.burst(x, y, "#f0f080", 8, 140, 300);
  }
  beam(x1, y1, x2, y2, color) {
    const g = this.W.add.graphics().setDepth(100000).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(3, colInt(color), 1);
    g.beginPath(); g.moveTo(x1, y1);
    const n = 6; for (let i = 1; i < n; i++) { const t = i / n; g.lineTo(x1 + (x2 - x1) * t + rand(-10, 10), y1 + (y2 - y1) * t + rand(-10, 10)); }
    g.lineTo(x2, y2); g.strokePath();
    this.W.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() });
  }

  // ---------- урон ----------
  // от героя/союзника по монстру
  hitMonster(m, base, opts = {}) {
    if (m.dead) return 0;
    const W = this.W, ps = W.pstats;
    let dmg = base * rand(0.9, 1.1);
    let dmgPct = ps.dmg + (opts.ally ? ps.summon : 0);
    if (ps.lowHpDmg && W.player.hp < W.player.maxHp * 0.5) dmgPct += ps.lowHpDmg * (1 - W.player.hp / W.player.maxHp) * 2;
    if (ps.executeDmg && m.hp < m.maxHp * 0.5) dmgPct += ps.executeDmg;
    dmg *= 1 + dmgPct / 100;
    if (opts.execute && m.hp < m.maxHp * 0.35) dmg *= 3;
    if (opts.holy && m.def?.undead) dmg *= 2;
    if (m.statuses.some(s => s.type === "weaken")) dmg *= 1.2;
    let crit = false;
    if (!opts.dot && Math.random() * 100 < ps.crit + (opts.critBonus || 0)) { crit = true; dmg *= ps.critDmg / 100; }
    if (!opts.dot) dmg *= 100 / (100 + m.defense * 1.5);
    dmg = Math.max(1, Math.round(dmg));
    m.hp -= dmg;
    if (!opts.dot) { m.hurtT = 0.08; m.aggro = true; }
    this.text(m.x, m.cy - 20, String(dmg), opts.dot ? "#c0a0ff" : crit ? "#ffd040" : opts.magic ? "#a8c8ff" : "#ffffff", opts.dot ? 15 : 19, crit);
    if (!opts.dot && !opts.ally) {
      if (ps.lifesteal) W.healPlayer(dmg * ps.lifesteal / 100, true);
      if (opts.drain) W.healPlayer(dmg * opts.drain / 100);
      const chance = (t, c) => c && Math.random() * 100 < c && this.status(m, [t, 3], "player");
      chance("bleed", ps.bleedChance); chance("poison", ps.poisonChance); chance("burn", ps.burnChance);
      for (const b of W.buffs) if (b.onHit) this.status(m, b.onHit, "player");
      W.wearWeapon();
    }
    if (opts.status) this.status(m, opts.status, "player");
    if (opts.status2) this.status(m, opts.status2, "player");
    if (opts.kb && !m.def?.boss) {
      const a = Math.atan2(m.y - (opts.fromY ?? W.player.y), m.x - (opts.fromX ?? W.player.x));
      m.knock = { vx: Math.cos(a) * opts.kb * 5, vy: Math.sin(a) * opts.kb * 5, t: 0.15 };
    }
    if (m.hp <= 0) W.killMonster(m);
    return dmg;
  }

  // от монстра по герою или союзнику
  hitFriendly(t, atk, opts = {}) {
    const W = this.W;
    if (t.dead) return;
    if (t === W.player) {
      if (W.invuln > 0) return;
      const ps = W.pstats;
      if (Math.random() * 100 < ps.dodge) { this.text(t.x, t.cy - 24, "Уклонение", "#a0d0ff", 16); return; }
      let dmg = atk * 1.6 * (opts.mul || 1) * rand(0.9, 1.1) * 100 / (100 + ps.def);
      if (Math.random() * 100 < ps.block) { dmg *= 0.4; this.text(t.x, t.cy - 30, "Блок", "#c0c0d0", 15); }
      dmg = Math.max(1, Math.round(dmg));
      if (W.shield > 0) { const ab = Math.min(W.shield, dmg); W.shield -= ab; dmg -= ab; if (ab) this.text(t.x + 14, t.cy - 30, "−" + ab, "#a0c0ff", 14); }
      if (dmg <= 0) return;
      t.hp -= dmg; t.hurtT = 0.08;
      W.cameras.main.shake(90, 0.004);
      this.text(t.x, t.cy - 24, String(dmg), "#ff5040", 19);
      if (ps.thorns && opts.src && !opts.src.dead) this.hitMonster(opts.src, dmg * ps.thorns / 100, { dot: true });
      W.wearArmor();
      if (opts.status) this.status(t, opts.status, "enemy");
      if (t.hp <= 0) W.playerDied();
    } else {
      const dmg = Math.max(1, Math.round(atk * 1.4 * (opts.mul || 1) * rand(0.9, 1.1) * 100 / (100 + (t.defense || 10))));
      t.hp -= dmg; t.hurtT = 0.08;
      this.text(t.x, t.cy - 20, String(dmg), "#ff9070", 15);
      if (t.hp <= 0) W.killAlly(t);
    }
  }

  status(t, [type, dur], src) {
    if (t.dead) return;
    if (t.def?.boss && (type === "stun" || type === "freeze" || type === "fear")) dur *= 0.35;
    const ex = t.statuses.find(s => s.type === type);
    let power = 0;
    if (src === "player") { const ps = this.W.pstats; power = Math.max(ps.atk, ps.matk) * 0.22 * (1 + ps.dot / 100); }
    else if (src === "enemy") power = 4 + (this.W.zoneLvl || 1) * 1.6;
    if (ex) { ex.until = Math.max(ex.until, this.W.clock + dur); ex.power = Math.max(ex.power, power); return; }
    t.statuses.push({ type, until: this.W.clock + dur, tick: this.W.clock + 1, power, src });
    if (type === "stun" || type === "freeze" || type === "fear") this.text(t.x, t.cy - 40, STATUS[type].name, STATUS[type].color, 14);
  }

  // возвращает модификаторы движения/действий
  tickStatuses(t, dt) {
    const W = this.W, now = W.clock;
    let stunned = false, slow = 1, fear = false;
    for (let i = t.statuses.length - 1; i >= 0; i--) {
      const s = t.statuses[i];
      if (now >= s.until) { t.statuses.splice(i, 1); continue; }
      if (s.type === "stun") stunned = true;
      if (s.type === "freeze") { stunned = now < s.until - 0.6 || stunned; slow = Math.min(slow, 0.5); }
      if (s.type === "slow") slow = Math.min(slow, 0.55);
      if (s.type === "fear") fear = true;
      if ((s.type === "burn" || s.type === "poison" || s.type === "bleed" || s.type === "curse") && now >= s.tick) {
        s.tick += 1;
        if (t === W.player) { const d = Math.max(1, Math.round(s.power)); t.hp -= d; this.text(t.x, t.cy - 18, String(d), STATUS[s.type].color, 14); if (t.hp <= 0) W.playerDied(); }
        else if (t.kind === "monster") this.hitMonster(t, s.power, { dot: true });
      }
    }
    return { stunned, slow, fear };
  }

  // ---------- снаряды ----------
  proj(o) {
    // o: { x, y, angle, speed, range, tex, tint, owner ('player'|'enemy'|'ally'), pierce, onHit(target, p), aoe, scale, glow }
    const W = this.W;
    const isArrow = o.tex === "arrow" || o.tex === "knife" || o.tex === "bolt";
    const s = W.add.image(o.x, o.y, isArrow ? "fx_" + o.tex : "fx_glow_" + o.tex).setDepth(o.y + 100);
    if (!isArrow) { s.setBlendMode(Phaser.BlendModes.ADD).setScale(o.scale || 0.7); if (o.tex === "doom") s.setScale(1.3); }
    s.setRotation(o.angle);
    const p = { ...o, s, dist: 0, hit: new Set(), vx: Math.cos(o.angle) * o.speed, vy: Math.sin(o.angle) * o.speed, trail: !isArrow };
    this.projs.push(p);
    return p;
  }
  updateProjs(dt) {
    const W = this.W;
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.s.x += p.vx * dt; p.s.y += p.vy * dt; p.dist += p.speed * dt;
      p.s.setDepth(p.s.y + 100);
      if (p.trail && Math.random() < 0.6) {
        const tr = W.add.image(p.s.x, p.s.y, p.s.texture.key).setBlendMode(Phaser.BlendModes.ADD).setScale(p.s.scaleX * 0.6).setAlpha(0.6).setDepth(p.s.depth - 1);
        W.tweens.add({ targets: tr, alpha: 0, scale: 0.05, duration: 260, onComplete: () => tr.destroy() });
      }
      let done = p.dist >= p.range;
      const targets = p.owner === "enemy" ? W.friendlies() : W.monsters.filter(m => !m.dead);
      for (const t of targets) {
        if (p.hit.has(t)) continue;
        const dx = t.x - p.s.x, dy = t.cy - p.s.y;
        if (dx * dx + dy * dy < (t.radius + 16) * (t.radius + 16) * 1.4) {
          p.hit.add(t);
          if (p.aoe) { this.explode(p, p.s.x, p.s.y); done = true; break; }
          p.onHit(t, p);
          if ((p.pierce || 0) < p.hit.size) { done = true; break; }
        }
      }
      if (!done && W.blockedAt(p.s.x, p.s.y + 20) && !p.pierceWalls) done = true;
      if (done) {
        if (p.aoe && !p.exploded) this.explode(p, p.s.x, p.s.y);
        else this.burst(p.s.x, p.s.y, p.color || "#ffffff", 5, 80, 250);
        p.s.destroy(); this.projs.splice(i, 1);
      }
    }
  }
  explode(p, x, y) {
    if (p.exploded) return; p.exploded = true;
    this.ringFx(x, y, p.aoe, p.color || "#ffffff", 350);
    this.burst(x, y, p.color || "#ffffff", 16, 200, 450);
    const targets = p.owner === "enemy" ? this.W.friendlies() : this.W.monsters.filter(m => !m.dead);
    for (const t of targets) if (Math.hypot(t.x - x, t.y - y) < p.aoe + t.radius) p.onHit(t, p);
  }

  // ---------- области ----------
  area(o) {
    // o: { x, y, radius, delay, ticks, interval, color, owner, onTick(targets, area), follow, strikes }
    const a = { ...o, t: -(o.delay || 0), n: 0, next: 0 };
    if (o.delay) a.mark = this.zoneMark(o.x, o.y, o.radius, o.color, o.delay + 0.05);
    if ((o.ticks || 1) > 1) a.field = this.zoneMark(o.x, o.y, o.radius, o.color, (o.delay || 0) + (o.ticks * (o.interval || 0.5)) + 0.1);
    this.areas.push(a);
  }
  updateAreas(dt) {
    const W = this.W;
    for (let i = this.areas.length - 1; i >= 0; i--) {
      const a = this.areas[i];
      a.t += dt;
      if (a.follow) { a.x = W.player.x; a.y = W.player.y; if (a.field) { a.field.x = a.x; a.field.y = a.y; } }
      if (a.t < 0) continue;
      if (a.t >= a.next) {
        a.n++; a.next += a.interval || 0.5;
        const targets = a.owner === "enemy" ? W.friendlies() : W.monsters.filter(m => !m.dead);
        const inside = targets.filter(t => Math.hypot(t.x - a.x, (t.y - a.y) * 1.4) < a.radius + t.radius);
        if (a.strikes) {
          const pick = inside.length ? inside[Math.floor(Math.random() * inside.length)] : null;
          const sx = pick ? pick.x : a.x + rand(-a.radius, a.radius) * 0.7, sy = pick ? pick.y : a.y + rand(-a.radius, a.radius) * 0.4;
          this.lightning(sx, sy);
          a.onTick(pick ? [pick] : [], a);
        } else {
          if ((a.ticks || 1) === 1) { this.ringFx(a.x, a.y, a.radius, a.color, 450); this.burst(a.x, a.y, a.color, 18, a.radius * 1.3, 500); }
          else this.burst(a.x + rand(-a.radius, a.radius) * 0.6, a.y + rand(-a.radius, a.radius) * 0.35, a.color, 4, 60, 400);
          a.onTick(inside, a);
        }
        if (a.n >= (a.ticks || 1)) this.areas.splice(i, 1);
      }
    }
  }

  updateTraps(dt) {
    const W = this.W;
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const tr = this.traps[i];
      tr.life -= dt;
      const m = W.monsters.find(m => !m.dead && Math.hypot(m.x - tr.x, m.y - tr.y) < tr.radius);
      if (m || tr.life <= 0) {
        if (m) { this.ringFx(tr.x, tr.y, tr.radius * 1.6, "#c0a070"); for (const t of W.monsters) if (!t.dead && Math.hypot(t.x - tr.x, t.y - tr.y) < tr.radius * 1.6) this.hitMonster(t, tr.dmg, { status: tr.status }); }
        tr.s.destroy(); this.traps.splice(i, 1);
      }
    }
  }

  update(dt) {
    this.updateProjs(dt); this.updateAreas(dt); this.updateTraps(dt);
    for (let i = this.delayed.length - 1; i >= 0; i--) { const d = this.delayed[i]; d.t -= dt; if (d.t <= 0) { this.delayed.splice(i, 1); d.fn(); } }
  }
  later(t, fn) { this.delayed.push({ t, fn }); }

  // ---------- навыки героя ----------
  nearestEnemy(range, from) {
    const W = this.W, p = from || W.player;
    let best = null, bd = range;
    for (const m of W.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } }
    return best;
  }
  aimAngle(range) {
    const W = this.W, p = W.player;
    const t = this.nearestEnemy(range);
    if (t) { p.face(t.x - p.x, t.y - p.y); return Math.atan2(t.cy - p.cy, t.x - p.x); }
    if (G.input.mx || G.input.my) return Math.atan2(G.input.my, G.input.mx);
    const [fx, fy] = p.faceVec(); return Math.atan2(fy, fx);
  }

  meleeHit(range, arc, mul, opts = {}) {
    const W = this.W, p = W.player;
    const ang = this.aimAngle(range + 60);
    const [fx, fy] = [Math.cos(ang), Math.sin(ang)];
    this.slashFx(p, ang, range, arc, opts.fxColor);
    let hit = 0;
    for (const m of W.monsters) {
      if (m.dead) continue;
      const dx = m.x - p.x, dy = (m.y - p.y);
      const d = Math.hypot(dx, dy);
      if (d > range + m.radius) continue;
      const a = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dy * fy) / (d || 1))));
      if (d > m.radius + 8 && a > (arc / 2) * Math.PI / 180) continue;
      this.hitMonster(m, mul, opts); hit++;
    }
    return hit;
  }

  basicAttack() {
    const W = this.W, st = G.st, p = W.player, ps = W.pstats;
    const cls = W.classDef, atk = cls.attack;
    const base = atk.dmgType === "magic" ? ps.matk : ps.atk;
    if (atk.type === "melee") {
      p.startAttack(0.28);
      this.meleeHit(atk.range, atk.arc, base * atk.mul, {});
    } else {
      p.startAttack(0.28);
      const ang = this.aimAngle(atk.range);
      const tex = atk.proj === "arrow" ? "arrow" : atk.proj;
      const color = { orb: W.weaponColor(), dark: "#a040d0" }[atk.proj] || "#ffffff";
      this.proj({ x: p.x + Math.cos(ang) * 16, y: p.cy, angle: ang, speed: atk.pspeed, range: atk.range, tex, owner: "player", color,
        onHit: t => this.hitMonster(t, base * atk.mul, { magic: atk.dmgType === "magic" }) });
    }
  }

  castSkill(s) {
    const W = this.W, p = W.player, ps = W.pstats, st = G.st;
    const v = skillValues(st, s);
    const magic = s.dmgType === "magic";
    const base = (magic ? ps.matk : ps.atk) * v.mul;
    const color = s.color || (s.icon && s.icon[1]) || "#ffffff";
    const opts = { magic, status: s.status, status2: s.status2, critBonus: s.critBonus, execute: s.execute, holy: s.holy, drain: s.drain, kb: s.kb };
    if (s.hpCost) { p.hp = Math.max(1, p.hp - p.maxHp * s.hpCost / 100); this.text(p.x, p.cy - 30, "−" + Math.round(p.maxHp * s.hpCost / 100), "#ff3040", 15); }
    switch (s.cast) {
      case "melee": {
        p.startAttack(0.3);
        const hits = s.hits || 1;
        for (let i = 0; i < hits; i++) this.later(i * 0.12, () => this.meleeHit(s.range, s.arc, base, { ...opts, fxColor: s.fx === "fire" ? "#ff8030" : color }));
        if (s.fx === "fire") { const ang = this.aimAngle(s.range); for (let i = 0; i < 14; i++) this.later(i * 0.02, () => this.burst(p.x + Math.cos(ang) * s.range * (i / 14), p.cy + Math.sin(ang) * s.range * (i / 14), "#ff7020", 2, 40, 300)); }
        break;
      }
      case "proj": {
        p.startCast(0.3);
        const ang = this.aimAngle(s.range);
        const n = s.count || 1;
        const fire = (a) => this.proj({ x: p.x + Math.cos(a) * 18, y: p.cy, angle: a, speed: s.speed, range: s.range, tex: s.proj, owner: "player", pierce: s.pierce || 0, aoe: s.aoe, color,
          onHit: t => this.hitMonster(t, base, { ...opts, fromX: p.x, fromY: p.y }) });
        if (s.burst) for (let i = 0; i < n; i++) this.later(i * s.burst, () => fire(this.aimAngle(s.range) + rand(-0.05, 0.05)));
        else if (n === 1) fire(ang);
        else {
          const spread = (s.spread || 30) * Math.PI / 180;
          for (let i = 0; i < n; i++) fire(spread >= Math.PI * 1.99 ? ang + (i / n) * Math.PI * 2 : ang - spread / 2 + spread * (i / (n - 1)));
        }
        break;
      }
      case "aoe": {
        p.startCast(0.35);
        let x = p.x, y = p.y;
        if (s.at === "target") { const t = this.nearestEnemy(460); if (t) { x = t.x; y = t.y; } else { const [fx, fy] = p.faceVec(); x += fx * 200; y += fy * 160; } }
        if (s.at === "front") { const ang = this.aimAngle(160); x += Math.cos(ang) * 70; y += Math.sin(ang) * 60; }
        this.area({ x, y, radius: s.radius, delay: s.delay || 0, ticks: s.ticks || 1, interval: s.interval || 0.5, color, owner: "player", follow: s.follow, strikes: s.strikes,
          onTick: (targets) => {
            if (s.healPct) W.healPlayer(W.player.maxHp * s.healPct / 100 * (1 + ps.heal / 100));
            for (const t of targets) this.hitMonster(t, base, opts);
          } });
        if (s.delay && s.id === "py_meteor") {
          const m = W.add.image(x - 160, y - 420, "fx_glow_fire").setScale(1.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(100000);
          W.tweens.add({ targets: m, x, y, duration: s.delay * 1000, ease: "Quad.easeIn", onComplete: () => m.destroy() });
        }
        if (s.delay && (s.id === "or_judg" || s.id === "c_hammer")) this.later(s.delay, () => { const b = W.add.image(x, y, "fx_glow_holy").setOrigin(0.5, 1).setScale(1.2, 6).setBlendMode(Phaser.BlendModes.ADD).setDepth(y + 80); W.tweens.add({ targets: b, alpha: 0, duration: 500, onComplete: () => b.destroy() }); });
        break;
      }
      case "dash": {
        p.startAttack(0.25);
        let ang;
        if (s.back) { const t = this.nearestEnemy(400); ang = t ? Math.atan2(p.y - t.y, p.x - t.x) : Math.atan2(-p.faceVec()[1], -p.faceVec()[0]); }
        else ang = s.teleport ? (G.input.mx || G.input.my ? Math.atan2(G.input.my, G.input.mx) : Math.atan2(p.faceVec()[1], p.faceVec()[0])) : this.aimAngle(s.dist);
        if (s.teleport) {
          this.burst(p.x, p.cy, "#b0a0ff", 14, 120, 400);
          let d = s.dist;
          while (d > 20 && W.blockedAt(p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d)) d -= 20;
          p.sprite.setPosition(p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d);
          this.burst(p.x, p.cy, "#b0a0ff", 14, 120, 400);
        } else {
          W.dash = { vx: Math.cos(ang) * s.dist / 0.2, vy: Math.sin(ang) * s.dist / 0.2, t: 0.2, hit: new Set(), dmg: base, opts };
          W.invuln = 0.25;
        }
        break;
      }
      case "blink": {
        const t = this.nearestEnemy(s.range);
        if (!t) { this.text(p.x, p.cy - 40, "Нет цели", "#c0c0c0", 14); return false; }
        this.burst(p.x, p.cy, "#8060c0", 12, 120, 400);
        const [fx] = [t.flip ? 1 : -1];
        p.sprite.setPosition(t.x + fx * (t.radius + 22), t.y + 2);
        p.face(t.x - p.x, t.y - p.y);
        p.startAttack(0.3);
        this.hitMonster(t, base, { ...opts, critBonus: 25 });
        this.slashFx(p, Math.atan2(t.y - p.y, t.x - p.x), 60, 90, "#c0a0ff");
        break;
      }
      case "buff": {
        p.startCast(0.35);
        W.addBuff({ id: s.id, name: s.name, icon: s.icon, stats: s.stats, dur: v.dur, onHit: s.onHit });
        this.ringFx(p.x, p.y, 90, color, 500); this.burst(p.x, p.cy, color, 16, 100, 600);
        if (s.aoeStatus) for (const m of W.monsters) if (!m.dead && Math.hypot(m.x - p.x, m.y - p.y) < s.radius) this.status(m, s.aoeStatus, "player");
        break;
      }
      case "heal": {
        p.startCast(0.35);
        const mul = 1 + ps.heal / 100;
        if (v.pct) W.healPlayer(p.maxHp * v.pct / 100 * mul);
        if (s.hot) W.addBuff({ id: s.id, name: s.name, icon: s.icon, stats: { hpRegen: p.maxHp * s.hot / 100 / s.dur * mul }, dur: s.dur });
        this.burst(p.x, p.cy, "#80ff90", 20, 90, 700);
        break;
      }
      case "shield": {
        p.startCast(0.35);
        W.shield = Math.max(W.shield, p.maxHp * v.pct / 100); W.shieldUntil = W.clock + s.dur;
        if (s.stats) W.addBuff({ id: s.id, name: s.name, icon: s.icon, stats: s.stats, dur: s.dur });
        this.ringFx(p.x, p.y, 70, color, 600);
        break;
      }
      case "summon": {
        p.startCast(0.45);
        const power = Math.max(ps.atk, ps.matk) * (1 + 0.12 * (v.rank - 1)) * (1 + v.mastery * 0.02);
        for (let i = 0; i < s.count; i++) W.spawnAlly(s.mob, p.x + rand(-50, 50), p.y + rand(-30, 30), s.dur * (1 + (v.rank - 1) * 0.1), power);
        this.burst(p.x, p.y, color, 20, 120, 600);
        break;
      }
      case "chain": {
        p.startCast(0.3);
        let from = p, fx = p.x, fy = p.cy; const hitSet = new Set();
        for (let j = 0; j < s.jumps; j++) {
          let best = null, bd = j === 0 ? s.range : 220;
          for (const m of W.monsters) { if (m.dead || hitSet.has(m)) continue; const d = Math.hypot(m.x - fx, m.y - fy); if (d < bd) { bd = d; best = m; } }
          if (!best) break;
          hitSet.add(best);
          this.beam(fx, fy, best.x, best.cy, "#f0f080");
          this.hitMonster(best, base * Math.pow(0.88, j), opts);
          fx = best.x; fy = best.cy;
        }
        if (!hitSet.size) this.text(p.x, p.cy - 40, "Нет цели", "#c0c0c0", 14);
        break;
      }
      case "trap": {
        p.startCast(0.3);
        const s2 = W.add.image(p.x, p.y, "fx_target").setScale(s.radius / 44, s.radius / 44).setTint(0xc0a070).setDepth(2);
        this.traps.push({ x: p.x, y: p.y, radius: s.radius, life: s.dur, dmg: base, status: s.status, s: s2 });
        break;
      }
    }
    return true;
  }
}
