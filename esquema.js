/* ═══════════════════════════════════════════════════════════
   esquema.js — el esquema de un proyecto como un dibujo de globos y flechas.
   Sello: esquema-1 (7-nov-2026)

   Mauro, 7-nov-2026: «la idea del diagrama de flujo con el esquema del sitio
   general tiene que ser más como una imagen con globitos, más dinámica… y al
   hacer clic en cada sección se tiene que hacer como una ampliación de esa
   sección». El dibujo es SVG hecho acá, sin bibliotecas: Mermaid son ~1 MB de
   un CDN para cinco cajas, y la página se abre en un teléfono.

   Los datos son `proyectos/<id>.estructura.nodos`:
     [{ id, titulo, sub?, forma?: "caja"|"base"|"pregunta", a?: [ids], parte? }]
   `a` son las flechas que salen; `parte` es el nombre de una de
   `estructura.partes`, de donde sale la explicación al ampliar. Sin `nodos`,
   el esquema se arma con `estructura.linea` (una cadena).

   Todo lo de acá es puro: no toca el DOM, así el banco lo prueba con node.
   ═══════════════════════════════════════════════════════════ */
export const VERSION = "esquema-1";

const ANCHO = 150, SEP_X = 22, SEP_Y = 46, MARGEN = 14, RENGLON = 15, RENGLON_SUB = 13;

/** Los nodos del esquema: los que vienen, o una cadena hecha con `linea`. */
export function nodosDe(estructura) {
  const e = estructura || {};
  if (Array.isArray(e.nodos) && e.nodos.length) {
    const ids = new Set(e.nodos.map((n) => String(n.id)));
    return e.nodos.filter((n) => n && n.id && n.titulo).map((n) => ({
      id: String(n.id), titulo: String(n.titulo).slice(0, 60), sub: String(n.sub || "").slice(0, 80),
      forma: ["base", "pregunta"].includes(n.forma) ? n.forma : "caja",
      a: (Array.isArray(n.a) ? n.a : []).map(String).filter((x) => ids.has(x) && x !== String(n.id)),
      parte: n.parte ? String(n.parte) : "",
    }));
  }
  const linea = Array.isArray(e.linea) ? e.linea.filter(Boolean) : [];
  const partes = new Set((e.partes || []).map((p) => p && p.nombre));
  return linea.map((t, i) => ({ id: "n" + i, titulo: String(t).slice(0, 60), sub: "", forma: "caja",
    a: i < linea.length - 1 ? ["n" + (i + 1)] : [], parte: partes.has(t) ? t : "" }));
}

/** Corta un texto en renglones de hasta `n` letras, sin partir palabras. */
export function renglones(texto, n) {
  const out = []; let r = "";
  for (const p of String(texto || "").split(/\s+/).filter(Boolean)) {
    if (!r) r = p; else if ((r + " " + p).length <= n) r += " " + p; else { out.push(r); r = p; }
  }
  if (r) out.push(r);
  return out.slice(0, 4);
}

/** Dónde va cada globo: por niveles (el más largo camino desde un origen),
    de arriba abajo, y centrados en su nivel. Un ciclo no cuelga el cálculo. */
