#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// herramientas/agenda.mjs — Claude organiza la agenda de quien se lo pidió.
//
// 8-oct-2026, Mauro: «quiero que la IA pueda organizar mi agenda editando los
// contenidos. La idea es que pueda ayudarme activamente en la organización».
//
// Sólo anda sobre la agenda de quien encendió, en Tiempos, «🤝 Claude organiza
// mi agenda» (`agendas/{uid}.agente == true`). Lo garantizan las reglas v11 de
// Tiempos; esta herramienta lo dice antes, con un mensaje claro.
//
// Lo que hace, con las MISMAS formas que la app (agenda.js de Tiempos):
//   · una actividad vive en `agendas/{uid}.actividades.<id>`, con su título;
//   · al balance va sólo su marca (`marcas/<mismo id>`: de quién, clase,
//     desde, hasta), que no se edita: se borra y se vuelve a crear;
//   · las alertas (`alertas/`) son del dueño: recordatorios y alarmas.
// Cada cambio deja antes su copia (firestore.mjs `anotar`): lo privado, en
// `agendas/{uid}/copias`, que sólo ve su dueño. `firestore.mjs tiempos
// copias <uid>` las lista y `deshacer <ruta>` vuelve atrás.
//
// Lo que toca de la actividad queda dicho en ella (`claude: {en, porque}`), y
// la agenda lo muestra con ✨. Si la persona la vuelve a mover, el ✨ se va.
//
//   node herramientas/agenda.mjs ver <persona> [días] [--direcciones]
//   node herramientas/agenda.mjs mover <persona> <id> <día> <desde> [hasta] --porque "…"
//   node herramientas/agenda.mjs agregar <persona> <día> <desde> [hasta] --tipo trabajo|tarea|personal|ninos --titulo "…" [--lugar "…"] --porque "…"
//   node herramientas/agenda.mjs sacar <persona> <id> --porque "…"
//   node herramientas/agenda.mjs alerta <persona> <día> <hora> --texto "…" [--tipo alarma|recordatorio] [--sobre <id>]
//   node herramientas/agenda.mjs correr-alerta <persona> <idAlerta> <día> <hora>
//   node herramientas/agenda.mjs sacar-alerta <persona> <idAlerta>
//
// <persona> es el nombre de `miembros/` (Mauro, Florencia), sin importar
// mayúsculas.
// ─────────────────────────────────────────────────────────────────────────────

import { PROYECTOS, entrar, listar, leerUno, escribir, fusionar, borrar, fusionarRutas } from "./firestore.mjs";

const ex = (m) => { console.error("\n✖ " + m + "\n"); process.exit(1); };

/* Las clases de una actividad. Son las de `CLASES_ACTIVIDAD` de nucleo.js de
   Tiempos: si cambian allá, cambian acá en la misma tanda. */
export const CLASES_ACTIVIDAD = { trabajo: "productivo", tarea: "productivo", personal: "libre", ninos: "chicos" };
export const HORA_NOCHE = "20:00";
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

export const sumarDias = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/* El mismo horario que arma agenda.js: sin «hasta» sólo lo que empieza de
   noche (y corre hasta las 7), y si termina «antes» de empezar, cruzó la
   medianoche. Devuelve el porqué si no se puede. */
export function horario(dia, hi, hf = "") {
  if (!DIA_RE.test(String(dia))) return { mal: "el día va como AAAA-MM-DD" };
  if (!HORA_RE.test(String(hi))) return { mal: "la hora de inicio va como HH:MM" };
  if (hf && !HORA_RE.test(String(hf))) return { mal: "la hora de fin va como HH:MM" };
  if (!hf && hi < HORA_NOCHE) return { mal: `sin hora de fin va sólo lo que empieza desde las ${HORA_NOCHE}` };
  const desde = `${dia}T${hi}`;
  const hasta = !hf ? `${sumarDias(dia, 1)}T07:00` : `${hf <= hi ? sumarDias(dia, 1) : dia}T${hf}`;
  return { desde, hasta, hf: hf || "" };
}

/* La marca del balance de una actividad: la firma el agente (la regla v11 lo
   exige: `marcadoPor` es quien la escribe). Sin título, nunca. */
export function marcaDe(uid, tipo, h, agente, ahora = new Date()) {
  const clase = CLASES_ACTIVIDAD[tipo];
  if (!clase) return null;
  return { uid, clase, desde: h.desde, hasta: h.hasta, origen: "agenda", marcadoPor: agente, creadoEn: { $timestamp: ahora.toISOString() } };
}

