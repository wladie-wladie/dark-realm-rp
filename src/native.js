// Связь с Android: самообновление (как в «Где разместить») и кнопка «Назад».
import { APP_VERSION } from "./version.js";

const UPDATE_MANIFEST = "https://github.com/wladie-wladie/dark-realm-rp/releases/download/apk/update.json";
const cap = () => window.Capacitor;
export const isNative = () => !!(cap() && cap().isNativePlatform && cap().isNativePlatform());
const plugins = {};
const plugin = name => (plugins[name] = plugins[name] || cap().registerPlugin(name));

const cmpVersion = (a, b) => {
  const pa = String(a).split(".").map(n => parseInt(n, 10) || 0), pb = String(b).split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; }
  return 0;
};

let readyBundle = null, checking = null;
async function check(onReady) {
  if (readyBundle || checking) return;
  checking = (async () => {
    try {
      const updater = plugin("CapacitorUpdater");
      const res = await fetch(UPDATE_MANIFEST + "?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return;
      const info = await res.json();
      if (!info || !info.version || !info.url || cmpVersion(info.version, APP_VERSION) <= 0) return;
      let bundle = null;
      try { const list = await updater.list(); bundle = (list.bundles || []).find(b => b.version === info.version && b.status !== "error") || null; } catch (_) {}
      if (!bundle) bundle = await updater.download({ url: info.url, version: info.version, checksum: info.checksum || "" });
      await updater.next({ id: bundle.id });
      readyBundle = bundle;
      onReady && onReady(info);
    } catch (e) { console.warn("update", e); } finally { checking = null; }
  })();
}

export async function initNative({ onUpdateReady, onBack }) {
  if (!isNative()) return;
  try { await plugin("CapacitorUpdater").notifyAppReady(); } catch (_) {}
  check(onUpdateReady);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(onUpdateReady); });
  try { plugin("App").addListener("backButton", () => onBack && onBack()); } catch (_) {}
}
export async function applyUpdateNow() { if (readyBundle) await plugin("CapacitorUpdater").set({ id: readyBundle.id }); }
