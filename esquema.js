/* ═══════════════════════════════════════════════════════════
   esquema.js — el esquema de un proyecto como un dibujo de globos y flechas.
   Sello: esquema-2 (7-nov-2026; esquema-1 el mismo día)

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
export const VERSION = "esquema-2";

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
export function renglones(texto, n, max = 4) {
  const out = []; let r = "";
  for (const p of String(texto || "").split(/\s+/).filter(Boolean)) {
    if (!r) r = p; else if ((r + " " + p).length <= n) r += " " + p; else { out.push(r); r = p; }
  }
  if (r) out.push(r);
  return out.slice(0, max);
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
  /* esquema-2: lo que todavía no existe y no se conecta con nada no va arriba,
     al lado del comienzo: va en una fila propia, al final (Mauro: «menos
     resaltado… en la presentación menos importante»). */
  const suelto = (n) => n.estado && n.estado !== "anda" && !n.a.length && !entran.get(n.id);
  if (nodos.some(suelto) && nodos.some((n) => !suelto(n))) {
    const ultimo = Math.max(...nodos.filter((n) => !suelto(n)).map((n) => nivel.get(n.id)));
    nodos.filter(suelto).forEach((n) => nivel.set(n.id, ultimo + 1));
  }
  const filas = [];
  nodos.forEach((n) => { const k = nivel.get(n.id); (filas[k] = filas[k] || []).push(n); });
  const alto = (n) => 18 + renglones(n.titulo, 18).length * RENGLON + (n.sub ? renglones(n.sub, 22).length * RENGLON_SUB + 4 : 0)
    + (n.forma === "base" ? 12 : 0) + (n.estado && n.estado !== "anda" ? 14 : 0);
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

/* ═══ esquema-2 (7-nov-2026): el MAPA de un proyecto, por niveles ═══════════
   Mauro: «tiene que tener una visualización simplificada global general… y
   al hacer clic… ampliar conceptualmente esa parte… en un nuevo esquema de ese
   concepto en base a lo que está desarrollado y lo que se busca».

   `proyectos/<id>.estructura.mapa`:
     { objetivo, quienes: [{nombre, que}],
       areas: [{ id, titulo, que, estado, conecta: [ids], explica, detalle: [],
                 fuentes: [archivos o colecciones], hijos: [{ id, titulo, que,
                 estado, a: [ids de hijos], explica, fuentes }] }] }
   `estado`: "anda" (funciona hoy), "desarrollo" (se está haciendo) o "idea"
   (se busca). Mauro: lo que no está «menos resaltado… un poco más pequeño»:
   va punteado, apagado y a 80 %; lo que anda, entero.

   NIVEL 0: el objetivo en el centro y las áreas alrededor, con las
   conexiones entre áreas. NIVEL 1: un área por dentro —sus partes y cómo se
   encadenan— y, abajo, las otras áreas con las que se toca. */
export const ESTADOS = { anda: "funciona hoy", desarrollo: "en desarrollo", idea: "se busca" };
const estadoDe = (e) => (e in ESTADOS ? e : "anda");

export function mapaDe(estructura) {
  const m = (estructura || {}).mapa;
  if (!m || !Array.isArray(m.areas) || !m.areas.length) return null;
  const ids = new Set(m.areas.map((a) => String(a.id)));
  return {
    objetivo: String(m.objetivo || "").slice(0, 200),
    quienes: (m.quienes || []).filter((q) => q && q.nombre).map((q) => ({ nombre: String(q.nombre).slice(0, 40), que: String(q.que || "").slice(0, 120) })),
    areas: m.areas.filter((a) => a && a.id && a.titulo).map((a) => {
      const hijosIds = new Set((a.hijos || []).map((h) => String(h.id)));
      return {
        id: String(a.id), titulo: String(a.titulo).slice(0, 50), que: String(a.que || "").slice(0, 140),
        estado: estadoDe(a.estado), explica: String(a.explica || ""), detalle: (a.detalle || []).map(String),
        fuentes: (a.fuentes || []).map(String),
        conecta: (a.conecta || []).map(String).filter((x) => ids.has(x) && x !== String(a.id)),
        hijos: (a.hijos || []).filter((h) => h && h.id && h.titulo).map((h) => ({
          id: String(h.id), titulo: String(h.titulo).slice(0, 60), sub: String(h.que || "").slice(0, 80),
          estado: estadoDe(h.estado), explica: String(h.explica || ""), fuentes: (h.fuentes || []).map(String),
          a: (h.a || []).map(String).filter((x) => hijosIds.has(x) && x !== String(h.id)), forma: "caja", parte: "",
        })),
      };
    }),
  };
}

function globo(o, n, clase, dataAttr) {
  const chico = n.estado && n.estado !== "anda";
  const k = chico ? 0.8 : 1, w = o.w * k, h = o.h * k, x = o.x + (o.w - w) / 2, y = o.y + (o.h - h) / 2, cx = o.x + o.w / 2;
  const tit = renglones(n.titulo, 20), sub = n.sub ? renglones(n.sub, 24) : [];
  const fs = chico ? 0.85 : 1;
  let ty = y + 17 * k;
  const textos = tit.map((r) => { const t = `<text x="${cx}" y="${ty}" class="esq-tit" style="font-size:${13 * fs}px">${esc(r)}</text>`; ty += RENGLON * k; return t; }).join("")
    + sub.map((r) => { const t = `<text x="${cx}" y="${ty + 2}" class="esq-sub" style="font-size:${11 * fs}px">${esc(r)}</text>`; ty += RENGLON_SUB * k; return t; }).join("")
    + (chico ? `<text x="${cx}" y="${y + h - 6}" class="esq-estado">${n.estado === "idea" ? "💡 se busca" : "🛠 en desarrollo"}</text>` : "");
  return `<g class="esq-nodo ${clase}${chico ? " esq-" + n.estado : ""}" ${dataAttr}="${esc(n.id)}" tabindex="0" role="button" aria-label="${esc(n.titulo)}${chico ? " (" + ESTADOS[n.estado] + ")" : ""}">`
    + `<rect class="esq-globo" x="${x}" y="${y}" width="${w}" height="${h}" rx="${16 * k}"/>${textos}</g>`;
}
const altoGlobo = (n) => 22 + renglones(n.titulo, 20).length * RENGLON + (n.sub ? renglones(n.sub, 24).length * RENGLON_SUB + 2 : 0) + (n.estado && n.estado !== "anda" ? 12 : 0);

