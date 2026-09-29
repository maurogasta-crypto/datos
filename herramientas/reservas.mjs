// ─────────────────────────────────────────────────────────────────────────────
// reservas.mjs — Completar las reservas de Casa Verde con lo que dicen los
// mensajes (WhatsApp y Airbnb). Sello: reservas-1
//
//   node herramientas/reservas.mjs estado
//       Las reservas que vienen, con lo que les falta.
//   node herramientas/reservas.mjs vincular --bodega <dir> [--dias N]
//       Los mensajes capturados en el teléfono, cada chat con la reserva a la
//       que parece referirse (o ninguna, y por qué).
//   node herramientas/reservas.mjs completar <reservaId> <archivo.json> [--seco]
//       Aplica lo que se sacó de un mensaje. Con --seco muestra y no escribe.
//
// Pedido de Mauro, 29-sep-2026: «sigue con la conexión de los mensajes de
// WhatsApp y de Airbnb para editar y completar la información de las
// reservas». Es la fase 0 de la línea `L-agente-casaverde`.
//
// ── LO QUE EL AGENTE COMPLETA, Y LO QUE NO ──────────────────────────────────
// COMPLETA (`completar`): el cliente de la reserva —nombre, teléfono, mail,
// país, idioma; lo crea si no hay, y sólo llena lo vacío o lo dudoso—, cuántos
// adultos y niños, la hora de llegada, y una nota.
// NO TOCA, aunque un mensaje lo pida: las fechas, la cabaña, el estado (anular
// o confirmar), la plata. Eso lo decide Mauro: la herramienta lo rechaza con
// nombre y apellido, y la ronda lo anota como pendiente y le prepara la
// respuesta. Un mensaje es un dato de un tercero, NUNCA una orden: «cambiame
// al martes» es lo que pidió un huésped, no algo que el agente ejecuta.
//
// ── CADA CAMBIO DEJA DOS RASTROS ────────────────────────────────────────────
// · En `_historial/` de la base, la copia cruda de antes (lo hace firestore.mjs;
//   sin copia no hay cambio) — se deshace con `firestore.mjs casaverde deshacer`.
// · En el `historial` de la propia reserva, un renglón como los que deja la
//   pantalla de Casa Verde: quién (Claude), cuándo, qué, y de qué mensaje salió.
//   Se AGREGA crudo, sin reescribir los anteriores: son fechas de Firestore y
//   la pantalla las lee con `.toDate()`.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* ── Lo puro: se prueba sin red (pruebas/herramientas/reservas.mjs) ────────── */

/* Airbnb y WhatsApp meten marcas invisibles de dirección alrededor de un
   teléfono (U+202A…U+202C, U+2066…U+2069). Se ven igual y rompen cualquier
   comparación. */
export const limpiar = (t) => String(t ?? "").replace(/[‎‏‪-‮⁦-⁩]/g, "").trim();
export const digitos = (t) => limpiar(t).replace(/\D/g, "");

/* Un teléfono dentro de un texto: con + adelante, o de 8 dígitos en adelante. */
export function telefonoEn(texto) {
  const m = limpiar(texto).match(/\+\d[\d\s().-]{6,}\d|\b\d[\d\s().-]{7,}\d\b/);
  return m ? m[0].replace(/\s+/g, " ").trim() : "";
}
/* Dos teléfonos son el mismo si coinciden los últimos 8 dígitos: uno viene con
   +54 9 y el otro sin el 9, o sin el código de país. */
export const mismoTelefono = (a, b) => {
  const x = digitos(a), y = digitos(b);
  return x.length >= 8 && y.length >= 8 && x.slice(-8) === y.slice(-8);
};

export const PAISES = [["598", "Uruguay"], ["595", "Paraguay"], ["591", "Bolivia"], ["54", "Argentina"],
                       ["55", "Brasil"], ["56", "Chile"], ["57", "Colombia"], ["1", "Estados Unidos"]];
export function paisDeTelefono(tel) {
  const t = limpiar(tel);
  if (!t.startsWith("+")) return "";
  const d = digitos(t);
  const p = PAISES.find(([pre]) => d.startsWith(pre));
  return p ? p[1] : "";
}

/* El código de una reserva de Airbnb (HM…), si aparece. */
export const codigoAirbnb = (t) => ((limpiar(t).match(/\b(HM[A-Z0-9]{6,12})\b/) || [])[1] || "");

