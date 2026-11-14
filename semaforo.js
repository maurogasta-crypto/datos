/* ═══════════════════════════════════════════════════════════
   semaforo.js — EL SEMÁFORO DE EDICIÓN: quién está tocando qué sección.
   Sello: semaforo-1 (10-nov-2026)

   Mauro, 10-nov-2026: «cuando corra un momento de modificación, al descargar
   ese documento para editar en el chat se tiene que dejar un aviso de
   semáforo de edición hasta que se sube la versión completa, para advertir a
   otro posible editor que hay alguien trabajando sobre ese archivo… esa alerta
   se genera desde el momento que se toca el botón de descargar el archivo
   para el chat, y se levanta al momento de traer la respuesta».

   Es un AVISO entre personas, no una cerradura de seguridad: lo que impide
   pisarse de verdad es que las reglas no dejan a una persona pisar el aviso
   vivo de otra (`ediciones/`, reglas v10). Si alguien se olvida, el aviso
   VENCE solo (24 h por defecto, 48 h como tope): se rompe hacia el verde,
   igual que las reservas de los chats.

   Un documento por sección: `ediciones/<proyecto>__<sección>`. Los datos son
   mínimos: quién, desde cuándo, hasta cuándo, qué archivos, y la huella de
   cada pieza al bajar (para detectar, al volver, que alguien la tocó en el
   medio). Nada sensible.

   Lógica pura + operaciones sobre Firestore recibidas por parámetro (`F`):
   no importa el SDK, así la usa el panel y la prueba la corre en Node.
   ═══════════════════════════════════════════════════════════ */

export const VERSION = "semaforo-1";
export const HORAS = 24;
export const MAX_HORAS = 48;
const HORA = 3600 * 1000;

/** El id del documento de una sección: sólo letras, números, guion y guion bajo. */
export const idEdicion = (proyecto, seccion) =>
  String(proyecto) + "__" + String(seccion).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "");

/** Milisegundos de algo que puede ser un Timestamp de Firestore, un Date, un número o null. */
export const msDe = (v) => {
  if (v == null) return null;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (v instanceof Date) return v.getTime();
  return Number.isFinite(Number(v)) ? Number(v) : null;
};

/** El estado de una sección para una persona.
 *  libre   · nadie la tiene (o el aviso venció)
 *  mia     · la tiene esta persona
 *  ocupada · la tiene otra persona y el aviso sigue vivo */
export function estadoDe(ed, ahoraMs, miUid) {
  if (!ed) return { estado: "libre" };
  const vence = msDe(ed.venceEn), desde = msDe(ed.desde);
  if (vence != null && vence <= ahoraMs) return { estado: "libre", vencido: true, quien: ed.nombre || "", desdeMs: desde, venceMs: vence };
  const base = { quien: ed.nombre || "alguien", desdeMs: desde, venceMs: vence, restanteMin: vence != null ? Math.max(0, Math.round((vence - ahoraMs) / 60000)) : null, archivos: ed.archivos || [] };
  return { estado: ed.uid === miUid ? "mia" : "ocupada", ...base };
}

const dur = (min) => min == null ? "" : min >= 90 ? `${Math.round(min / 60)} h` : `${min} min`;
/** El texto corto que se muestra al lado de la sección. */
export function textoDe(est) {
  if (est.estado === "libre") return est.vencido ? `🟢 libre (el aviso de ${est.quien || "alguien"} venció)` : "🟢 libre";
  if (est.estado === "mia") return `🟡 la tenés vos · el aviso dura ${dur(est.restanteMin)} más`;
  return `🔴 la está editando ${est.quien} · el aviso vence en ${dur(est.restanteMin)}`;
}

/** Los datos del aviso, listos para escribir. `desde` lo pone el servidor (las reglas lo exigen). */
export function datosNuevos({ proyecto, seccion, uid, nombre, archivos = [], piezas = {}, horas = HORAS, ahoraMs, paquete = "" }, { Timestamp, serverTimestamp }) {
  const h = Math.min(Math.max(Number(horas) || HORAS, 1), MAX_HORAS - 1);
  return {
    proyecto: String(proyecto), seccion: String(seccion), uid, nombre: String(nombre || "").slice(0, 80),
    desde: serverTimestamp(), venceEn: Timestamp.fromMillis(ahoraMs + h * HORA),
    archivos: archivos.slice(0, 20), piezas, paquete: String(paquete || "").slice(0, 40),
  };
}

/* ── Firestore, por parámetro: F = { db, doc, setDoc, deleteDoc, collection, getDocs, query, where, serverTimestamp, Timestamp } ── */

/** Todos los avisos de un proyecto: { sección: datos }. Es una CONSULTA y no un `get`: con un `get` de
 *  un documento que no existe, las reglas de lectura no tienen de dónde sacar el proyecto. */
export async function listar(F, proyecto) {
  const s = await F.getDocs(F.query(F.collection(F.db, "ediciones"), F.where("proyecto", "==", proyecto)));
  const out = {};
  s.forEach((d) => { const x = d.data(); out[x.seccion] = x; });
  return out;
}

/** Marca la sección como «en edición» a nombre de esta persona. Devuelve { ok, estado }.
 *  Si otra persona tiene el aviso vivo, las reglas lo rechazan: eso es lo que hace de esto algo más que un cartel. */
export async function tomar(F, { proyecto, seccion, uid, nombre, archivos, piezas, horas, paquete }, ahoraMs = Date.now()) {
  const actuales = await listar(F, proyecto);
  const est = estadoDe(actuales[seccion], ahoraMs, uid);
  if (est.estado === "ocupada") return { ok: false, estado: est };
  const datos = datosNuevos({ proyecto, seccion, uid, nombre, archivos, piezas, horas, ahoraMs, paquete }, F);
  try {
    await F.setDoc(F.doc(F.db, "ediciones", idEdicion(proyecto, seccion)), datos);
  } catch (e) {
    if (e && e.code === "permission-denied") {            // alguien la tomó entre que miramos y que escribimos
      const otra = estadoDe((await listar(F, proyecto))[seccion], ahoraMs, uid);
      return { ok: false, estado: otra.estado === "ocupada" ? otra : est, carrera: true };
    }
    throw e;
  }
  return { ok: true, estado: { estado: "mia" }, datos };
}

/** Levanta el aviso. Sólo puede quien lo puso (o el equipo): lo dicen las reglas. */
export async function soltar(F, proyecto, seccion) {
  await F.deleteDoc(F.doc(F.db, "ediciones", idEdicion(proyecto, seccion)));
}
