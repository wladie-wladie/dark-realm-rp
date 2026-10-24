// Собирает игру в www/: она уходит внутрь APK и в пакет обновления.
import { cpSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "www");
const version = process.env.APP_VERSION || "0.0.0-dev";

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "web"), out, { recursive: true });
if (existsSync(join(root, "assets"))) cpSync(join(root, "assets"), join(out, "assets"), { recursive: true, filter: src => !/[\\/]assets[\\/]raw([\\/]|$)/.test(src) });
writeFileSync(join(root, "src/version.js"), `export const APP_VERSION = ${JSON.stringify(version)};\n`);
await build({
  entryPoints: [join(root, "src/main.js")],
  bundle: true, minify: !process.argv.includes("--dev"), sourcemap: process.argv.includes("--dev"),
  format: "iife", target: ["chrome90"], outfile: join(out, "js/game.js"), logLevel: "warning",
});
console.log("Собрано www/, версия " + version);
