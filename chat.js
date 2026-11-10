/* ═══════════════════════════════════════════════════════════
   chat.js — el canal entre un invitado y SU propio chat de IA
   Sello: chat-4 (10-nov-2026; chat-1, 9-nov)

   Mauro, 9-nov-2026: «una herramienta que permita descargar un md que resuma
   el desarrollo de la app para su chat y un espacio en el que pueda cargar la
   respuesta de su chat por texto o archivo… las implicaciones de las
   respuestas se analizan en el chat contra la estructura, arquitectura,
   objetivos y usabilidad».

   Lógica pura, sin navegador ni Firebase: la usa invitado.html y la prueba
   `node pruebas/chat.mjs`. Lo que se baja sale SÓLO de lo que el invitado ya
   ve en su página (el proyecto, sus pendientes, lo último subido): nunca
   claves, fichas ni datos de otros proyectos.

   Las «consultas» son las preguntas que Claude le deja al invitado: un
   pendiente del proyecto con `tipo: "consulta"` y `quien: "invitado"`. Las
   contesta comentando (lo único que la regla le deja tocar), así que no hizo
   falta una regla nueva.
   ═══════════════════════════════════════════════════════════ */

export const SELLO = "chat-4";
/* Una respuesta de un chat va entera como comentario de un pedido. Un
   documento de Firestore no pasa de 1 MiB: con 200 mil caracteres queda lugar
   para la conversación de después. */
export const MAX_RESPUESTA = 200000;

const linea = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
const abierto = (x) => x.estado !== "hecho" && x.estado !== "retirado";
export const esConsulta = (x) => !!x && x.tipo === "consulta";

/** Las consultas abiertas de un proyecto, en el orden en que se quieren contestar
 *  (`orden`; sin él, al final y por fecha). */
export function consultasDe(pend, pid) {
  const o = (x) => (Number.isFinite(x.orden) ? x.orden : 9999);
  return (pend || []).filter((x) => x.proyecto === pid && esConsulta(x) && abierto(x))
    .sort((a, b) => o(a) - o(b) || String(a.creadoEn || "").localeCompare(String(b.creadoEn || "")) || String(a.id).localeCompare(String(b.id)));
}

/** Las consultas agrupadas por `grupo`, en el orden de la primera de cada grupo. */
export function agrupar(consultas) {
  const out = [];
  for (const x of consultas || []) {
    const g = linea(x.grupo);
    let b = out.find((o) => o.grupo === g);
    if (!b) { b = { grupo: g, items: [] }; out.push(b); }
    b.items.push(x);
  }
  return out;
}

/** Las opciones para elegir con un toque (`opciones: [{t, r}]`, `r` = la recomendada). */
export const opcionesDe = (x) => (Array.isArray(x && x.opciones) ? x.opciones : [])
  .filter((o) => o && o.t).slice(0, 6).map((o) => ({ t: String(o.t).slice(0, 160), r: !!o.r }));

/** Lo último que eligió esta persona, o null. Elegir de nuevo agrega un comentario: gana el último. */
export function eleccion(x, uid) {
  const l = ((x && x.comentarios) || []).filter((c) => c && c.por === uid && c.opcion);
  return l.length ? String(l[l.length - 1].opcion) : null;
}

/** El comentario que deja una elección: la opción va aparte para poder contarla. */
export const comentarioDeEleccion = (uid, nombre, opcion, fecha) =>
  ({ por: uid, nombre: nombre || "", texto: ("Elegí: " + opcion).slice(0, 3000), opcion: String(opcion).slice(0, 160), fecha });

/** ¿Ya la contestó esta persona? */
export const contestada = (x, uid) => (x.comentarios || []).some((c) => c && c.por === uid);