export const idNuevo = (prefijo, ahoraMs = Date.now()) =>
  prefijo + ahoraMs.toString(36) + Math.random().toString(36).slice(2, 6);

/* Lo que va en la actividad para decir que la tocó Claude y por qué. */
export function sello(porque, ahora = new Date()) {
  const p = String(porque || "").trim();
  if (!p) return null;
  return { en: ahora.toISOString(), porque: p.slice(0, 160) };
}

/* Las opciones `--x valor` de la línea de comandos, y el resto en orden. */
export function opciones(args) {
  const o = {}, resto = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const k = args[i].slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) o[k] = args[++i]; else o[k] = true;
    } else resto.push(args[i]);
  }
  return { o, resto };
}

const ahoraISO = () => ({ $timestamp: new Date().toISOString() });

async function persona(cfg, s, nombre) {
  const ms = await listar(cfg, s, "miembros");
  const m = ms.find((x) => String(x.nombre || "").toLowerCase() === String(nombre || "").toLowerCase());
  if (!m) ex(`no hay nadie llamado «${nombre}» en miembros/. Están: ${ms.map((x) => x.nombre).join(", ")}`);
  return m;
}

/* La agenda, sólo si su dueño lo permitió. Sin permiso la regla contesta que
   no; acá se dice por qué, y qué tiene que hacer la persona. */
