// ─────────────────────────────────────────────────────────────────────────────
// herramientas/novedades.mjs — Lo nuevo desde el último aviso, en UN WhatsApp.
//
//   node herramientas/novedades.mjs [--a Mauro] [--seco] [--bodega <dir>]
//
// novedades-1 · 30-sep-2026 · línea L-avisos.
//
// Pedido de Mauro, con sus palabras: «lo urgente y avisos especiales como
// llegada de una nueva reserva, una nueva tarea, una llegada próxima de
// check-in, próximo check-out. Mensajes pendientes de leer. Solicitud de cambio
// en algún sitio del ecosistema (para mí) o reporte de fallos.»
//
// Todo eso va JUNTO, en un solo mensaje por corrida: seis avisos sueltos a la
// misma hora son ruido, y el tope es de tres por día. Si no hay nada nuevo no
// se manda nada — el silencio es la buena noticia (PROTOCOLO-AVISOS.md § 2).
//
// «Nuevo» quiere decir «que todavía no se le avisó», y eso vive en la bodega:
// `avisos/visto.json`. La primera corrida sólo ANOTA lo que ya existe, sin
// mandarlo: si no, el primer aviso traería las veintidós reservas del año.
//
// Qué NO lleva, y la herramienta de avisos lo rechazaría igual: teléfonos,
// plata, mails. Los títulos y los textos de terceros se limpian antes
// (`limpiarParaAviso`), y el detalle queda detrás del login, en el enlace.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { avisar, taparNumeros, hoyMontevideo, validarTexto, LARGO_MAX } from "./avisos.mjs";

export const VERSION = "novedades-1";
const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const PANEL = "https://maurogasta-crypto.github.io/datos/";
export const CV_INTERNO = "https://casaverdecanas.com.br/interno/";

/* Las bases cuyos `reportes/` son pedidos y fallas de personas. Hilux no: ahí
   `reportes` son viajes (`reportesSon` en firestore.mjs). */
export const BASES_REPORTES = ["casaverde", "casayourte", "remate", "tiempos"];
const NOMBRE_BASE = { casaverde: "Casa Verde", casayourte: "CasaYourte", remate: "remate", tiempos: "Tiempos" };

/* Los chats que no son una persona esperando respuesta: los propios avisos. */
const NO_ES_UN_CHAT = /casaverde notificaciones|claude ·/i;

const sumarDias = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ddmm = (iso) => `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}`;
const cuando = (iso, hoy) => iso === hoy ? "hoy" : iso === sumarDias(hoy, 1) ? "mañana" : ddmm(iso);

/* Lo que un tercero escribió, apto para un WhatsApp: sin números largos, sin
   montos, sin mails, en una línea y corto. */
export function limpiarParaAviso(t, largo = 60) {
  let s = taparNumeros(String(t || "").replace(/\s+/g, " ").trim());
  s = s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[mail]")
       .replace(/(R\$|US\$|U\$S|\$|€)\s?[\d.,]+/gi, "[monto]")
       .replace(/[\d.,]*\d\s?(R\$|US\$|U\$S|€)/gi, "[monto]")
       .replace(/[\d.,]+\s?(reales|pesos|d[oó]lares|usd|uyu|brl)\b/gi, "[monto]")
       .replace(/https?:\/\/\S+/g, "");
  return s.length > largo ? s.slice(0, largo - 1).trimEnd() + "…" : s;
}

/* Del título de Airbnb «Airbnb · HMXXXX Natalia» queda «Natalia». */
const nombreHuesped = (r) => limpiarParaAviso(String(r.clienteNombre || "").replace(/^airbnb\s*·\s*/i, "")
  .replace(/\bHM[A-Z0-9]{6,}\b/g, "").trim() || "sin nombre", 30);

const nombreCabana = (cabanas, id) => {
  const n = ((cabanas || []).find((c) => c.id === id) || {}).nombre;
  return limpiarParaAviso((n && typeof n === "object" ? (n.es || Object.values(n)[0]) : n) || id || "", 28);
};

