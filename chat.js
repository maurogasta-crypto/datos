/* ═══════════════════════════════════════════════════════════
   chat.js — el canal entre un invitado y SU propio chat de IA
   Sello: chat-6 (16-nov-2026: el paquete de un área baja como ZIP con archivos de verdad y su LEEME; chat-5, 14-nov)

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

export const SELLO = "chat-6";
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
  L.push("1. Dale este archivo a tu Claude (una sesión gratuita de claude.ai alcanza).");
  L.push("2. Pedile lo que quieras: opinar, proponer, revisar un punto.");
  L.push("3. Cargá su respuesta en tu panel, en «Trabajar con una sesión gratuita de Claude». Si tenés acceso de colaborador al repositorio, podés en cambio subir el resultado vos, directo, siguiendo la guía de desarrollo. En los dos casos se analiza contra el resto del proyecto antes de llegar a los alumnos.");
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

/** Un archivo que no es texto no se lee: se dice. Desde chat-6 entran también los archivos de
 *  código que devuelve el chat con el paquete zip (regla 1 del LEEME: el archivo completo). */
export const esArchivoDeTexto = (f) => !!f && (/\.(md|markdown|txt|js|jsx|mjs|css|html|json)$/i.test(f.name || "") || /^text\//.test(f.type || ""));

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
  L.push(`Armado desde el panel${fecha ? " el " + fecha : ""} con el código de \`${archivo}\`. Dáselo a tu Claude (una sesión gratuita alcanza) junto con tu pedido.`);
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

/* ═══ EL PAQUETE COMO ZIP (chat-6, 16-nov-2026) ═══
   Mauro: «la exportación debería descargar los archivos propiamente dentro de un zip, y si es muy
   complejo cada archivo que componga esa sesión en el repositorio con el manual de explicación,
   para que el chat sea capaz de devolver en la sesión el archivo con las modificaciones pronto
   para sustituir en el repositorio. El manual debe ser lo suficientemente preciso para posibilitar
   al chat gratuito hacer la modificación que se le pida sin romper o pidiendo que se le descarguen
   los archivos que le estén faltando». La idea: que Mariano siga haciendo sus modificaciones
   chicas mientras Mauro avanza con la estructura general.

   · Un área que YA vive en archivos de verdad (`archivos` en areas.json) viaja con SUS rutas del
     repositorio: lo que vuelve con esa ruta se sustituye tal cual.
   · Un área que sigue adentro de src/App.jsx viaja como UN archivo `<id>.jsx` (sus tramos): vuelve
     completo con ese mismo nombre, y la sustitución adentro de App.jsx la hace el equipo con sus
     herramientas (areas.mjs / mover.mjs de tocatoca), nunca el chat gratuito.
   · El zip se arma acá, sin dependencias: ZIP sin compresión (STORE), que abre cualquier sistema;
     el banco lo desarma byte a byte. Son textos chicos: comprimir no pagaba una dependencia. */

/** Los archivos que van adentro del zip de un área: el LEEME (el manual), el código (como archivos
 *  de verdad), la guía general y lo de otras áreas en una carpeta `solo-leer/`. */
export function archivosDelPaquete({ proyecto = "", repo = "", area, codigo, guia = "", fecha = "", reales = null, usadas = [] }) {
  const deAppJsx = !(Array.isArray(reales) && reales.length);
  const rutas = deAppJsx ? [`${area.id}.jsx`] : reales.map((r) => r.ruta);
  let presupuesto = 400;
  const trae = [], sinCodigo = [];
  for (const u of usadas) { if (u.lineas <= presupuesto) { presupuesto -= u.lineas; trae.push(u); } else sinCodigo.push(u); }
  const L = [];
  L.push(`# ${linea(proyecto)} · ${linea(area.titulo)} — paquete para trabajar con tu chat`);
  L.push("");
  L.push(`Armado desde el panel${fecha ? " el " + fecha : ""}. El código vive en el repositorio${repo ? ` \`${repo}\`` : ""}.`);
  L.push("");
  L.push("## Tu pedido");
  L.push("");
  L.push("_(escribí acá qué querés cambiar en esta área, con tus palabras, y dale este zip a tu Claude: una sesión gratuita alcanza)_");
  L.push("");
  L.push("## Qué hay en este zip");
  L.push("");
  L.push("- `LEEME.md` — esto: las reglas para que tu chat trabaje sin romper nada.");
  for (const r of rutas) L.push(`- \`${r}\` — el código del área: **esto es lo que se puede cambiar**.`);
  if (guia) L.push("- `guia-general.md` — las reglas del proyecto entero: mandan sobre todo.");
  if (trae.length) L.push("- `solo-leer/piezas-de-otras-areas.jsx` — lo de otras áreas que esta usa: para entender, **nunca para cambiar**.");
  L.push("");
  L.push("## Para tu chat: las reglas, precisas");
  L.push("");
  L.push("1. **Devolvé cada archivo que cambies COMPLETO**, con el MISMO nombre y la misma ruta que tiene en este zip, listo para sustituir tal cual en el repositorio. Nada de fragmentos, diffs ni «…el resto queda igual».");
  if (deAppJsx) L.push(`2. \`${area.id}.jsx\` son las líneas de \`${linea(area.archivoOrigen || "src/App.jsx")}\` que forman esta área (${codigo.lineas} líneas). Devolvelo completo con ese mismo nombre: la sustitución adentro del archivo grande la hace el equipo con sus herramientas, no vos.`);
  else L.push("2. Cada archivo de código conserva su ruta real del repositorio: lo que devuelvas con esa ruta se sustituye directo.");
  L.push("3. **No cambies** el nombre, los parámetros ni el comportamiento de una pieza que usan otras áreas (las de `solo-leer/` y las que la guía marque como intocables): otras partes del sitio dependen de eso.");
  L.push("4. **Si te falta algo** —un archivo, una pieza que no está acá—, **no lo inventes ni lo supongas**: decí exactamente qué archivo o pieza necesitás, y la persona te baja el paquete del área que lo tiene.");
  L.push("5. No agregues dependencias (npm) ni archivos nuevos sin decirlo y explicar por qué. En todo lo demás manda `guia-general.md`.");
  L.push("6. Terminá tu respuesta con la lista de los archivos que devolvés y, en una línea cada uno, qué cambiaste y por qué.");
  L.push("");
  L.push("## Cómo vuelve el trabajo");
  L.push("");
  L.push("La persona carga tu respuesta en su panel («Trabajar con una sesión gratuita de Claude»), o —si es colaboradora del repositorio— sube el archivo siguiendo la guía. En los dos caminos se verifica contra el resto del proyecto antes de llegar a los alumnos.");
  L.push("");
  L.push("## Esta área");
  L.push("");
  L.push(`- **Qué hace:** ${linea(area.que)}`);
  L.push(`- **Tamaño:** ${codigo.lineas} líneas, unas ${Math.max(1, Math.round(codigo.tokens / 1000))} mil unidades de lectura.`);
  if (area.destino) L.push(`- **Adónde va cuando se parta:** ${linea(area.destino)}`);
  if (area.probar) L.push(`- **Cómo probarla:** ${linea(area.probar)}`);
  if (area.riesgo) L.push(`- **Riesgo de tocarla:** ${linea(area.riesgo)}`);
  if (codigo.tokens > 20000) L.push("- ⚠ **Es un área grande**: conviene pedir un cambio muy puntual, o partirla primero (está en el plan de arquitectura).");
  if (sinCodigo.length) {
    L.push("");
    L.push(`Piezas que esta área usa y NO vienen en el zip (regla 4: pedilas antes de suponer qué hacen): ${sinCodigo.map((u) => `\`${u.nombre}\` (${linea(u.area)})`).join(", ")}.`);
  }
  L.push("");
  const archivos = [{ nombre: "LEEME.md", texto: L.join("\n") }];
  if (deAppJsx) archivos.push({ nombre: `${area.id}.jsx`, texto: codigo.texto });
  else for (const r of reales) archivos.push({ nombre: r.ruta, texto: String(r.texto) });
  if (guia) archivos.push({ nombre: "guia-general.md", texto: String(guia).trim() });
  if (trae.length) archivos.push({
    nombre: "solo-leer/piezas-de-otras-areas.jsx",
    texto: "// SÓLO PARA LEER: piezas de otras áreas que esta área usa. NO SE CAMBIAN.\n\n"
      + trae.map((u) => `// ── ${u.nombre} (área ${u.area}) ──\n${u.texto}`).join("\n\n"),
  });
  return archivos;
}

