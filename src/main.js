// Точка входа: Phaser + интерфейс.
import Phaser from "phaser";
import { G } from "./core/G.js";
import { WorldScene } from "./scenes/WorldScene.js";
import { registerStatic } from "./art/registry.js";
import { UI } from "./ui/ui.js";
import { initNative, applyUpdateNow } from "./native.js";
import { setStyle } from "./art/style.js";
import { APP_VERSION } from "./version.js";

// качество графики: сколько пикселей экрана рисуем (баланс — до 2×, максимум — полная плотность)
const QUALITY = { max: 3, balance: 2, eco: 1.5 };
let gfx = "max";
try {
  // земля теперь рисуется видеокартой — по умолчанию полная чёткость (сбрасываем прежнее автоснижение один раз)
  if (localStorage.getItem("gfxV") !== "3") { localStorage.setItem("gfxV", "3"); localStorage.removeItem("gfxQuality"); }
  gfx = localStorage.getItem("gfxQuality") || "max";
} catch (_) {}
let DPR = Math.min(window.devicePixelRatio || 1, QUALITY[gfx] || 2);
export function setGfxQuality(q, reload = true) {
  try { localStorage.setItem("gfxQuality", q); } catch (_) {}
  if (reload) location.reload();
}
export const gfxQuality = () => gfx;

class BootScene extends Phaser.Scene {
  constructor() { super("boot"); }
  preload() {
    // своя графика (например, из GPT): assets/manifest.json → { "ключ_текстуры": "путь.png" }
    this.load.json("manifest", "assets/manifest.json?v=" + APP_VERSION + "-" + Date.now());
    this.load.on("filecomplete-json-manifest", (key, type, data) => {
      G.art = {};
      for (const [k, v] of Object.entries(data || {})) {
        const meta = typeof v === "string" ? { file: v } : v;
        G.art[k] = meta;
        if (meta && meta.file) this.load.image(k, "assets/" + meta.file + "?v=" + APP_VERSION); // новая версия — картинки заново, без старого кэша
      }
    });
    this.load.on("loaderror", () => {});
  }
  create() {
    registerStatic(this);
    const boot = document.getElementById("boot");
    boot.style.opacity = 0; setTimeout(() => boot.remove(), 700);
    G.ui.titleScreen();
  }
}

window.addEventListener("load", () => {
  new UI(document.getElementById("ui"));
  G.game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: "game",
    backgroundColor: "#000000",
    scale: { mode: Phaser.Scale.NONE, width: innerWidth * DPR, height: innerHeight * DPR, zoom: 1 / DPR },
    physics: { default: "arcade", arcade: { debug: false } },
    render: { antialias: true, roundPixels: true, powerPreference: "high-performance" },
    fps: { target: 60 },
    scene: [BootScene, WorldScene],
  });
  const resize = () => G.game.scale.resize(innerWidth * DPR, innerHeight * DPR);
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 200));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && G.world && G.st && G.game.scene.isActive("world")) G.world.persist(); });
  initNative({
    onUpdateReady: info => G.st && G.ui.el && G.ui.toast(`Скачано обновление ${info.version}. Перезапустите игру или нажмите «Меню → Перезапустить с обновлением»`, "#a0d0ff", 7000),
    onBack: () => {
      const m = document.querySelectorAll(".modal-bg");
      if (m.length) { const close = m[m.length - 1].querySelector(".close"); if (close) close.click(); else m[m.length - 1].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); return; }
      if (G.st && G.ui.panels) G.ui.panels.open("menu");
    },
  });
  window.__applyUpdate = applyUpdateNow;
  window.G = G; // для отладки
  window.__setStyle = setStyle;
});
