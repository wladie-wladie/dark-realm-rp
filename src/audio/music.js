// Музыка: Web Audio (петля без пауз), ленивая загрузка треков, плавная смена.
const ZONE_TRACK = { town: "town", forest: "forest", swamp: "swamp", tract: "tract", mine: "mine" };
let ctx = null, master = null, cur = null, want = null, unlocked = false;
const buffers = {}, loading = {};
let volume = 0.6;
try { const v = parseFloat(localStorage.getItem("musicVol")); if (!isNaN(v)) volume = v; } catch (_) {}

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination);
  return ctx;
}
async function load(name) {
  if (buffers[name]) return buffers[name];
  if (!loading[name]) loading[name] = fetch(`assets/music/${name}.ogg`).then(r => r.arrayBuffer()).then(b => new Promise((ok, bad) => ctx.decodeAudioData(b, ok, bad))).then(buf => (buffers[name] = buf)).catch(() => null);
  return loading[name];
}
async function start(name) {
  if (!ensureCtx() || !unlocked) return;
  if (cur && cur.name === name) return;
  const buf = await load(name);
  if (!buf || want !== name || (cur && cur.name === name)) return;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(master);
  const now = ctx.currentTime;
  src.start(); g.gain.linearRampToValueAtTime(1, now + 1.6);
  if (cur) { const old = cur; old.g.gain.cancelScheduledValues(now); old.g.gain.setValueAtTime(old.g.gain.value, now); old.g.gain.linearRampToValueAtTime(0, now + 1.4); setTimeout(() => { try { old.src.stop(); } catch (_) {} }, 1600); }
  cur = { name, src, g };
}
export function playMusic(name) { want = name; start(name); }
export const playZoneMusic = zoneId => playMusic(ZONE_TRACK[zoneId] || "town");
export function setMusicVolume(v) { volume = v; try { localStorage.setItem("musicVol", String(v)); } catch (_) {} if (master) master.gain.value = v; }
export const musicVolume = () => volume;
// звук разрешён только после касания экрана
function unlock() {
  if (!ensureCtx()) return;
  unlocked = true; if (ctx.state === "suspended") ctx.resume();
  if (want) start(want);
}
["pointerdown", "keydown", "touchstart"].forEach(e => window.addEventListener(e, unlock, { passive: true }));
document.addEventListener("visibilitychange", () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (unlocked) ctx.resume(); });
