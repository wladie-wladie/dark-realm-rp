// update.json: версия, целый архив (запасной путь) и список файлов с хешами —
// телефон скачивает только изменившиеся файлы, остальные берёт из уже установленной версии.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const [, , wwwDir, zipPath, outPath, version, repo] = process.argv;
const base = "https://wladie-wladie.github.io/dark-realm-rp/";
const files = [];
const walk = d => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else files.push(p); } };
walk(wwwDir);
const sha = b => createHash("sha256").update(b).digest("hex");
const manifest = files.sort().map(p => {
  const rel = relative(wwwDir, p).split("\\").join("/");
  return { file_name: rel, file_hash: sha(readFileSync(p)), download_url: base + rel.split("/").map(encodeURIComponent).join("/") + "?v=" + version };
});
const info = {
  version, url: `${base}bundle.zip?v=${version}`, fallback: `https://github.com/${repo}/releases/download/apk/bundle.zip?v=${version}`,
  checksum: sha(readFileSync(zipPath)), builtAt: new Date().toISOString(), manifest,
};
writeFileSync(outPath, JSON.stringify(info));
console.log("update.json:", manifest.length, "файлов");