/** El resumen del proyecto en Markdown, para dárselo a otro chat. */
export function resumenMd(pr, pend, { commits = [], fecha = "", quien = "" } = {}) {
  const es = pr.estructura || {}, e = pr.esquema || {}, L = [];
  const mios = (pend || []).filter((x) => x.proyecto === pr.id);
  L.push(`# ${linea(pr.nombre || pr.id)} — resumen para trabajar con tu chat`);
  L.push("");
  L.push(`Bajado del panel${quien ? " por " + linea(quien) : ""}${fecha ? " el " + fecha : ""}. Lo arma el panel con lo mismo que ves en tu página.`);
  L.push("");
  L.push("## Cómo usarlo");
  L.push("");
  L.push("1. Dale este archivo a tu chat de IA.");
  L.push("2. Pedile lo que quieras: opinar, proponer, revisar un punto.");
  L.push("3. Cargá su respuesta en tu panel, en «Trabajar con tu propio chat». Claude la analiza contra el resto del proyecto antes de cambiar nada.");
  L.push("");
  L.push("> Para tu chat: el código vive en el repositorio" + (pr.sitio && pr.sitio.repo ? ` \`${pr.sitio.repo}\`` : "") + ". No cambies el código directamente: proponé, y explicá el porqué de cada propuesta.");
  const resumen = linea(e.resumen || (pr.sitio && pr.sitio.resumen));
  if (resumen) { L.push(""); L.push("## En qué está"); L.push(""); L.push(resumen); }
  if (es.intro) { L.push(""); L.push("## Cómo funciona"); L.push(""); L.push(String(es.intro).trim()); }
  const m = es.mapa || {};
  if (m.objetivo || (m.areas || []).length) {
    L.push(""); L.push("## El mapa"); L.push("");
    if (m.objetivo) L.push(`**Objetivo:** ${linea(m.objetivo)}`);
    if ((m.quienes || []).length) L.push(`**Lo usan:** ${m.quienes.map((q) => linea(q.nombre) + (q.que ? ` (${linea(q.que)})` : "")).join(", ")}`);
    for (const a of m.areas || []) {
      L.push(""); L.push(`### ${linea(a.titulo || a.id)}${a.estado ? ` (${linea(a.estado)})` : ""}`);
      if (a.que) L.push(linea(a.que));
      if (a.explica) L.push(linea(a.explica));
      for (const h of a.hijos || []) L.push(`- ${linea(h.titulo)}${h.estado ? ` (${linea(h.estado)})` : ""}${h.que ? `: ${linea(h.que)}` : ""}`);
    }
  }
  if ((es.partes || []).length) {
    L.push(""); L.push("## Las partes"); L.push("");
    for (const t of es.partes) {
      L.push(`### ${linea(t.nombre)}`);
      if (t.que) L.push(linea(t.que));
      if (t.explica) L.push("", linea(t.explica));
      for (const d of t.detalle || []) L.push(`- ${linea(d)}`);
      L.push("");
    }
  }
  if ((e.pasos || []).length) {
    L.push(""); L.push("## Los próximos pasos"); L.push("");
    e.pasos.forEach((p, i) => L.push(`${i + 1}. ${linea(p.titulo)} (lo lleva ${p.quien === "claude" ? "Claude" : "Mauro"})`));
  }
  const cons = consultasDe(pend, pr.id);
  if (cons.length) {
    L.push(""); L.push("## Preguntas abiertas para vos"); L.push("");
    cons.forEach((x) => {
      L.push(`- **${linea(x.titulo)}**${x.porQue ? ` — ${linea(x.porQue)}` : ""}`);
      if (x.amplia) L.push(`  - Por qué: ${linea(x.amplia)}`);
      opcionesDe(x).forEach((o) => L.push(`  - ${linea(o.t)}${o.r ? " (recomendada)" : ""}`));
    });
  }
  const ab = mios.filter((x) => abierto(x) && !esConsulta(x));
  if (ab.length) {
    L.push(""); L.push("## Lo que está abierto"); L.push("");
    ab.forEach((x) => L.push(`- ${linea(x.titulo)}${x.plan ? ` — plan: ${linea(x.plan).slice(0, 400)}` : ""}`));
  }
  if ((commits || []).length) {
    L.push(""); L.push("## Lo último que se subió"); L.push("");
    commits.forEach((c) => L.push(`- ${linea(c.fecha)} · ${linea(c.texto)}`));
  }
  L.push("");
  return L.join("\n");
}

/** El nombre del archivo que se baja: `bandomaps-resumen-2026-11-09.md`. */
export function nombreArchivo(pr, fecha) {
  const base = String(pr.nombre || pr.id || "proyecto").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "proyecto";
  return `${base}-resumen${fecha ? "-" + fecha : ""}.md`;
}