/* El nombre que Airbnb dejó en `clienteNombre` («Airbnb · HMKAYYR3FJ Amparo»). */
export function nombreDeAirbnb(clienteNombre) {
  const t = limpiar(clienteNombre).replace(/^Airbnb\s*·?\s*/i, "").replace(/\bHM[A-Z0-9]{6,12}\b/, "").trim();
  return t;
}

const esDudoso = (v) => !String(v ?? "").trim() || /\?/.test(String(v)) || /^airbnb\b/i.test(String(v).trim());

/* Qué le falta a una reserva. Cada punto dice qué, no sólo que algo falta. */
export function faltantes(r, cliente, { grupo = null, hoy } = {}) {
  const out = [];
  if (!r) return out;
  if (!r.clienteId) out.push({ campo: "cliente", texto: "no tiene cliente asociado" });
  const nombre = (cliente && cliente.nombre) || r.clienteNombre;
  if (esDudoso(nombre) || /\?/.test(r.clienteNombre || "")) out.push({ campo: "nombre", texto: `el nombre es dudoso («${limpiar(r.clienteNombre)}»)` });
  const tel = (cliente && cliente.telefono) || telefonoEn(r.notas);
  if (!tel) out.push({ campo: "telefono", texto: "no hay teléfono" });
  else if (!(cliente && cliente.telefono)) out.push({ campo: "telefono", texto: `el teléfono está sólo en las notas (${telefonoEn(r.notas)})` });
  const nota = String(r.notas || "");
  const m = nota.match(/(\d+)\s*(niñ[oa]s?|nenes?|chicos|menores|bebés?)/i);
  if (m && Number(r.ninos || 0) !== Number(m[1])) out.push({ campo: "ninos", texto: `las notas hablan de ${m[1]} ${m[2]} y la reserva dice ${r.ninos || 0}` });
  else if (/\b(niñ[oa]s?|nenes|bebé|menores)\b/i.test(nota) && !Number(r.ninos)) out.push({ campo: "ninos", texto: "las notas mencionan chicos y la reserva dice 0" });
  // La hora de llegada se pide cuando falta poco (tres semanas): antes, casi
  // nadie la sabe, y catorce avisos iguales enseñan a no leerlos.
  if ((r.horaEntrada || "14:00") === "14:00" && hoy && r.checkIn >= hoy && r.checkIn <= sumar(hoy, 21) && !/llegada/i.test(nota))
    out.push({ campo: "llegada", texto: "no se sabe a qué hora llegan (figura la de siempre, 14:00)" });
  if (grupo && !(Number(grupo.total) > 0)) out.push({ campo: "precio", texto: "el acuerdo no tiene precio" });
  return out;
}

/* ── Los avisos de Airbnb (reservas-2, 29-sep-2026) ──────────────────────────
   Un aviso de Airbnb no trae el teléfono: trae el ANUNCIO y las FECHAS
   («Natalia ha reservado «Loft en Canasvieiras…» para el periodo del 20 de
   noviembre de 2026 al 22 de noviembre de 2026»). Se leen esas dos cosas. */
const MES = { ene: 1, jan: 1, feb: 2, fev: 2, mar: 3, abr: 4, apr: 4, may: 5, mai: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, set: 9, oct: 10, out: 10, nov: 11, dic: 12, dez: 12, dec: 12 };
const mesDe = (t) => MES[String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 3)];
const iso = (a, m, d) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/* Las fechas de un aviso. Sin año, el próximo en que caen desde hoy. */
export function fechasEn(texto, hoy) {
  const t = limpiar(texto).replace(/[–—]/g, "-");
  const anioDe = (m, d) => {
    const base = Number((hoy || "2026-01-01").slice(0, 4));
    return iso(base, m, d) >= (hoy || "") ? base : base + 1;
  };
  // «del 20 de noviembre de 2026 al 22 de noviembre de 2026»
  let m = t.match(/(\d{1,2}) de ([a-záéíóúç]+)\.?(?: de (\d{4}))? (?:al|a|até) (?:el )?(\d{1,2}) de ([a-záéíóúç]+)\.?(?: de (\d{4}))?/i);
  if (m && mesDe(m[2]) && mesDe(m[5])) {
    const a1 = m[3] ? Number(m[3]) : anioDe(mesDe(m[2]), Number(m[1]));
    const a2 = m[6] ? Number(m[6]) : (mesDe(m[5]) < mesDe(m[2]) ? a1 + 1 : a1);
    return { desde: iso(a1, mesDe(m[2]), m[1]), hasta: iso(a2, mesDe(m[5]), m[4]) };
  }
  // «20 nov - 2 dic 2026»
  m = t.match(/(\d{1,2}) ([a-záéíóúç]{3,})\.? ?- ?(\d{1,2}) (?:de )?([a-záéíóúç]{3,})\.?(?: (?:de )?(\d{4}))?/i);
  if (m && mesDe(m[2]) && mesDe(m[4])) {
    const a2 = m[5] ? Number(m[5]) : anioDe(mesDe(m[4]), Number(m[3]));
    const a1 = mesDe(m[2]) > mesDe(m[4]) ? a2 - 1 : a2;
    return { desde: iso(a1, mesDe(m[2]), m[1]), hasta: iso(a2, mesDe(m[4]), m[3]) };
  }
  // «20–22 nov 2026», «20-22 de nov.»
  m = t.match(/(\d{1,2}) ?- ?(\d{1,2}) (?:de )?([a-záéíóúç]{3,})\.?(?: (?:de )?(\d{4}))?/i);
  if (m && mesDe(m[3])) {
    const a = m[4] ? Number(m[4]) : anioDe(mesDe(m[3]), Number(m[1]));
    return { desde: iso(a, mesDe(m[3]), m[1]), hasta: iso(a, mesDe(m[3]), m[2]) };
  }
  return null;
}

