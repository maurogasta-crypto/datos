/* ═══════════════════════════════════════════════════════════
   exportar.js — LO QUE ARMA EL TEXTO PARA GEMINI. Sello: exportar-1

   29-oct-2026, Mauro: «poder tener un diálogo con otra IA para auditar el
   desarrollo… con acceso a toda la documentación y el código en bruto…
   un botón para exportar la totalidad y pasársela al chat de Gemini». Gemini
   AUDITA y PROPONE; Claude evalúa y escribe; lo propuesto vuelve por el
   botón «Pedido» del panel, marcado `origen: "gemini"`.

   Acá vive sólo la lógica pura —qué archivo entra, cómo se separa, qué se
   tapa—, sin Firebase ni red, para que el banco la corra con Node
   (`node pruebas/exportar.mjs`). La red y la sesión las pone `gemini.html`.

   Dos niveles, porque el ecosistema entero (~8,7 MB, ~2,5 M de tokens) no
   entra en la ventana de Gemini, y un archivo que entra a medias es peor que
   uno chico: la IA opina con confianza sobre lo que no vio.
     · el MAPA: los CLAUDE.md de cada repositorio, `protocolos/` y
       `TRASPASO.md` de datos, y el estado del panel (líneas, pendientes
       abiertos, tandas recientes, proyectos);
     · UN REPOSITORIO en bruto: todo su texto, sin binarios ni respaldos.

   LO QUE NO SALE NUNCA: `claves/` y `fichas/` (ni se leen), la bodega (no
   está en `proyectos/`), los datos de las bases de los sitios (no se leen),
   y del estado del panel se tapan mails, teléfonos y UIDs (`tapar`). El
   código no se tapa: ya es público en GitHub.
   ═══════════════════════════════════════════════════════════ */

export const VERSION = "exportar-1";

/* Carpetas que no son el desarrollo: dependencias, compilados y los
   respaldos JSON del panel (`respaldos/`), que son datos y no código. */
const CARPETAS_FUERA = /(^|\/)(node_modules|respaldos|\.git|build|\.gradle|\.dart_tool|\.idea|gradle\/wrapper)\//;
/* Lo que es texto y sirve para entender el código. Un .json o .xml grande
   suele ser un dato o un generado: entra sólo si es chico. */
const TEXTO = /\.(md|txt|html?|css|js|mjs|cjs|rules|kt|kts|dart|ya?ml|gradle|toml|properties|sh|py|java|ts|tsx|jsx)$/i;
const TEXTO_CHICO = /\.(json|xml|svg)$/i;
const NOMBRES_TEXTO = /(^|\/)(REGLAS\.txt|reglas\.txt|CNAME|\.gitignore|Gemfile|Makefile)$/;
const BLOQUEO = /(^|\/)(package-lock\.json|pubspec\.lock|yarn\.lock|.*\.lock)$/;
export const TOPE_ARCHIVO = 500 * 1024;   // más que eso es un generado
export const TOPE_CHICO = 60 * 1024;

/** ¿Este archivo del árbol de GitHub entra al repositorio en bruto? */
export function entra(ruta, tam = 0) {
  const r = String(ruta || "");
  if (!r || CARPETAS_FUERA.test(r) || BLOQUEO.test(r)) return false;
  if (tam > TOPE_ARCHIVO) return false;
  if (TEXTO.test(r) || NOMBRES_TEXTO.test(r)) return true;
  return TEXTO_CHICO.test(r) && tam <= TOPE_CHICO;
}

/** ¿Este archivo va al MAPA? Los CLAUDE.md de todos; de datos, además el reglamento y la ronda. */
export function vaAlMapa(repo, ruta) {
  const r = String(ruta || "");
  if (r === "CLAUDE.md") return true;
  if (!/\/datos$/.test(String(repo || ""))) return false;
  return r === "TRASPASO.md" || (/^protocolos\/[^/]+\.md$/.test(r));
}

/** Los repositorios de `proyectos/` (campo `sitio.repo`), sin repetir y en orden. */
export function reposDe(proyectos) {
  const vistos = new Map();
  for (const p of proyectos || []) {
    const repo = p && p.sitio && typeof p.sitio.repo === "string" ? p.sitio.repo.trim() : "";
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) continue;
    if (!vistos.has(repo)) vistos.set(repo, { repo, proyectos: [] });
    vistos.get(repo).proyectos.push(p.id);
  }
  return [...vistos.values()].sort((a, b) => a.repo.localeCompare(b.repo));
}

