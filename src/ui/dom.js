// Мини-помощник для построения DOM.
export function h(tag, attrs = {}, ...kids) {
  const [t, ...cls] = tag.split(".");
  const el = document.createElement(t || "div");
  if (cls.length) el.className = cls.join(" ");
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") el.innerHTML = v;
    else if (k === "class") el.className += " " + v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
export const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export function tap(el, fn) {
  // быстрый отклик на касание без задержки click
  el.addEventListener("pointerup", e => { e.preventDefault(); fn(e); });
  return el;
}