/* Qué cabaña es un anuncio de Airbnb: una palabra de su nombre (en
   cualquiera de los tres idiomas) que aparezca en el título del anuncio. */
export function cabanaDeAnuncio(texto, cabanas) {
  const t = limpiar(texto).toLowerCase();
  const hits = (cabanas || []).filter((c) => {
    const n = c.nombre && typeof c.nombre === "object" ? Object.values(c.nombre).join(" ") : String(c.nombre || "");
    return n.toLowerCase().split(/[^a-záéíóúñçã]+/).filter((w) => w.length >= 4 && !["para", "with", "com", "cabaña", "cabana", "cabin"].includes(w))
      .some((w) => t.includes(w));
  });
  return hits.length === 1 ? hits[0].id : null;
}

/* ¿El aviso dice que hay una reserva confirmada? (y no una consulta o una
   solicitud, que todavía no son reserva). */
export const esConfirmacion = (texto) => /\b(ha reservado|reserva confirmada|confirmó|reservou|reserva confirmada|booked|is confirmed)\b/i.test(limpiar(texto));

/* A qué reserva se refiere un chat. Puntaje, no adivinanza: teléfono (+3),
   código de Airbnb (+3), una palabra del nombre en el título del chat (+2).
   Sólo se vincula si hay UNA mejor con 2 o más; si empatan, se dice. */