export const vistoVacio = () => ({ reservas: [], actividades: [], reportes: [], entradas: [], salidas: [], mensajesHasta: "" });

/**
 * Lo puro: con los datos y lo ya visto, qué hay de nuevo. No lee ni escribe.
 * Devuelve { items: [{clase, texto}], visto (actualizado), primera }.
 */
export function armarNovedades({ reservas = [], actividades = [], cabanas = [], reportes = [], mensajes = [] }, vistoIn, hoy, { para = "", ahora = Date.now() } = {}) {
  const primera = !vistoIn;
  const visto = { ...vistoVacio(), ...(vistoIn || {}) };
  const ya = (k, id) => visto[k].includes(id);
  const anotar = (k, id) => { if (!ya(k, id)) visto[k].push(id); };
  const items = [];
  const vivas = reservas.filter((r) => r && r.estado === "confirmada");

  // Reservas nuevas (las que el sitio todavía no tenía la vez pasada).
  for (const r of vivas.filter((r) => r.checkOut >= hoy)) {
    if (!ya("reservas", r.id)) items.push({ clase: "reserva",
      texto: `Reserva nueva: ${nombreHuesped(r)} · ${nombreCabana(cabanas, r.cabanaId)} · ${ddmm(r.checkIn)}–${ddmm(r.checkOut)}` });
    anotar("reservas", r.id);
  }
  // Check-in y check-out de hoy y mañana, una vez cada uno.
  for (const r of vivas) {
    if ((r.checkIn === hoy || r.checkIn === sumarDias(hoy, 1)) && !ya("entradas", r.id)) {
      items.push({ clase: "entrada", texto: `Llega ${cuando(r.checkIn, hoy)}: ${nombreHuesped(r)} · ${nombreCabana(cabanas, r.cabanaId)}` });
      anotar("entradas", r.id);
    }
    if ((r.checkOut === hoy || r.checkOut === sumarDias(hoy, 1)) && !ya("salidas", r.id)) {
      items.push({ clase: "salida", texto: `Sale ${cuando(r.checkOut, hoy)}: ${nombreHuesped(r)} · ${nombreCabana(cabanas, r.cabanaId)}` });
      anotar("salidas", r.id);
    }
  }
  // Tareas nuevas: no las limpiezas que nacen solas con una reserva (ya van
  // como reserva nueva), ni las borradas, ni las que creó quien recibe.
  for (const a of actividades) {
    if (!a || ya("actividades", a.id)) continue;
    anotar("actividades", a.id);
    if (a.eliminado || String(a.id).startsWith("limp-") || a.estado === "finalizada") continue;
    if (para && String(a.creadoNombre || "").toLowerCase() === para.toLowerCase()) continue;
    items.push({ clase: "tarea", texto: `Tarea nueva: ${limpiarParaAviso(a.titulo, 50)}${a.creadoNombre ? ` (de ${limpiarParaAviso(a.creadoNombre, 20)})` : ""}` });
  }
  // Pedidos y fallas de los sitios.
  for (const rp of reportes) {
    const clave = `${rp.base}/${rp.id}`;
    if (ya("reportes", clave)) continue;
    anotar("reportes", clave);
    if (rp.estado && rp.estado !== "nuevo") continue;
    const tipo = rp.tipo === "pedido" ? "Pedido" : "Falla";
    items.push({ clase: "reporte", texto: `${tipo} en ${NOMBRE_BASE[rp.base] || rp.base}${rp.nombre ? ` (${limpiarParaAviso(rp.nombre, 20)})` : ""}: «${limpiarParaAviso(rp.texto, 60)}»` });
  }
  // Mensajes que llegaron desde el último aviso, por chat.
  const nuevos = mensajes.filter((m) => m && String(m.captado || "") > (visto.mensajesHasta || "") && !NO_ES_UN_CHAT.test(`${m.chat} ${m.texto}`));
  /* De WhatsApp el `chat` es la persona o el grupo; de Airbnb es el TÍTULO de
     la notificación («Nueva reserva confirmada», «Podrías ganar…»), que no es
     un chat y a veces trae plata. Por eso Airbnb se cuenta y no se nombra. */
  if (nuevos.length) {
    const wa = [...new Set(nuevos.filter((m) => m.app !== "airbnb").map((m) => limpiarParaAviso(m.chat, 24)))];
    const ab = nuevos.filter((m) => m.app === "airbnb").length;
    const partes = [];
    if (wa.length) partes.push(`WhatsApp: ${wa.slice(0, 4).join(", ")}${wa.length > 4 ? ` y ${wa.length - 4} más` : ""}`);
    if (ab) partes.push(`Airbnb: ${ab} aviso${ab === 1 ? "" : "s"}`);
    items.push({ clase: "mensajes", texto: `Mensajes nuevos · ${partes.join(" · ")}` });
  }
  const ultimo = mensajes.map((m) => String(m.captado || "")).sort().pop();
  if (ultimo && ultimo > (visto.mensajesHasta || "")) visto.mensajesHasta = ultimo;

  /* EL TELÉFONO CALLADO. Todo lo de Airbnb y WhatsApp depende de que
     `telefono.mjs whatsapp --vigilar` esté corriendo en Termux, y si Android
     lo corta no hay ningún error: simplemente no llega nada, que se ve igual
     que un día sin mensajes. A Mauro le llegan mensajes todos los días, así
     que 24 horas sin una sola captura es la señal. Se avisa UNA vez por
     silencio (`telefonoAvisado`), no todas las mañanas. */
  const hasta = visto.mensajesHasta;
  if (hasta && ahora - Date.parse(hasta) > 24 * 3600e3 && visto.telefonoAvisado !== hasta) {
    const h = Math.round((ahora - Date.parse(hasta)) / 3600e3);
    items.push({ clase: "telefono", texto: `El teléfono no sube mensajes hace ${h} h: abrí Termux (con Termux:Boot arranca solo al reiniciar)` });
    visto.telefonoAvisado = hasta;
  }

  // Que lo visto no crezca para siempre: se queda con los últimos 500.
  for (const k of ["reservas", "actividades", "reportes", "entradas", "salidas"]) visto[k] = visto[k].slice(-500);
  /* La primera corrida anota lo que ya existe para no mandarlo, MENOS los
     check-in y check-out: ésos son de hoy y mañana, y la corrida siguiente
     tiene que poder avisarlos todavía. */
  if (primera) { visto.entradas = []; visto.salidas = []; }
  return { items: primera ? [] : items, visto, primera };
}