async function agendaDe(cfg, s, m) {
  // Suave: sin el permiso la regla contesta 403, y eso es la respuesta, no
  // una falla de la herramienta.
  const ag = await leerUno(cfg, s, "agendas", m.id, true).catch((e) => { if (e.suave) return null; throw e; });
  if (!ag || ag.agente !== true)
    ex(`${m.nombre} no encendió «🤝 Claude organiza mi agenda» (Tiempos → Agenda, abajo).\n`
     + `  Sin eso su agenda es sólo suya: no se lee ni se toca. Si lo pide, que lo encienda.\n`
     + `  (Y las reglas v11 de tiempos tienen que estar publicadas.)`);
  return ag;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , cmd, ...args] = process.argv;
  const { o, resto } = opciones(args);
  const cfg = PROYECTOS.tiempos;
  if (!cmd) ex("falta el comando: ver, mover, agregar, sacar, alerta, correr-alerta, sacar-alerta");
  const s = await entrar(cfg);
  const m = await persona(cfg, s, resto[0]);

  if (cmd === "ver") {
    const ag = await agendaDe(cfg, s, m);
    const hoy = new Date().toISOString().slice(0, 10);
    const hasta = sumarDias(hoy, Number(resto[1]) || 14);
    const acts = Object.entries(ag.actividades || {}).filter(([, a]) => a && a.dia >= hoy && a.dia <= hasta)
      .sort((x, y) => String(x[1].desde).localeCompare(String(y[1].desde)));
    console.log(`\n  Agenda de ${m.nombre}, ${hoy} → ${hasta}`);
    for (const [id, a] of acts)
      console.log(`  ${a.dia} ${String(a.desde).slice(11)}${a.hf ? "–" + a.hf : ""}  ${a.titulo}  [${a.tipo}]${a.lugar ? " @ " + a.lugar : ""}  (${id})${a.claude ? "  ✨" : ""}`);
    if (!acts.length) console.log("  (nada)");
    const flotan = Object.keys(ag.items || {}).length;
    if (flotan) console.log(`  + ${flotan} tarea(s) de la lista puestas en la agenda (items)`);
    const al = (await listar(cfg, s, "alertas")).filter((x) => x.uid === m.id && x.dia >= hoy && x.dia <= hasta)
      .sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora));
    console.log(`\n  Alertas`);
    for (const x of al) console.log(`  ${x.dia} ${x.hora}  ${x.tipo === "alarma" ? "⏰" : "🔔"} ${x.texto}${x.sobre ? "  ↳ " + x.sobre : ""}  (${x.id})`);
    if (!al.length) console.log("  (ninguna)");
    const lug = Object.values(ag.lugares || {});
    console.log(`\n  Lugares: ${lug.length} (${lug.filter((l) => !l.direccion).length} sin dirección)`);
    // Las direcciones son datos de la persona: se muestran sólo si hacen
    // falta (calcular el viaje de una alarma), y no se copian a otro lado.
    if (o.direcciones) {
      for (const [k, d] of Object.entries(ag.casas || {})) console.log(`  casa ${k}: ${d}`);
      for (const l of lug) console.log(`  ${l.nombre}: ${l.direccion || "—"}`);
    }
    console.log("");

  } else if (cmd === "mover" || cmd === "agregar") {
    const ag = await agendaDe(cfg, s, m);
    const porque = sello(o.porque);
    if (!porque) ex("falta --porque: lo que mueve Claude dice por qué, y la persona lo ve con ✨");
    const [, a1, a2, a3, a4] = resto;
    let id, act, h;
    if (cmd === "mover") {
      id = a1; act = (ag.actividades || {})[id];
      if (!act) ex(`no hay una actividad «${id}» en la agenda de ${m.nombre}. Mirá los ids con «ver».`);
      h = horario(a2, a3, a4 || "");
    } else {
      const tipo = o.tipo, titulo = String(o.titulo || "").trim();
      if (!CLASES_ACTIVIDAD[tipo]) ex("falta --tipo: trabajo, tarea, personal o ninos (la clase es obligatoria)");
      if (!titulo) ex("falta --titulo");
      id = idNuevo("a");
      act = { titulo: titulo.slice(0, 120), tipo, lugar: String(o.lugar || "").slice(0, 80), origen: "claude" };
      h = horario(a1, a2, a3 || "");
    }
    if (h.mal) ex(h.mal);
    const marca = marcaDe(m.id, act.tipo, h, s.uid);
    if (!marca) ex(`la actividad no tiene una clase válida («${act.tipo}»)`);
    if (cmd === "mover" && await leerUno(cfg, s, "marcas", id)) await borrar(cfg, s, "marcas", id);
    await escribir(cfg, s, "marcas", id, marca);
    await fusionarRutas(cfg, s, "agendas", m.id, [
      [["actividades", id], { ...act, dia: h.desde.slice(0, 10), desde: h.desde, hasta: h.hasta, hf: h.hf, claude: porque }],
      [["actualizadoEn"], ahoraISO()]]);
    console.log(`  ${cmd === "mover" ? "movida" : "agregada"}: ${act.titulo} → ${h.desde}${h.hf ? "–" + h.hf : ""} (${id})`);
    console.log(`  Ojo con sus alertas: «ver» las lista; «correr-alerta» las corre.`);

  } else if (cmd === "sacar") {
    const ag = await agendaDe(cfg, s, m);
    if (!sello(o.porque)) ex("falta --porque");
    const id = resto[1], act = (ag.actividades || {})[id];
    if (!act) ex(`no hay una actividad «${id}» en la agenda de ${m.nombre}.`);
    if (await leerUno(cfg, s, "marcas", id)) await borrar(cfg, s, "marcas", id);
    await fusionarRutas(cfg, s, "agendas", m.id, [[["actividades", id], undefined], [["actualizadoEn"], ahoraISO()]]);
    console.log(`  sacada: ${act.titulo} (${id}). Se deshace con «firestore.mjs tiempos copias ${m.nombre}…».`);

  } else if (cmd === "alerta") {
    await agendaDe(cfg, s, m);
    const [, dia, hora] = resto;
    const tipo = o.tipo || "alarma", texto = String(o.texto || "").trim();
    if (!["alarma", "recordatorio"].includes(tipo)) ex("--tipo es alarma o recordatorio");
    if (!DIA_RE.test(String(dia)) || !HORA_RE.test(String(hora))) ex("falta el día (AAAA-MM-DD) y la hora (HH:MM)");
    if (!texto || texto.length > 200) ex("--texto, de 1 a 200 letras");
    const id = idNuevo("c");
    await escribir(cfg, s, "alertas", id, { uid: m.id, tipo, texto, dia, hora, sobre: String(o.sobre || ""),
      avisada: false, origen: "claude", creadoEn: ahoraISO() });
    console.log(`  ${tipo}: ${dia} ${hora} ${texto} (${id})`);

  } else if (cmd === "correr-alerta" || cmd === "sacar-alerta") {
    await agendaDe(cfg, s, m);
    const [, id, dia, hora] = resto;
    const al = id && await leerUno(cfg, s, "alertas", id);
    if (!al || al.uid !== m.id) ex(`no hay una alerta «${id}» de ${m.nombre}.`);
    if (cmd === "sacar-alerta") { await borrar(cfg, s, "alertas", id); console.log(`  sacada: ${al.texto}`); }
    else {
      if (!DIA_RE.test(String(dia)) || !HORA_RE.test(String(hora))) ex("falta el día (AAAA-MM-DD) y la hora (HH:MM)");
      // Sólo el día y la hora, y `avisada` vuelve a false para que suene de
      // nuevo: lo mismo que el ✎ de la app.
      await fusionar(cfg, s, "alertas", id, { dia, hora, avisada: false });
      console.log(`  corrida: ${al.texto} → ${dia} ${hora}`);
    }

  } else ex(`comando desconocido: «${cmd}»`);
}
