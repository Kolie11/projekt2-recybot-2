// Zeichnet eine SVG-Szene (React-Element) in ein Canvas, damit die KI sie „sehen“ kann.
// Drei Wege, damit es auch in eingeschränkten Umgebungen klappt (z. B. eingebettete Vorschau
// mit strenger Content-Security-Policy, die blob:- oder data:-Bilder verbietet):
//   1. SVG als data:-URL laden   2. als blob:-URL laden   3. eigener Canvas-Zeichner (ohne Bild-Laden)
import { renderToStaticMarkup } from "react-dom/server";

let preferred = null; // merkt sich, welcher Weg in dieser Umgebung funktioniert

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new Error("timeout")), 4000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error("blocked")); };
    img.src = src;
  });
}

function canvasFrom(img, width, height, scale) {
  const c = document.createElement("canvas");
  c.width = Math.round(width * scale); c.height = Math.round(height * scale);
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, c.width, c.height);
  ctx.getImageData(0, 0, 1, 1); // wirft, falls der Browser das Canvas „verschmutzt“ (z. B. älteres Safari)
  return c;
}

// ---- Weg 3: kleiner SVG-Zeichner für die Formen, die RecyBot benutzt ----
const num = (el, a, d = 0) => { const v = parseFloat(el.getAttribute(a)); return Number.isFinite(v) ? v : d; };
function applyTransform(ctx, tr) {
  if (!tr) return;
  const re = /(translate|rotate|scale)\(([^)]*)\)/g; let m;
  while ((m = re.exec(tr))) {
    const a = m[2].split(/[ ,]+/).filter(Boolean).map(Number);
    if (m[1] === "translate") ctx.translate(a[0] || 0, a[1] || 0);
    else if (m[1] === "scale") ctx.scale(a[0] || 1, a.length > 1 ? a[1] : a[0] || 1);
    else if (m[1] === "rotate") {
      const r = (a[0] || 0) * Math.PI / 180;
      if (a.length >= 3) { ctx.translate(a[1], a[2]); ctx.rotate(r); ctx.translate(-a[1], -a[2]); } else ctx.rotate(r);
    }
  }
}
function paint(ctx, el, inherited) {
  const tag = el.tagName.toLowerCase();
  const style = {
    fill: el.getAttribute("fill") ?? inherited.fill,
    stroke: el.getAttribute("stroke") ?? inherited.stroke,
    sw: el.hasAttribute("stroke-width") ? num(el, "stroke-width", 1) : inherited.sw,
    op: inherited.op * (el.hasAttribute("opacity") ? num(el, "opacity", 1) : 1) * (el.hasAttribute("fill-opacity") ? num(el, "fill-opacity", 1) : 1)
  };
  ctx.save();
  applyTransform(ctx, el.getAttribute("transform"));
  ctx.globalAlpha = Math.max(0, Math.min(1, style.op));
  let path = null;
  if (tag === "rect") {
    const x = num(el, "x"), y = num(el, "y"), w = num(el, "width"), h = num(el, "height");
    const r = Math.min(num(el, "rx", num(el, "ry")), w / 2, h / 2);
    path = new Path2D();
    if (r > 0 && path.roundRect) path.roundRect(x, y, w, h, r); else path.rect(x, y, w, h);
  } else if (tag === "circle") {
    path = new Path2D(); path.arc(num(el, "cx"), num(el, "cy"), num(el, "r"), 0, Math.PI * 2);
  } else if (tag === "ellipse") {
    path = new Path2D(); path.ellipse(num(el, "cx"), num(el, "cy"), num(el, "rx"), num(el, "ry"), 0, 0, Math.PI * 2);
  } else if (tag === "line") {
    path = new Path2D(); path.moveTo(num(el, "x1"), num(el, "y1")); path.lineTo(num(el, "x2"), num(el, "y2"));
  } else if (tag === "path" && el.getAttribute("d")) {
    try { path = new Path2D(el.getAttribute("d")); } catch { path = null; }
  } else if (tag === "polygon" || tag === "polyline") {
    const pts = (el.getAttribute("points") || "").trim().split(/[ ,]+/).map(Number);
    path = new Path2D();
    for (let i = 0; i + 1 < pts.length; i += 2) (i ? path.lineTo(pts[i], pts[i + 1]) : path.moveTo(pts[i], pts[i + 1]));
    if (tag === "polygon") path.closePath();
  } else if (tag === "text") {
    ctx.fillStyle = style.fill && style.fill !== "none" ? style.fill : "#000";
    ctx.font = `${num(el, "font-size", 12)}px sans-serif`;
    ctx.fillText(el.textContent || "", num(el, "x"), num(el, "y"));
  }
  if (path) {
    if (style.fill !== "none" && tag !== "line") { ctx.fillStyle = style.fill || "#000"; ctx.fill(path); }
    if (style.stroke && style.stroke !== "none") { ctx.strokeStyle = style.stroke; ctx.lineWidth = style.sw; ctx.stroke(path); }
  }
  if (tag === "g" || tag === "svg") for (const child of el.children) paint(ctx, child, style);
  ctx.restore();
}
export function rasterizeSvg(markup, width, height, scale = 1) {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  const root = doc.documentElement;
  const c = document.createElement("canvas");
  c.width = Math.round(width * scale); c.height = Math.round(height * scale);
  const ctx = c.getContext("2d");
  const vb = (root.getAttribute("viewBox") || `0 0 ${width} ${height}`).split(/[ ,]+/).map(Number);
  ctx.scale(c.width / (vb[2] || width), c.height / (vb[3] || height));
  ctx.translate(-(vb[0] || 0), -(vb[1] || 0));
  for (const child of root.children) paint(ctx, child, { fill: "#000", stroke: null, sw: 1, op: 1 });
  return c;
}

export async function svgElementToCanvas(element, width, height, scale = 1) {
  const markup = renderToStaticMarkup(element);
  const svg = markup.includes("xmlns=") ? markup : markup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  const ways = {
    data: async () => canvasFrom(await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)), width, height, scale),
    blob: async () => {
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      try { return canvasFrom(await loadImage(url), width, height, scale); } finally { URL.revokeObjectURL(url); }
    },
    paint: async () => rasterizeSvg(svg, width, height, scale)
  };
  const order = preferred ? [preferred, ...Object.keys(ways).filter(k => k !== preferred)] : ["data", "blob", "paint"];
  for (const k of order) {
    try { const c = await ways[k](); preferred = k; return c; } catch { /* nächster Weg */ }
  }
  throw new Error("SVG konnte nicht gerendert werden");
}

/** Schneidet ein Rechteck (in Szenen-Koordinaten) aus und skaliert es quadratisch auf size. */
export function cropRect(canvas, box, sceneW, size = 224, pad = 0) {
  const s = canvas.width / sceneW;
  const x = Math.max(0, (box.x - pad) * s), y = Math.max(0, (box.y - pad) * s);
  const w = Math.min(canvas.width - x, (box.w + 2 * pad) * s), h = Math.min(canvas.height - y, (box.h + 2 * pad) * s);
  const side = Math.max(w, h);
  const out = document.createElement("canvas");
  out.width = out.height = size;
  const ctx = out.getContext("2d");
  ctx.fillStyle = "#2B3A31";
  ctx.fillRect(0, 0, size, size);
  const dw = (w / side) * size, dh = (h / side) * size;
  if (w > 0 && h > 0) ctx.drawImage(canvas, x, y, w, h, (size - dw) / 2, (size - dh) / 2, dw, dh);
  return out;
}