/* El CRC32 que el formato ZIP exige para cada archivo, tabla clásica (polinomio 0xEDB88320). */
let TABLA_CRC = null;
export function crc32(bytes) {
  if (!TABLA_CRC) {
    TABLA_CRC = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; TABLA_CRC[n] = c; }
  }
  let c = -1;
  for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** Un ZIP sin compresión (STORE) con esos archivos de texto. Devuelve los bytes (Uint8Array). */
export function armarZip(archivos, fecha = "") {
  const enc = new TextEncoder();
  const [a, m, d] = /^\d{4}-\d{2}-\d{2}/.test(fecha) ? fecha.slice(0, 10).split("-").map(Number) : [1980, 1, 1];
  const dosFecha = ((Math.min(127, Math.max(0, a - 1980)) << 9) | ((m & 15) << 5) | (d & 31));
  const dosHora = 12 << 11;                                        // mediodía: un zip no precisa la hora real
  const u16 = (v) => [v & 255, (v >>> 8) & 255];
  const u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  const partes = [], centrales = [];
  let offset = 0;
  for (const f of archivos) {
    const nombre = enc.encode(String(f.nombre)), datos = enc.encode(String(f.texto));
    const crc = crc32(datos);
    // Cabecera local: firma PK\3\4, versión 2.0, nombres en UTF-8 (bit 11), sin compresión.
    const cab = new Uint8Array([0x50, 0x4B, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0),
      ...u16(dosHora), ...u16(dosFecha), ...u32(crc), ...u32(datos.length), ...u32(datos.length),
      ...u16(nombre.length), ...u16(0)]);
    partes.push(cab, nombre, datos);
    centrales.push({ nombre, largo: datos.length, crc, offset });
    offset += cab.length + nombre.length + datos.length;
  }
  const dirInicio = offset;
  for (const c of centrales) {
    const e = new Uint8Array([0x50, 0x4B, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0),
      ...u16(dosHora), ...u16(dosFecha), ...u32(c.crc), ...u32(c.largo), ...u32(c.largo),
      ...u16(c.nombre.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(c.offset)]);
    partes.push(e, c.nombre);
    offset += e.length + c.nombre.length;
  }
  partes.push(new Uint8Array([0x50, 0x4B, 5, 6, ...u16(0), ...u16(0),
    ...u16(centrales.length), ...u16(centrales.length), ...u32(offset - dirInicio), ...u32(dirInicio), ...u16(0)]));
  const out = new Uint8Array(partes.reduce((t, p) => t + p.length, 0));
  let o = 0;
  for (const p of partes) { out.set(p, o); o += p.length; }
  return out;
}

/** El nombre del zip: como el del paquete, con su extensión. */
export const nombreZip = (pr, area, fecha) => nombrePaquete(pr, area, fecha).replace(/\.md$/, ".zip");