/** Lo que se carga de vuelta: limpio, con techo, y con un motivo si no sirve. */
export function prepararRespuesta(texto) {
  const t = String(texto == null ? "" : texto).replace(/\r\n?/g, "\n").replace(/\u0000/g, "").trim();
  if (!t) return { ok: false, motivo: "Pegá la respuesta o elegí el archivo." };
  if (t.length > MAX_RESPUESTA) return { ok: false, motivo: `Es muy larga (${t.length} caracteres; entran ${MAX_RESPUESTA}). Pedile a tu chat un resumen.` };
  return { ok: true, texto: t, resumen: linea(t).slice(0, 280) };
}

/** Un archivo que no es texto no se lee: se dice. */
export const esArchivoDeTexto = (f) => !!f && (/\.(md|markdown|txt)$/i.test(f.name || "") || /^text\//.test(f.type || ""));

/* ═══ ÁREAS (copia EXACTA de herramientas/areas.mjs de tocatoca; pruebas/chat.mjs las compara) ═══
   Parten el código de un proyecto en las áreas que dice su areas.json, para bajar «el paquete de
   un área» y dárselo a un chat con poco cupo. */
const DECL = /^(?:export default function|export function|function|const|let)\s+([A-Za-z_$][\w$]*)/;

/** Las declaraciones de primer nivel: { nombre, desde, hasta } (líneas, desde 1).
 *  Los comentarios pegados arriba de una declaración (sin renglón en blanco) viajan con ella. */
export function declaraciones(src) {
  const L = String(src).split("\n"), out = [];
  L.forEach((l, i) => { const m = DECL.exec(l); if (m) out.push({ nombre: m[1], desde: i + 1 }); });
  out.forEach((d) => {
    let a = d.desde;
    while (a > 1 && /^\s*(\/\/|\/\*|\*)/.test(L[a - 2]) && !DECL.test(L[a - 2])) a--;
    d.desde = a;
  });
  out.forEach((d, i) => { d.hasta = i + 1 < out.length ? out[i + 1].desde - 1 : L.length; });
  return out;
}

/** Controla que las áreas cubran TODAS las declaraciones, en orden y sin repetir. Devuelve la lista de problemas. */
export function verificar(areas, decls) {
  const err = [], idx = new Map(decls.map((d, i) => [d.nombre, i]));
  const ids = new Set();
  let siguiente = 0;
  for (const a of areas) {
    if (ids.has(a.id)) err.push(`área repetida: ${a.id}`); ids.add(a.id);
    for (const [d, h] of a.tramos || []) {
      if (!idx.has(d)) { err.push(`${a.id}: no existe «${d}» en el archivo`); continue; }
      if (!idx.has(h)) { err.push(`${a.id}: no existe «${h}» en el archivo`); continue; }
      const i = idx.get(d), j = idx.get(h);
      if (j < i) err.push(`${a.id}: «${h}» está antes que «${d}»`);
      else if (i !== siguiente) err.push(`${a.id}: empieza en «${d}» y debería empezar en «${decls[siguiente] && decls[siguiente].nombre}»`);
      siguiente = Math.max(siguiente, j + 1);
    }
  }
  if (siguiente < decls.length) err.push(`quedan sin área desde «${decls[siguiente].nombre}»`);
  return err;
}

/** El código de un área (todos sus tramos) y cuánto pesa. */
export function extraer(src, area, decls = declaraciones(src)) {
  const L = String(src).split("\n"), idx = new Map(decls.map((d) => [d.nombre, d]));
  const partes = (area.tramos || []).map(([d, h]) => {
    const a = idx.get(d), b = idx.get(h);
    return { de: a.desde, a: b.hasta, texto: L.slice(a.desde - 1, b.hasta).join("\n") };
  });
  const texto = partes.map((p) => `// ── ${area.id}: líneas ${p.de}–${p.a} de src/App.jsx ──\n${p.texto}`).join("\n\n");
  const lineas = partes.reduce((t, p) => t + (p.a - p.de + 1), 0);
  return { texto, lineas, tokens: Math.round(texto.length / 3.3), partes };
}

/** Qué declaraciones de OTRAS áreas usa un área (por nombre, mirando el código). Sirve para que el
 *  paquete traiga también lo que hace falta para entenderla. Puede incluir de más, nunca de menos
 *  en el primer nivel (no sigue las dependencias de las dependencias). */
export function usa(src, area, areas, decls = declaraciones(src)) {
  const propios = new Set();
  for (const [d, h] of area.tramos || []) {
    const i = decls.findIndex((x) => x.nombre === d), j = decls.findIndex((x) => x.nombre === h);
    for (let k = i; k <= j && i >= 0 && j >= 0; k++) propios.add(decls[k].nombre);
  }
  const dueno = new Map();
  for (const a of areas) for (const [d, h] of a.tramos || []) {
    const i = decls.findIndex((x) => x.nombre === d), j = decls.findIndex((x) => x.nombre === h);
    for (let k = i; k <= j && i >= 0 && j >= 0; k++) dueno.set(decls[k].nombre, a.id);
  }
  const L = String(src).split("\n"), texto = extraer(src, area, decls).texto;
  const sinCom = texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const out = [];
  for (const d of decls) {
    if (propios.has(d.nombre) || !new RegExp("(?<![\\w$.])" + d.nombre.replace(/\$/g, "\\$") + "(?![\\w$])").test(sinCom)) continue;
    out.push({ nombre: d.nombre, area: dueno.get(d.nombre), lineas: d.hasta - d.desde + 1, texto: L.slice(d.desde - 1, d.hasta).join("\n") });
  }
  return out;
}
/* ═══ FIN ÁREAS ═══ */

/** El paquete de un área: lo que se le da al chat de la persona, en un solo .md. */
export function armarPaquete({ proyecto = "", area, codigo, guia = "", fecha = "", archivo = "src/App.jsx", usadas = [] }) {
  const L = [];
  L.push(`# Paquete de desarrollo — ${linea(proyecto)} · ${linea(area.titulo)}`);
  L.push("");
  L.push(`Armado desde el panel${fecha ? " el " + fecha : ""} con el código de \`${archivo}\`. Dáselo a tu chat de IA junto con tu pedido.`);
  L.push("");
  L.push("## Tu pedido");
  L.push("");
  L.push("_(escribí acá qué querés cambiar en esta área, con tus palabras)_");
  L.push("");
  L.push("## Esta área");
  L.push("");
  L.push(`- **Qué hace:** ${linea(area.que)}`);
  L.push(`- **Tamaño:** ${codigo.lineas} líneas, unas ${Math.max(1, Math.round(codigo.tokens / 1000))} mil unidades de lectura.`);
  L.push(`- **Adónde va cuando se parta:** ${linea(area.destino)}`);
  L.push(`- **Cómo probarla:** ${linea(area.probar)}`);
  L.push(`- **Riesgo de tocarla:** ${linea(area.riesgo)}`);
  if (codigo.tokens > 20000) L.push(`- ⚠ **Es un área grande**: conviene pedir un cambio muy puntual, o partirla primero (está en el plan de arquitectura).`);
  L.push("");
  L.push("## Guía general");
  L.push("");
  L.push(String(guia).trim() || "_(no se pudo bajar la guía general: pedila aparte)_");
  L.push("");
  L.push("## El código del área");
  L.push("");
  L.push("Sólo esta parte de `" + archivo + "`. Si necesitás algo de otra área, pedilo antes de suponerlo.");
  L.push("");
  L.push("````jsx");
  L.push(codigo.texto);
  L.push("````");
  if (usadas.length) {
    let presupuesto = 400;
    const trae = [], solo = [];
    for (const u of usadas) { if (u.lineas <= presupuesto) { presupuesto -= u.lineas; trae.push(u); } else solo.push(u); }
    L.push(""); L.push("## Piezas de otras áreas que esta usa (sólo para leer: no las cambies)"); L.push("");
    L.push(usadas.map((u) => `\`${u.nombre}\` (${linea(u.area)}, ${u.lineas} líneas)`).join(" · "));
    if (trae.length) { L.push(""); L.push("````jsx"); L.push(trae.map((u) => u.texto).join("\n\n")); L.push("````"); }
    if (solo.length) { L.push(""); L.push(`No se incluye el código de: ${solo.map((u) => u.nombre).join(", ")}. Pedilo antes de suponer qué hacen.`); }
  }
  L.push("");
  return L.join("\n");
}

/** El nombre del archivo del paquete: `bandomaps-paquete-formas-recomendadas-2026-11-10.md`. */
export const nombrePaquete = (pr, area, fecha) =>
  nombreArchivo({ nombre: `${pr.nombre || pr.id} paquete ${area.id}` }, fecha).replace("-resumen", "");