const ORDEN = ["telefono", "reporte", "entrada", "salida", "reserva", "tarea", "mensajes"];

/* El texto del WhatsApp: en el orden de lo que más apura, y sin pasar el tope.
   Si no entra, se dice cuántas cosas más hay: nunca se corta en silencio. */
export function textoNovedades(items) {
  const ord = [...items].sort((a, b) => ORDEN.indexOf(a.clase) - ORDEN.indexOf(b.clase));
  const pie = `\nDetalle: ${PANEL}`;
  const lineas = [];
  for (let i = 0; i < ord.length; i++) {
    const resto = ord.length - i - 1;
    const cand = [...lineas, "• " + ord[i].texto].join("\n") + (resto ? `\n…y ${resto} más` : "") + pie;
    if (cand.length > LARGO_MAX) { lineas.push(`…y ${ord.length - i} más`); break; }
    lineas.push("• " + ord[i].texto);
  }
  return lineas.join("\n") + pie;
}

/* ── Leer, armar y mandar ────────────────────────────────────────────────── */
function leerMensajes(bodega, dias = 3) {
  const dir = path.join(bodega, "mensajes");
  if (!fs.existsSync(dir)) return [];
  const desde = sumarDias(hoyMontevideo(), -dias);
  return fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f.slice(0, 10) >= desde)
    .flatMap((f) => { try { const l = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); return Array.isArray(l) ? l : []; } catch { return []; } });
}