/** Dónde va cada área: el objetivo arriba, en un círculo; abajo un tronco y
    las áreas en dos columnas, colgadas de él (las que andan primero; lo que se
    busca, al final y más chico). Probado el 7-nov en un teléfono: una rueda
    con ocho áreas no entra en 390 px sin achicar la letra hasta no leerse. */
export function ubicarMapa(mapa) {
  const areas = [...mapa.areas].sort((a, b) => (a.estado === "anda" ? 0 : 1) - (b.estado === "anda" ? 0 : 1));
  const W = 168, GAP = 28, M = 10, ancho = 2 * W + GAP + 2 * M, cx = ancho / 2;
  const obj = renglones(mapa.objetivo, 22, 6), rObj = Math.max(58, 20 + obj.length * 8);
  const cy = M + rObj;
  const pos = new Map();
  let y = cy + rObj + 26;
  for (let k = 0; k < areas.length; k += 2) {
    const fila = areas.slice(k, k + 2);
    const altos = fila.map((a) => altoGlobo({ ...a, sub: subDe(a) }));
    const h = Math.max(...altos);
    fila.forEach((a, c) => {
      const x = fila.length === 1 ? cx - W / 2 : M + c * (W + GAP);
      pos.set(a.id, { x, y: y + (h - altos[c]) / 2, w: W, h: altos[c], fila: y + h / 2 });
    });
    y += h + 16;
  }
  return { pos, cx, cy, rObj, obj, ancho, minY: 0, alto: y - 16 + M };
}
const subDe = (a) => (a.que ? renglones(a.que, 22, 3).join(" ") : "");

export function svgMapa(mapa) {
  if (!mapa) return "";
  const { pos, cx, cy, rObj, obj, ancho, alto } = ubicarMapa(mapa);
  const filas = [...new Set([...pos.values()].map((p) => p.fila))];
  const ultimo = Math.max(...filas);
  let ramas = `<line x1="${cx}" y1="${cy + rObj}" x2="${cx}" y2="${ultimo}" class="esq-radio"/>`, globos = "";
  for (const a of mapa.areas) {
    const p = pos.get(a.id);
    const borde = p.x + p.w / 2 < cx ? p.x + p.w : p.x;
    if (Math.abs(p.x + p.w / 2 - cx) > 1) ramas += `<line x1="${cx}" y1="${p.fila}" x2="${borde}" y2="${p.fila}" class="esq-radio${a.estado !== "anda" ? " esq-tenue" : ""}"/>`;
    globos += globo(p, { ...a, sub: subDe(a) }, "esq-area", "data-area");
  }
  let oy = cy - (obj.length - 1) * 7.5 + 4;
  const centro = `<g class="esq-centro"><circle cx="${cx}" cy="${cy}" r="${rObj}" class="esq-objetivo"/>`
    + obj.map((r) => { const t = `<text x="${cx}" y="${oy}" class="esq-obj-txt">${esc(r)}</text>`; oy += 15; return t; }).join("") + `</g>`;
  return `<svg class="esq esq-mapa" viewBox="0 0 ${ancho} ${alto}" data-vista="0 0 ${ancho} ${alto}" width="100%" preserveAspectRatio="xMidYMin meet" role="img">`
    + ramas + centro + globos + `</svg>`;
}

/** Un área por dentro: sus partes encadenadas, con el título del área arriba. */
export function svgArea(mapa, areaId) {
  const a = (mapa && mapa.areas.find((x) => x.id === areaId)) || null;
  if (!a || !a.hijos.length) return "";
  const { pos, ancho, alto } = ubicar(a.hijos);
  let flechas = "", globos = "";
  for (const n of a.hijos) {
    const o = pos.get(n.id);
    for (const d of n.a) {
      const t = pos.get(d); if (!t) continue;
      const x1 = o.x + o.w / 2, y1 = o.y + o.h, x2 = t.x + t.w / 2, y2 = t.y - 4, ym = (y1 + y2) / 2;
      flechas += `<path d="M${x1} ${y1} C ${x1} ${ym}, ${x2} ${ym}, ${x2} ${y2}" class="esq-flecha${n.estado !== "anda" || pos.get(d).nodo.estado !== "anda" ? " esq-tenue" : ""}" marker-end="url(#esq-punta)"/>`;
    }
    globos += globo(o, n, "esq-hijo", "data-hijo");
  }
  return `<svg class="esq" viewBox="0 0 ${ancho} ${alto}" data-vista="0 0 ${ancho} ${alto}" width="100%" preserveAspectRatio="xMidYMin meet" role="img">`
    + `<defs><marker id="esq-punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="esq-punta"/></marker></defs>`
    + flechas + globos + `</svg>`;
}

/** La caja de un área en el mapa, para acercarse antes de entrar. */
export function cajaDeArea(mapa, areaId) {
  const p = ubicarMapa(mapa).pos.get(areaId);
  return p ? { x: p.x - 8, y: p.y - 8, w: p.w + 16, h: p.h + 16 } : null;
}