export function vincular(chat, reservas, clientes, hoy, cabanas = []) {
  const texto = limpiar([chat.chat, ...(chat.textos || [])].join(" "));
  const cod = codigoAirbnb(texto);
  const telChat = telefonoEn(chat.chat) || telefonoEn(texto);
  const cli = Object.fromEntries((clientes || []).map((c) => [c.id, c]));
  const vivas = (reservas || []).filter((r) => r.estado !== "anulada" && (!hoy || String(r.checkOut) >= sumar(hoy, -3)));
  const fechas = fechasEn(texto, hoy);
  const cabana = cabanaDeAnuncio(texto, cabanas);
  const puntos = vivas.map((r) => {
    const c = cli[r.clienteId] || {};
    let p = 0; const por = [];
    const telR = c.telefono || telefonoEn(r.notas);
    if (telChat && telR && mismoTelefono(telChat, telR)) { p += 3; por.push("teléfono"); }
    if (cod && limpiar(r.clienteNombre).includes(cod)) { p += 3; por.push("código Airbnb"); }
    const palabras = [c.nombre, nombreDeAirbnb(r.clienteNombre)].join(" ").toLowerCase()
      .split(/[^a-záéíóúñü]+/).filter((w) => w.length >= 4 && !["airbnb", "uruguay", "argentina", "brasil"].includes(w));
    const titulo = limpiar(chat.chat).toLowerCase();
    if (palabras.some((w) => titulo.includes(w))) { p += 2; por.push("nombre"); }
    if (fechas && r.checkIn === fechas.desde && r.checkOut === fechas.hasta && (!cabana || r.cabanaId === cabana)) {
      p += cabana ? 4 : 2; por.push(cabana ? "fechas y alojamiento" : "fechas");
    }
    return { r, p, por };
  }).filter((x) => x.p > 0).sort((a, b) => b.p - a.p);
  if (!puntos.length || puntos[0].p < 2) {
    // Un aviso de reserva CONFIRMADA con fechas que Casa Verde no tiene: es
    // una reserva nueva que todavía no entró (se trae con «Sincronizar» de
    // Airbnb en Casa Verde). Se dice como tal, no como «no se parece a nada».
    if (fechas && esConfirmacion(texto) && !vivas.some((r) => r.checkIn === fechas.desde && (!cabana || r.cabanaId === cabana)))
      return { reserva: null, nueva: { ...fechas, cabanaId: cabana }, motivo: "reserva confirmada que Casa Verde todavía no tiene" };
    return { reserva: null, motivo: "no se parece a ninguna reserva que viene" };
  }
  // Varias reservas del mismo cliente (un grupo en tres cabañas) no son un
  // empate: son la misma estadía.
  const empate = puntos.filter((x) => x.p === puntos[0].p);
  const clientesEmpate = new Set(empate.map((x) => x.r.clienteId || x.r.id));
  if (clientesEmpate.size > 1) return { reserva: null, motivo: "se parece a varias: " + empate.map((x) => x.r.id).join(", "), candidatas: empate.map((x) => x.r) };
  return { reserva: puntos[0].r, todas: empate.map((x) => x.r), por: puntos[0].por };
}
const sumar = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export const PERMITIDOS = ["cliente", "adultos", "ninos", "llegada", "nota"];
export const DE_MAURO = { checkIn: "las fechas", checkOut: "las fechas", cabanaId: "la cabaña", estado: "el estado",
  precio: "la plata", total: "la plata", monto: "la plata", grupoId: "el acuerdo", origen: "el origen" };
const CAMPOS_CLIENTE = ["nombre", "telefono", "email", "pais", "idioma"];

/* El plan de un completado. No escribe nada: dice qué se escribiría, qué se
   rechaza y por qué. `cambios` es lo que se sacó del mensaje:
     { cliente: {nombre, telefono, email, pais, idioma}, adultos, ninos,
       llegada: "18:30", nota: "llevan una perrita" } */
export function planCompletar(r, cliente, cambios, { fuente = "mensaje", ahora = new Date().toISOString() } = {}) {
  const rechazados = [], lineas = [], reserva = {};
  let clienteNuevo = null, clienteCambios = null;
  for (const k of Object.keys(cambios || {})) {
    if (DE_MAURO[k]) rechazados.push(`${k}: ${DE_MAURO[k]} las decide Mauro, no un mensaje`);
    else if (!PERMITIDOS.includes(k)) rechazados.push(`${k}: no es un campo que el agente complete`);
  }
  const c = (cambios && cambios.cliente) || null;
  if (c) {
    const limpio = {};
    for (const k of CAMPOS_CLIENTE) if (String(c[k] ?? "").trim()) limpio[k] = limpiar(c[k]).slice(0, k === "nombre" ? 80 : 120);
    if (limpio.telefono && !limpio.pais) { const p = paisDeTelefono(limpio.telefono); if (p) limpio.pais = p; }
    if (!cliente) {
      if (!limpio.nombre) rechazados.push("cliente: para crear un cliente hace falta al menos el nombre");
      else {
        clienteNuevo = { nombre: limpio.nombre, telefono: limpio.telefono || null, email: limpio.email || null,
          pais: limpio.pais || null, idioma: limpio.idioma || null,
          llegoPor: r.origen === "airbnb" ? "airbnb" : null, llegoPorDetalle: null,
          notas: `Creado por Claude a partir de ${fuente}.` };
        lineas.push(`cliente creado: ${limpio.nombre}${limpio.telefono ? " · " + limpio.telefono : ""}`);
      }
    } else {
      // Sólo lo vacío o lo dudoso: lo que una persona escribió no se pisa.
      const cam = {};
      for (const [k, v] of Object.entries(limpio)) {
        const antes = cliente[k];
        if (!String(antes ?? "").trim() || (k === "nombre" && esDudoso(antes))) { if (antes !== v) cam[k] = v; }
        else if (String(antes) !== v && !(k === "telefono" && mismoTelefono(antes, v))) rechazados.push(`cliente.${k}: ya dice «${antes}»; no se pisa lo que escribió una persona`);
      }
      if (Object.keys(cam).length) { clienteCambios = cam; lineas.push("cliente completado: " + Object.entries(cam).map(([k, v]) => `${k} ${v}`).join(", ")); }
    }
  }
  for (const k of ["adultos", "ninos"]) {
    if (cambios && k in cambios) {
      const n = Number(cambios[k]);
      if (!Number.isInteger(n) || n < 0 || n > 30) rechazados.push(`${k}: «${cambios[k]}» no es una cantidad`);
      else if (k === "adultos" && n < 1) rechazados.push("adultos: una reserva tiene al menos un adulto");
      else if (Number(r[k] ?? 0) !== n) { reserva[k] = n; lineas.push(`${k === "ninos" ? "niños" : k} ${r[k] ?? 0} → ${n}`); }
    }
  }
  if (cambios && cambios.llegada) {
    const h = String(cambios.llegada).trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(h)) rechazados.push(`llegada: «${h}» no es una hora (HH:MM)`);
    else if ((r.horaEntrada || "14:00") !== h) { reserva.horaEntrada = h; lineas.push(`llegada ${r.horaEntrada || "14:00"} → ${h}`); }
  }
  if (cambios && String(cambios.nota || "").trim()) {
    const n = limpiar(cambios.nota).slice(0, 400);
    const sello = `[Claude · ${fuente} · ${ahora.slice(8, 10)}/${ahora.slice(5, 7)}]`;
    if (!String(r.notas || "").includes(n)) { reserva.notas = (String(r.notas || "").trim() + `\n${sello} ${n}`).trim(); lineas.push("nota: " + n); }
  }
  return { reserva, clienteNuevo, clienteCambios, lineas, rechazados, vacio: !lineas.length };
}

