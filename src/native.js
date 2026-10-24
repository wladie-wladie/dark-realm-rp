// Связь с Android: самообновление и кнопка «Назад».
// Обновления берутся с GitHub Pages, запасной путь — релиз на GitHub.
// Важно: модуль обновлений принимает пакет только с контрольной суммой SHA-256 (поле checksum в update.json).
import { APP_VERSION } from "./version.js";

const MANIFESTS = [
  "https://wladie-wladie.github.io/dark-realm-rp/update.json",
  "https://github.com/wladie-wladie/dark-realm-rp/releases/download/apk/update.json",
];
import { Capacitor, registerPlugin } from "@capacitor/core";
// Плагины берём через @capacitor/core (в окне приложения есть только мост без registerPlugin)
export const isNative = () => Capacitor.isNativePlatform();
const plugins = {};
const plugin = name => (plugins[name] = plugins[name] || registerPlugin(name));

const cmpVersion = (a, b) => {
  const pa = String(a).split(".").map(n => parseInt(n, 10) || 0), pb = String(b).split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; }
  return 0;
};

export const updateState = { state: isNative() ? "idle" : "web", detail: "", version: APP_VERSION, progress: 0 };
const set = (state, detail = "") => { updateState.state = state; updateState.detail = detail; listeners.forEach(f => f(updateState)); };
const listeners = [];
export const onUpdateState = f => listeners.push(f);

async function fetchManifest() {
  let lastErr = "";
  for (const u of MANIFESTS) {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
      const res = await fetch(u + "?t=" + Date.now(), { cache: "no-store", signal: ctl.signal });
      clearTimeout(t);
      if (!res.ok) { lastErr = "ответ " + res.status; continue; }
      const j = await res.json();
      if (j && j.version && j.url) return j;
      lastErr = "непонятный ответ";
    } catch (e) { lastErr = (e && e.message) || String(e); }
  }
  throw new Error(lastErr || "нет связи");
}

let readyBundle = null, checking = null, onReadyCb = null;
export function checkForUpdates() {
  if (!isNative()) { set("web"); return Promise.resolve(updateState); }
  if (readyBundle) { set("ready", readyBundle.version); return Promise.resolve(updateState); }
  if (checking) return checking;
  checking = (async () => {
    set("checking");
    try {
      const info = await fetchManifest();
      if (cmpVersion(info.version, APP_VERSION) <= 0) { set("latest", info.version); return updateState; }
      if (!info.checksum) { set("error", "в update.json нет контрольной суммы"); return updateState; }
      updateState.progress = 0;
      set("downloading", info.version);
      const updater = plugin("CapacitorUpdater");
      let progL = null;
      try { progL = await updater.addListener("download", e => { updateState.progress = Math.max(0, Math.min(100, Math.round((e && e.percent) || 0))); set("downloading", info.version); }); } catch (_) {}
      let bundle = null;
      try { const list = await updater.list(); bundle = (list.bundles || []).find(b => b.version === info.version && b.status !== "error") || null; } catch (_) {}
      if (!bundle) {
        for (const url of [info.url, info.fallback].filter(Boolean)) {
          try { bundle = await updater.download({ url, version: info.version, checksum: info.checksum }); break; }
          catch (e) { set("downloading", info.version + " (запасной путь: " + ((e && e.message) || e) + ")"); }
        }
      }
      try { progL && progL.remove && progL.remove(); } catch (_) {}
      if (!bundle) { set("error", "не удалось скачать обновление " + info.version); return updateState; }
      await updater.next({ id: bundle.id });
      readyBundle = bundle;
      set("ready", info.version);
      onReadyCb && onReadyCb(info);
    } catch (e) { set("error", (e && e.message) || String(e)); }
    finally { checking = null; }
    return updateState;
  })();
  return checking;
}

export async function initNative({ onUpdateReady, onBack }) {
  if (!isNative()) return;
  onReadyCb = onUpdateReady;
  // сообщаем модулю, что эта версия запустилась нормально, иначе он откатит её
  try { await plugin("CapacitorUpdater").notifyAppReady(); } catch (e) { set("error", "модуль обновлений не отвечает"); }
  checkForUpdates();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkForUpdates(); });
  try { plugin("App").addListener("backButton", () => onBack && onBack()); } catch (_) {}
}
export async function applyUpdateNow() { if (readyBundle) await plugin("CapacitorUpdater").set({ id: readyBundle.id }); }