export function ubicar(nodos) {
  const porId = new Map(nodos.map((n) => [n.id, n]));
  const entran = new Map(nodos.map((n) => [n.id, 0]));
  nodos.forEach((n) => n.a.forEach((d) => entran.set(d, (entran.get(d) || 0) + 1)));
  const nivel = new Map();
  const raices = nodos.filter((n) => !entran.get(n.id));
  (raices.length ? raices : nodos.slice(0, 1)).forEach((n) => nivel.set(n.id, 0));
  for (let vuelta = 0; vuelta < nodos.length; vuelta++) {
    let cambio = false;
    for (const n of nodos) {
      if (!nivel.has(n.id)) continue;
      for (const d of n.a) {
        const nv = nivel.get(n.id) + 1;
        if (nv < nodos.length && (!nivel.has(d) || nivel.get(d) < nv)) { nivel.set(d, nv); cambio = true; }
      }
    }
    if (!cambio) break;
  }
  nodos.forEach((n) => { if (!nivel.has(n.id)) nivel.set(n.id, 0); });
  const filas = [];
  nodos.forEach((n) => { const k = nivel.get(n.id); (filas[k] = filas[k] || []).push(n); });
  const alto = (n) => 18 + renglones(n.titulo, 18).length * RENGLON + (n.sub ? renglones(n.sub, 22).length * RENGLON_SUB + 4 : 0)
    + (n.forma === "base" ? 12 : 0);
  const anchoTotal = Math.max(...filas.filter(Boolean).map((f) => f.length)) * (ANCHO + SEP_X) - SEP_X + 2 * MARGEN;
  const pos = new Map(); let y = MARGEN;
  for (const fila of filas) {
    if (!fila) continue;
    const ancho = fila.length * (ANCHO + SEP_X) - SEP_X;
    let x = (anchoTotal - ancho) / 2;
    const h = Math.max(...fila.map(alto));
    for (const n of fila) { pos.set(n.id, { x, y, w: ANCHO, h: alto(n), nodo: n }); x += ANCHO + SEP_X; }
    y += h + SEP_Y;
  }
  return { pos, ancho: anchoTotal, alto: y - SEP_Y + MARGEN, porId };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** El SVG entero. Cada globo es un <g data-nodo="id"> que se puede tocar. */
export function svgEsquema(nodos) {
  if (!nodos.length) return "";
  const { pos, ancho, alto } = ubicar(nodos);
  let flechas = "", globos = "";
  for (const n of nodos) {
    const o = pos.get(n.id);
    for (const d of n.a) {
      const t = pos.get(d); if (!t) continue;
      const x1 = o.x + o.w / 2, y1 = o.y + o.h, x2 = t.x + t.w / 2, y2 = t.y - 4;
      const ym = (y1 + y2) / 2;
      flechas += `<path d="M${x1} ${y1} C ${x1} ${ym}, ${x2} ${ym}, ${x2} ${y2}" class="esq-flecha" marker-end="url(#esq-punta)"/>`;
    }
    const tit = renglones(n.titulo, 18), sub = n.sub ? renglones(n.sub, 22) : [];
    const cx = o.x + o.w / 2;
    let forma;
    if (n.forma === "base") forma = `<path class="esq-globo" d="M${o.x} ${o.y + 8} a ${o.w / 2} 8 0 0 1 ${o.w} 0 v ${o.h - 16} a ${o.w / 2} 8 0 0 1 ${-o.w} 0 z"/>`
      + `<path class="esq-borde" d="M${o.x} ${o.y + 8} a ${o.w / 2} 8 0 0 0 ${o.w} 0"/>`;
    else forma = `<rect class="esq-globo${n.forma === "pregunta" ? " esq-pregunta" : ""}" x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="${n.forma === "pregunta" ? 6 : 18}"/>`;
    let ty = o.y + 18 + (n.forma === "base" ? 8 : 0);
    const textos = tit.map((r) => { const t = `<text x="${cx}" y="${ty}" class="esq-tit">${esc(r)}</text>`; ty += RENGLON; return t; }).join("")
      + sub.map((r, i) => { const t = `<text x="${cx}" y="${ty + (i ? 0 : 3)}" class="esq-sub">${esc(r)}</text>`; ty += RENGLON_SUB; return t; }).join("");
    globos += `<g class="esq-nodo" data-nodo="${esc(n.id)}" tabindex="0" role="button" aria-label="${esc(n.titulo)}">${forma}${textos}</g>`;
  }
  return `<svg class="esq" viewBox="0 0 ${ancho} ${alto}" data-vista="0 0 ${ancho} ${alto}" width="100%" preserveAspectRatio="xMidYMin meet" role="img">`
    + `<defs><marker id="esq-punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="esq-punta"/></marker></defs>`
    + flechas + globos + `</svg>`;
}

/** La caja a la que se acerca la vista al tocar un globo: el globo y sus
    vecinos inmediatos, para que se vea de dónde viene y adónde va. */
export function cajaDeAmpliar(nodos, id) {
  const { pos } = ubicar(nodos);
  const o = pos.get(id); if (!o) return null;
  const vecinos = [o, ...nodos.filter((n) => n.a.includes(id)).map((n) => pos.get(n.id)),
    ...(nodos.find((n) => n.id === id)?.a || []).map((d) => pos.get(d))].filter(Boolean);
  const x0 = Math.min(...vecinos.map((v) => v.x)) - 10, y0 = Math.min(...vecinos.map((v) => v.y)) - 10;
  const x1 = Math.max(...vecinos.map((v) => v.x + v.w)) + 10, y1 = Math.max(...vecinos.map((v) => v.y + v.h)) + 10;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