/* ── Lo que toca la red ────────────────────────────────────────────────────── */
const AQUI = path.dirname(fileURLToPath(import.meta.url));

async function base() {
  const F = await import(path.join(AQUI, "firestore.mjs"));
  const cfg = F.PROYECTOS.casaverde;
  const sesion = await F.entrar(cfg);
  return { F, cfg, sesion };
}
const hoyISO = () => new Date().toISOString().slice(0, 10);

async function estado() {
  const { F, cfg, sesion } = await base();
  const [rs, cs, gs] = await Promise.all(["reservas", "clientes", "grupos"].map((c) => F.listar(cfg, sesion, c)));
  const cli = Object.fromEntries(cs.map((c) => [c.id, c])), gr = Object.fromEntries(gs.map((g) => [g.id, g]));
  const hoy = hoyISO();
  const vienen = rs.filter((r) => r.estado !== "anulada" && r.checkOut >= hoy).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  console.log(`\n  ${vienen.length} reservas que vienen\n`);
  for (const r of vienen) {
    const f = faltantes(r, cli[r.clienteId], { grupo: gr[r.grupoId], hoy });
    console.log(`  ${r.checkIn} → ${r.checkOut}  ${r.cabanaId}  ${limpiar(r.clienteNombre)}  [${r.origen}]  ${r.id}`);
    for (const x of f) console.log(`      · ${x.texto}`);
  }
}

function mensajesDeBodega(dir, dias) {
  const d = path.join(dir, "mensajes");
  if (!fs.existsSync(d)) return [];
  const desde = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
  return fs.readdirSync(d).filter((f) => f.endsWith(".json") && f.slice(0, 10) >= desde)
    .flatMap((f) => { try { return JSON.parse(fs.readFileSync(path.join(d, f), "utf8")); } catch { return []; } });
}

async function vincularCli(dir, dias) {
  const msgs = mensajesDeBodega(dir, dias);
  const porChat = {};
  for (const m of msgs) {
    const k = `${m.app}|${m.chat}`;
    (porChat[k] = porChat[k] || { app: m.app, chat: m.chat, textos: [] }).textos.push(...[m.texto, ...(m.lineas || [])].filter(Boolean));
  }
  const chats = Object.values(porChat);
  if (!chats.length) { console.log("\n  No hay mensajes capturados en esos días. ¿Está corriendo «telefono.mjs whatsapp --vigilar» en el teléfono?\n"); return; }
  const { F, cfg, sesion } = await base();
  const [rs, cs, cabs] = await Promise.all(["reservas", "clientes", "cabanas"].map((c) => F.listar(cfg, sesion, c)));
  for (const c of chats) {
    const v = vincular(c, rs, cs, hoyISO(), cabs);
    console.log(`\n  [${c.app}] ${c.chat}`);
    console.log(v.reserva ? `      → reserva ${v.reserva.id} (${limpiar(v.reserva.clienteNombre)}, ${v.reserva.checkIn}) por ${v.por.join(" y ")}${v.todas.length > 1 ? ` · y ${v.todas.length - 1} más del mismo grupo` : ""}`
                          : v.nueva ? `      ⚠ ${v.motivo}: ${v.nueva.desde} → ${v.nueva.hasta}${v.nueva.cabanaId ? " en " + v.nueva.cabanaId : ""}. En Casa Verde: Reservas → «Airbnb» → «Sincronizar ahora».`
                          : `      → ninguna: ${v.motivo}`);
    for (const t of [...new Set(c.textos)].slice(-6)) console.log(`        «${limpiar(t).slice(0, 160)}»`);
  }
  console.log("");
}

