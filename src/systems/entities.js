// Существа в мире: герой, монстры, союзники, жители. Спрайт + физическое тело + анимация.
import { style } from "../art/style.js";

// Общий масштаб существ относительно мира (герой ~1/5 высоты экрана, как в Zenonia)
export const ACTOR_SCALE = 1.1;

export class Actor {
  constructor(scene, o) {
    this.scene = scene;
    this.kind = o.kind;           // player | monster | ally | npc
    this.sheet = o.sheet;         // 'h' — человекоподобный, 'c' — существо
    this.scale = (o.scale || 1) * ACTOR_SCALE;
    this.id = o.id; this.def = o.def || null; this.name = o.name || "";
    const sprite = scene.physics.add.sprite(o.x, o.y, o.tex, 0);
    // разрешение листа: процедурный рисуется в CHAR_RES, картинки из ChatGPT — крупнее
    const fw = sprite.frame.width;
    const res = fw / (this.sheet === "h" ? 64 : 80);
    this.idleCol = o.idleCol ?? 0;
    sprite.setScale(this.scale / res);
    this.oy = this.sheet === "h" ? 74 / 80 : 54 / 64;
    sprite.setOrigin(0.5, this.oy);
    const rWorld = (o.radius || 13) * Math.min(this.scale / ACTOR_SCALE, 1.6) * 1.15;
    const rSrc = rWorld / sprite.scaleX;
    const footX = this.sheet === "h" ? 32 * res : 40 * res, footY = this.sheet === "h" ? 74 * res : 54 * res;
    sprite.body.setCircle(rSrc, footX - rSrc, footY - rSrc * 1.6);
    sprite.actor = this;
    this.sprite = sprite;
    // тёмный контур, как у спрайтов Zenonia
    if (style().outline && sprite.preFX) sprite.preFX.addGlow(0x080402, 4, 0, false, 0.1, 8);
    this.radius = rWorld;
    this.dir = 0; this.flip = false;
    this.walkPhase = 0; this.moving = false;
    this.attackT = -1; this.attackDur = 0.3; this.castT = -1;
    this.hurtT = 0;
    this.statuses = [];
    this.dead = false;
    this.hp = o.hp || 100; this.maxHp = o.hp || 100;
    this.alpha = o.alpha ?? 1; sprite.setAlpha(this.alpha);
    this.flying = !!o.flying;
    if (this.flying) sprite.body.checkCollision.none = false;
  }
  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  // точка «корпуса» для попаданий
  get cy() { return this.sprite.y - 26 * this.scale; }

  face(dx, dy) {
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
    if (this.sheet === "c") { if (Math.abs(dx) > 0.05) this.flip = dx < 0; this.dir = 2; return; }
    if (Math.abs(dx) > Math.abs(dy) * 0.9) { this.dir = 2; this.flip = dx < 0; }
    else { this.dir = dy > 0 ? 0 : 1; }
  }
  faceVec() {
    if (this.dir === 0) return [0, 1];
    if (this.dir === 1) return [0, -1];
    return [this.flip ? -1 : 1, 0];
  }
  startAttack(dur = 0.3) { this.attackT = 0; this.attackDur = dur; }
  startCast(dur = 0.35) { this.castT = 0; this.attackDur = dur; }

  animate(dt) {
    const s = this.sprite;
    if (this.attackT >= 0) { this.attackT += dt; if (this.attackT > this.attackDur) this.attackT = -1; }
    if (this.castT >= 0) { this.castT += dt; if (this.castT > this.attackDur) this.castT = -1; }
    const v = s.body.velocity;
    const sp = Math.hypot(v.x, v.y);
    this.moving = sp > 10;
    if (this.moving) this.walkPhase = (this.walkPhase + dt * Math.max(1.8, sp / 85)) % 1;
    let col;
    if (this.castT >= 0) col = this.sheet === "h" ? 7 : 5;
    else if (this.attackT >= 0) col = 4 + Math.min(2, Math.floor((this.attackT / this.attackDur) * 3));
    else if (this.moving || this.flying) col = Math.floor((this.flying && !this.moving ? (this.scene.time.now / 1000 * 1.5) % 1 : this.walkPhase) * 4) % 4;
    else col = this.idleCol;
    // шаг ощущается: подпрыгивание на каждом шаге и лёгкое покачивание корпуса
    const step = this.moving && this.attackT < 0 && this.castT < 0 && !this.flying;
    const ph = this.walkPhase * Math.PI * 4;
    const bob = step ? Math.abs(Math.sin(ph)) * 0.035 : 0;
    s.setOrigin(0.5, this.oy + bob);
    s.setAngle(step && this.sheet === "h" ? Math.sin(ph) * 2.2 : 0);
    if (this.sheet === "h") {
      s.setFrame(this.dir * 8 + col);
      s.setFlipX(this.dir === 2 && this.flip);
    } else {
      s.setFrame(col);
      s.setFlipX(this.flip);
    }
    s.setDepth(this.scene.buildings && this.scene.buildings.length ? this.scene.isoDepth(this) : s.y);
    // окраска от эффектов
    if (this.hurtT > 0) { this.hurtT -= dt; s.setTintFill(0xffffff); if (this.hurtT <= 0.05) s.clearTint(); }
    else {
      const st = this.statuses;
      const has = t => st.some(x => x.type === t);
      if (has("freeze")) s.setTint(0x9ad8ff);
      else if (has("poison")) s.setTint(0xa0e080);
      else if (has("burn")) s.setTint(0xffb080);
      else if (has("curse") || has("weaken")) s.setTint(0xc8a0ff);
      else if (has("stun")) s.setTint(0xfff0a0);
      else s.clearTint();
    }
  }

  destroy() { this.sprite.destroy(); if (this.bar) this.bar.destroy(); if (this.label) this.label.destroy(); }
}