/* Un teléfono tiene de 8 a 13 cifras. Una fecha (2026-10-29), una hora o un
   instante en milisegundos (13 cifras pegadas) no lo son, y taparlos dejaría
   el estado del panel sin fechas. */
function pareceTelefono(n) {
  const cifras = n.replace(/\D/g, "");
  if (cifras.length < 8 || cifras.length > 13) return false;
  if (/^\d{4}-\d{2}-\d{2}/.test(n) || /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(n)) return false;
  return !(/^\d+$/.test(n) && cifras.length > 12);
}

/** Del estado del panel se tapan mails, teléfonos y UIDs de Firebase. El texto de una persona no sale. */
export function tapar(s) {
  return String(s ?? "")
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[mail]")
    .replace(/(^|[^\w])(\+?\d[\d\s().-]{6,}\d)(?=$|[^\w])/g, (m, a, n) => a + (pareceTelefono(n) ? "[teléfono]" : n))
    .replace(/\b(?=[A-Za-z0-9]{28}\b)(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{28}\b/g, "[uid]");
}

const LINEA = "=".repeat(5);
/** Un archivo, con sus marcas de principio y fin para que no se mezcle con el siguiente. */
export function archivo(repo, ruta, texto) {
  return `\n${LINEA} ARCHIVO: ${repo}/${ruta} ${LINEA}\n${String(texto ?? "").replace(/\s+$/, "")}\n${LINEA} FIN: ${repo}/${ruta} ${LINEA}\n`;
}

/** La cabecera: qué es, a qué commit, y cómo devolver una propuesta para que entre como pedido. */
export function cabecera({ nivel, repos = [], ahora = new Date(), faltan = [] }) {
  const fecha = ahora.toISOString().slice(0, 16).replace("T", " ") + " UTC";
  const que = nivel === "mapa"
    ? "el MAPA del ecosistema: las reglas de cada repositorio (CLAUDE.md), el reglamento común (protocolos/), cómo trabaja la ronda diaria (TRASPASO.md) y el estado del trabajo en el panel"
    : `TODO el texto de UN repositorio (${repos.map((r) => r.repo).join(", ")}): código, reglas y documentación, sin binarios`;
  return [
    `${LINEA} EXPORTACIÓN PARA GEMINI · ${VERSION} · ${fecha} ${LINEA}`,
    "",
    `Esto es ${que}.`,
    "",
    "TU ROL: auditor. Leés y proponés; no escribís código en los repositorios. El",
    "desarrollo lo hace Claude (Claude Code), que evalúa cada propuesta contra estas",
    "reglas y el código del momento antes de tocar nada, y la decisión es de Mauro.",
    "Si algo de acá contradice lo que proponés, gana lo de acá, o explicá por qué no.",
    "",
    "ES UNA FOTO a estos commits (citá el commit al proponer):",
    ...repos.map((r) => `  · ${r.repo} @ ${String(r.sha || "?").slice(0, 7)}${r.fecha ? "  (" + r.fecha + ")" : ""}`),
    ...(faltan.length ? ["", "NO SE PUDO LEER (no lo supongas):", ...faltan.map((f) => "  · " + f)] : []),
    "",
    "LO QUE FALTA A PROPÓSITO: datos de personas (reservas, clientes, mensajes),",
    "credenciales, la bóveda y las fichas del panel. Mails, teléfonos y UIDs del",
    "estado del panel están tapados. No pidas esos datos: no van a un chat.",
    "",
    "CÓMO DEVOLVER UNA PROPUESTA (Mauro la pega en «Pedido» del panel, marcada",
    "«Es una propuesta de Gemini»): una por bloque, y la PRIMERA LÍNEA es el título.",
    "  <título, en una línea>",
    "  Sitio: <id del proyecto: casaverde, casayourte, remate, tiempos, pizarra, hilux, datos…>",
    "  Al commit: <repo>@<7 letras>",
    "  Qué y por qué: <el problema que viste, con el archivo y la regla que toca>",
    "  Riesgo: bajo | alto, y por qué",
    "",
    `Cada archivo va entre «${LINEA} ARCHIVO: repo/ruta ${LINEA}» y «${LINEA} FIN: repo/ruta ${LINEA}».`,
    `${LINEA} FIN DE LA CABECERA ${LINEA}`,
    ""
  ].join("\n");
}

/* Lo que habla de reservas, huéspedes o clientes suele nombrar a una persona
   («los 2 niños de Darío»): de esos pendientes y renglones de tanda sale sólo
   el título, sin el detalle. Mejor perder un detalle que exportar un huésped. */
export const DE_PERSONAS = /reserv|hu[ée]sped|h[óo]spede|cliente|inquilin|arrendatari|consulta de|llegada|check-?in/i;
const tomadaPor = (t) => !t ? "" : typeof t === "string" ? t : (t.chat || t.por || t.quien || "");

const corto = (s, n) => { const t = String(s ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const fechaDe = (v) => (v && typeof v === "object" && "seconds" in v) ? new Date(v.seconds * 1000).toISOString().slice(0, 10)
  : (v && typeof v.toDate === "function") ? v.toDate().toISOString().slice(0, 10) : String(v || "").slice(0, 10);

/** El estado del panel, en texto: líneas, pendientes abiertos, tandas recientes y proyectos. Todo tapado. */
export function estadoPanel({ lineas = [], pendientes = [], tandas = [], proyectos = [] }, { tandasRecientes = 20 } = {}) {
  const L = [];
  L.push("PROYECTOS");
  for (const p of [...proyectos].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    const e = p.esquema && p.esquema.resumen ? " — " + corto(p.esquema.resumen, 300) : "";
    L.push(`  · ${p.id}: ${p.nombre || ""}${p.sitio && p.sitio.repo ? " [" + p.sitio.repo + "]" : ""}${p.etapa ? " · etapa " + p.etapa : ""}${e}`);
  }
  L.push("", "LÍNEAS DE TRABAJO");
  for (const l of lineas.filter((x) => x.estado !== "cerrada")) {
    const quien = tomadaPor(l.tomada);
    L.push(`  · ${l.id} [${l.estado || "abierta"}${quien ? ", la tiene " + quien : ""}]: ${corto(l.titulo, 160)}`);
    if (l.porQue && !DE_PERSONAS.test(l.porQue)) L.push(`      por qué: ${corto(l.porQue, 400)}`);
  }
  const abiertos = pendientes.filter((p) => p.estado !== "hecho" && p.estado !== "retirado")
    .sort((a, b) => String(a.proyecto).localeCompare(String(b.proyecto)) || String(a.id).localeCompare(String(b.id)));
  L.push("", `PENDIENTES ABIERTOS (${abiertos.length})`);
  for (const p of abiertos) {
    L.push(`  · ${p.id} [${p.prioridad || "media"} · le toca a ${p.quien || "?"}${p.tipo ? " · " + p.tipo : ""}${p.origen === "gemini" ? " · propuesta de Gemini" : ""}]: ${corto(p.titulo, 160)}`);
    if (DE_PERSONAS.test([p.titulo, p.porQue, p.plan, p.pregunta, p.respuesta].join(" "))) {
      L.push("      (trata de reservas o clientes: el detalle no se exporta)"); continue;
    }
    if (p.porQue) L.push(`      por qué: ${corto(p.porQue, 600)}`);
    if (p.plan) L.push(`      plan: ${corto(p.plan, 400)}${p.riesgo ? " (riesgo " + p.riesgo + ")" : ""}`);
    if (p.pregunta) L.push(`      Claude preguntó: ${corto(p.pregunta, 400)}`);
    if (p.respuesta) L.push(`      Mauro respondió: ${corto(p.respuesta, 400)}`);
  }
  const ultimas = [...tandas].sort((a, b) => String(b.fecha || b.id).localeCompare(String(a.fecha || a.id))).slice(0, tandasRecientes);
  L.push("", `TANDAS RECIENTES (las ${ultimas.length} últimas: qué se entregó)`);
  for (const t of ultimas) {
    L.push(`  · ${fechaDe(t.fecha) || t.id} · ${corto(t.titulo, 160)}${t.commit ? "  [" + corto(t.commit, 160) + "]" : ""}`);
    for (const h of (Array.isArray(t.hecho) ? t.hecho : []).slice(0, 8))
      L.push(DE_PERSONAS.test(h) ? "      - (sobre reservas o clientes: no se exporta)" : `      - ${corto(h, 300)}`);
  }
  return tapar(L.join("\n"));
}

/** Tokens aproximados de un texto (≈3,5 caracteres por token en castellano y código). */
export const tokens = (s) => Math.round(String(s || "").length / 3.5);