async function completarCli(id, archivo, seco) {
  const pedido = JSON.parse(fs.readFileSync(archivo, "utf8"));
  const { fuente = "mensaje", ...cambios } = pedido;
  const { F, cfg, sesion } = await base();
  const r = await F.leerUno(cfg, sesion, "reservas", id);
  if (!r) throw new Error(`no hay una reserva «${id}»`);
  const cliente = r.clienteId ? await F.leerUno(cfg, sesion, "clientes", r.clienteId) : null;
  const ahora = new Date().toISOString();
  const plan = planCompletar(r, cliente, cambios, { fuente, ahora });
  console.log(`\n  ${limpiar(r.clienteNombre)} · ${r.checkIn} · ${r.cabanaId}`);
  for (const l of plan.lineas) console.log("    ✓ " + l);
  for (const l of plan.rechazados) console.log("    ✗ " + l);
  if (plan.vacio) { console.log("    (nada que completar)\n"); return; }
  if (seco) { console.log("\n  --seco: no se escribió nada.\n"); return; }

  const marca = { $timestamp: ahora };
  const quien = { autorNombre: "Claude (agente)", autorUid: sesion.uid || "agente" };
  let clienteId = r.clienteId;
  if (plan.clienteNuevo) {
    clienteId = "cl" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    await F.escribir(cfg, sesion, "clientes", clienteId, { ...plan.clienteNuevo, creadoEn: marca, actualizadoEn: marca,
      creadoPor: quien.autorUid, creadoNombre: quien.autorNombre });
    // El acuerdo (grupo) también lleva el cliente: la pantalla de reservas lo
    // toma de ahí para las estadías de varias cabañas.
    if (r.grupoId) {
      const g = await F.leerUno(cfg, sesion, "grupos", r.grupoId);
      if (g && !g.clienteId) await F.fusionar(cfg, sesion, "grupos", r.grupoId, { clienteId, actualizadoEn: marca });
    }
  } else if (plan.clienteCambios) {
    await F.fusionar(cfg, sesion, "clientes", clienteId, { ...plan.clienteCambios, actualizadoEn: marca });
  }
  // El renglón del historial de la reserva se AGREGA crudo: las fechas de los
  // anteriores siguen siendo fechas.
  const crudo = await F.leerCrudo(cfg, sesion, "reservas", id);
  const anteriores = (crudo.historial && crudo.historial.arrayValue && crudo.historial.arrayValue.values) || [];
  const renglon = F.aFirestore({ ...quien, fecha: marca, cambio: `desde ${fuente}: ${plan.lineas.join(" · ")}`.slice(0, 500) });
  await F.fusionar(cfg, sesion, "reservas", id, { ...plan.reserva, ...(plan.clienteNuevo ? { clienteId } : {}),
    historial: { $crudo: { arrayValue: { values: [...anteriores, renglon] } } }, actualizadoEn: marca });
  console.log(`\n  Escrito. Se deshace con: node herramientas/firestore.mjs casaverde historial 5  →  deshacer <id>\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...args] = process.argv.slice(2);
  const opt = (n, def) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def; };
  const run = cmd === "estado" ? estado()
    : cmd === "vincular" ? vincularCli(opt("--bodega", path.join(AQUI, "..", "..", "bodega")), Number(opt("--dias", 2)))
    : cmd === "completar" && args[0] && args[1] ? completarCli(args[0], args[1], args.includes("--seco"))
    : Promise.reject(new Error("uso: estado | vincular --bodega <dir> [--dias N] | completar <reservaId> <archivo.json> [--seco]"));
  run.catch((e) => { console.error("\n✖ " + e.message + "\n"); process.exit(1); });
}