export async function novedades({ a = "Mauro", bodega, seco = false } = {}) {
  if (!bodega || !fs.existsSync(bodega)) throw new Error("falta la bodega (--bodega <dir>): ahí vive lo ya avisado");
  const F = await import("./firestore.mjs");
  const cfg = F.PROYECTOS.casaverde;
  const s = await F.entrarSuave(cfg);
  if (!s.ok) throw new Error("no se pudo entrar a casaverde: " + s.motivo);
  const [reservas, actividades, cabanas] = await Promise.all(["reservas", "actividades", "cabanas"].map((c) => F.listar(cfg, s.sesion, c)));
  const reportes = [], fuentes = [];
  for (const b of BASES_REPORTES) {
    const cb = F.PROYECTOS[b];
    const sb = b === "casaverde" ? s : await F.entrarSuave(cb);
    if (!sb.ok) { fuentes.push(`${b}: no entró`); continue; }
    try { for (const r of await F.listar(cb, sb.sesion, "reportes")) reportes.push({ ...r, base: b }); }
    catch (e) { fuentes.push(`${b}: ${e.message}`); }
  }
  const archivo = path.join(bodega, "avisos", "visto.json");
  let visto = null;
  try { visto = JSON.parse(fs.readFileSync(archivo, "utf8")); } catch { visto = null; }
  const hoy = hoyMontevideo();
  const r = armarNovedades({ reservas, actividades, cabanas, reportes, mensajes: leerMensajes(bodega) }, visto, hoy, { para: a });
  const salida = { primera: r.primera, items: r.items, fuentes, texto: r.items.length ? textoNovedades(r.items) : "" };
  if (seco) return { ...salida, enviado: null };
  let enviado = null;
  if (r.items.length) {
    const v = validarTexto(salida.texto);
    if (!v.ok) throw new Error("el texto armado no pasa el control: " + v.motivos.join("; "));
    enviado = await avisar({ base: "casaverde", a, tema: "novedades", texto: salida.texto, bodega });
  }
  // Lo visto se guarda si no había nada que mandar o si salió. Si el envío
  // falló, NO: la próxima corrida lo vuelve a intentar con lo mismo.
  if (!r.items.length || (enviado && enviado.ok)) {
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    fs.writeFileSync(archivo, JSON.stringify(r.visto, null, 1) + "\n");
  }
  return { ...salida, enviado };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
  novedades({ a: opt("--a", "Mauro"), bodega: opt("--bodega", path.join(AQUI, "..", "..", "bodega")), seco: args.includes("--seco") })
    .then((r) => {
      if (r.fuentes.length) console.log("\n  ⚠ " + r.fuentes.join(" · "));
      if (r.primera) console.log(args.includes("--seco") ? "\n  Primera corrida (--seco): la de verdad anota lo que ya existe sin mandarlo." : "\n  Primera corrida: se anotó lo que ya existe, sin mandarlo. Desde la próxima, sólo lo nuevo.");
      if (!r.items.length) { console.log("\n  Nada nuevo: no se manda nada.\n"); return; }
      console.log("\n" + r.texto.split("\n").map((l) => "  " + l).join("\n"));
      if (r.enviado) console.log(`\n  ${r.enviado.ok ? "✓ mandado a" : "✖ no salió para"} ${r.enviado.a || ""}${r.enviado.ok ? "" : ": " + r.enviado.detalle}`
        + (r.enviado.archivo ? "\n  (falta commit y push de la bodega)" : ""));
      else console.log("\n  (--seco: no se mandó ni se anotó nada)");
      console.log("");
    })
    .catch((e) => { console.error("\n✖ " + e.message + "\n"); process.exit(1); });
}
