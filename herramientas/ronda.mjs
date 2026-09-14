// ─────────────────────────────────────────────────────────────────────────────
// ronda.mjs — Junta en una sola pantalla lo que hay que mirar al abrir una
// tanda: lo que Mauro tocó en el panel, lo que está esperando respuesta, y las
// fallas que la gente reportó desde cada sitio.
//
//   node herramientas/ronda.mjs abrir [--json]
//   node herramientas/ronda.mjs claves <proyecto>
//
// ── POR QUÉ EXISTE ───────────────────────────────────────────────────────────
// `REPORTES.md` de remate lo dejó escrito en «Lo que falta»: que una sesión lea
// `reportes/` de las bases y abra el pendiente, y que eso entre en la rutina de
// apertura del § 8 del PROTOCOLO-GENERAL. Hasta hoy había que pedírselo.
//
// La otra mitad del motivo es de plata: desde el 2026-09-14 esto lo corre una
// **routine** de Claude Code, que gasta de la suscripción y tiene un tope de
// corridas por día (`RUTINA-AUTOMATICA.md`). Cada dato que se puede juntar con
// código determinado es un dato que el modelo no tiene que leer, y el modelo
// queda para lo único que no se puede automatizar: entender qué dijo la persona
// que reportó la falla, y escribirlo como pendiente.
//
// Por eso esta herramienta **no escribe nada**. Junta, cruza y ordena; el que
// decide sigue siendo quien lee.
//
// ── EL ORDEN NO ES DECORACIÓN ────────────────────────────────────────────────
// Sale del § 8 «Al abrir» y del § 6 «El apretón de manos», en ese orden:
//   1. TOCADOS            — lo que Mauro editó desde el último parte. § 6: es lo
//                           primero que mira un agente, y compararlo a ojo es
//                           el trabajo que se olvida hacer.
//   2. SIN RESPONDER      — preguntas que lo están esperando a él. § 6: una
//                           pregunta sin responder cuenta como pendiente
//                           abierto, aunque el pendiente esté marcado hecho.
//   3. REPORTES NUEVOS    — fallas reportadas desde un sitio que todavía no
//                           tienen pendiente en el panel.
//   4. ABIERTOS           — el resto, por proyecto (§ 9: Mauro trabaja en un
//                           proyecto por vez) y por prioridad.
//   5. FUENTES            — qué base contestó y qué no. Va último porque es
//                           diagnóstico, pero **no es opcional**: el § 6 del
//                           CLAUDE.md de los cuatro proyectos dice que un
//                           `permission-denied` es un bloqueo y se avisa.
// ─────────────────────────────────────────────────────────────────────────────

import { PROYECTOS, entrar, deFirestore } from "./firestore.mjs";

/* Las bases de sitio que tienen (o van a tener) formulario de reporte. Remate
   lo estrenó en su tanda 27; los otros dos lo esperan —«Lo que falta» de
   REPORTES.md— y por eso aparecen igual: si un día la colección existe, esto
   la trae sola, sin tocar este archivo. Harmonía no está y no va a estar: no
   tiene base ni administradores, todo su estado vive en el localStorage. */
const CON_REPORTES = ["remate", "casayourte", "casaverde"];

/* Cómo se escribe de dónde salió un pendiente. Lo fijó REPORTES.md y es lo
   único que evita traer dos veces el mismo reporte: el agente no escribe en la
   base del sitio, así que no puede marcarlo allá. Se mira de este lado. */
const origenDe = (proyecto, id) => `${proyecto}:reportes/${id}`;

/* ── Las funciones puras ─────────────────────────────────────────────────────
   Separadas a propósito de todo lo que toca la red, para que el banco de
   pruebas (`pruebas/herramientas/ronda.mjs`) las corra sin credenciales y sin
   internet. Es la misma decisión del resto del ecosistema: node a secas. */

/* Un reporte es «nuevo» mientras ningún pendiente del panel declare haberlo
   traído. No se mira el estado del pendiente: uno cerrado también lo trajo. */
function cruzar(proyecto, reportes, pendientes) {
  const traidos = new Set(
    (pendientes || []).map((p) => p && p.origen).filter(Boolean)
  );
  const nuevos = [];
  const yaTraidos = [];
  for (const r of reportes || []) {
    (traidos.has(origenDe(proyecto, r.id)) ? yaTraidos : nuevos).push(r);
  }
  return { nuevos, yaTraidos };
}

/* Las claves de un proyecto son una letra y un número (`L5`, `A7`, `T3`). La
   letra es temática y no se deduce —en remate conviven `A`, `D` y `L`—, así
   que esto NO inventa una: devuelve las que ya existen con su número más alto,
   y quien escribe el pendiente elige. Adivinar la letra sería inventar un
   tema, que es peor que preguntar. */
function letrasEnUso(pendientes, proyecto) {
  const mapa = new Map();
  for (const p of pendientes || []) {
    if (p.proyecto !== proyecto) continue;
    const m = /^([A-Za-z]+)(\d+)$/.exec(String(p.clave || ""));
    if (!m) continue;                       // claves con nombre («reportes-2»)
    const letra = m[1].toUpperCase();
    const n = Number(m[2]);
    mapa.set(letra, Math.max(mapa.get(letra) || 0, n));
  }
  return [...mapa.entries()]
    .map(([letra, alto]) => ({ letra, alto, proxima: letra + (alto + 1) }))
    .sort((a, b) => a.letra.localeCompare(b.letra));
}

/* El orden de los abiertos. Primero la prioridad declarada; a igual prioridad,
   lo que espera a otro pendiente va DESPUÉS, porque no se puede empezar
   (§ 9, «Las trabas»). Un pendiente sin prioridad cae al fondo del grupo, no
   al tope: no declarar prioridad no es declararla alta. */
const PESO = { alta: 0, media: 1, baja: 2 };
const pesoDe = (p) => (p && p.prioridad in PESO ? PESO[p.prioridad] : 3);

function ordenarAbiertos(pendientes) {
  return (pendientes || [])
    .filter((p) => p.estado !== "hecho" && p.estado !== "retirado")
    .slice()
    .sort((a, b) =>
      pesoDe(a) - pesoDe(b) ||
      ((a.esperaA || []).length ? 1 : 0) - ((b.esperaA || []).length ? 1 : 0) ||
      String(a.id).localeCompare(String(b.id))
    );
}

const tocados = (p) => (p || []).filter((x) => x.tocado);
const sinResponder = (p) => (p || []).filter((x) => x.pregunta && !x.respuesta);

/* Agrupa por proyecto y devuelve los grupos ordenados por el `orden` que el
   panel guarda en `proyectos/`, para que la lista salga como sale en su
   pantalla. Un proyecto sin ficha va al final, alfabético. */
function porProyecto(pendientes, fichas) {
  const orden = new Map((fichas || []).map((f) => [f.id, f.orden ?? 99]));
  const g = new Map();
  for (const p of pendientes || []) {
    if (!g.has(p.proyecto)) g.set(p.proyecto, []);
    g.get(p.proyecto).push(p);
  }
  return [...g.entries()]
    .map(([proyecto, items]) => ({ proyecto, items }))
    .sort((a, b) =>
      (orden.get(a.proyecto) ?? 99) - (orden.get(b.proyecto) ?? 99) ||
      a.proyecto.localeCompare(b.proyecto)
    );
}

export { CON_REPORTES, origenDe, cruzar, letrasEnUso, ordenarAbiertos,
         tocados, sinResponder, porProyecto, pesoDe };

/* ── Lo que sí toca la red ───────────────────────────────────────────────────
   `firestore.mjs` corta el proceso ante un 403, que es lo correcto cuando una
   persona pidió una colección y la base dijo que no. Acá no sirve: una ronda
   que se muere porque UNA base todavía no publicó sus reglas deja de contar lo
   que sí pudo leer, y en una corrida automática nadie lo ve. Se lee tolerante
   y el motivo sale en FUENTES. */
const RAIZ = (p) => `https://firestore.googleapis.com/v1/projects/${p}/databases/(default)/documents`;
const objeto = (f) => Object.fromEntries(
  Object.entries(f || {}).map(([k, v]) => [k, deFirestore(v)]));

async function listarSuave(cfg, sesion, coleccion) {
  const salida = [];
  let token = "";
  try {
    do {
      const q = "?pageSize=300" + (token ? "&pageToken=" + encodeURIComponent(token) : "");
      const r = await fetch(RAIZ(cfg.projectId) + "/" + coleccion + q,
        { headers: { Authorization: "Bearer " + sesion.token } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const m = (j.error && j.error.message) || String(r.status);
        return { ok: false, motivo: r.status === 403 ? "las reglas dijeron que no: " + m : m, docs: [] };
      }
      for (const d of j.documents || []) salida.push({ id: d.name.split("/").pop(), ...objeto(d.fields) });
      token = j.nextPageToken || "";
    } while (token);
  } catch (e) {
    return { ok: false, motivo: "no se pudo llegar a la base: " + (e && e.message ? e.message : e), docs: [] };
  }
  return { ok: true, motivo: "", docs: salida };
}

async function juntar() {
  const fuentes = [];

  const cfgPanel = PROYECTOS.panel;
  const sesionPanel = await entrar(cfgPanel);
  const pend = await listarSuave(cfgPanel, sesionPanel, "pendientes");
  const proy = await listarSuave(cfgPanel, sesionPanel, "proyectos");
  fuentes.push({ base: "panel", coleccion: "pendientes", ...pend, docs: undefined, cuantos: pend.docs.length });

  /* Si el panel no contesta, no hay ronda: todo lo demás se cruza contra él.
     Se dice y se corta, que es lo que pide el § 6 del CLAUDE.md de los cuatro
     proyectos — trabajar a ciegas sobre la mitad de lo que dijo Mauro es peor
     que no trabajar. */
  if (!pend.ok) return { fatal: "el panel no contestó — " + pend.motivo, fuentes };

  const pendientes = pend.docs;
  const reportes = [];
  for (const nombre of CON_REPORTES) {
    const cfg = PROYECTOS[nombre];
    if (!cfg) continue;
    let sesion;
    try {
      sesion = await entrar(cfg);
    } catch (e) {
      fuentes.push({ base: nombre, coleccion: "reportes", ok: false,
                     motivo: "no se pudo entrar: " + (e && e.message ? e.message : e), cuantos: 0 });
      continue;
    }
    const r = await listarSuave(cfg, sesion, "reportes");
    fuentes.push({ base: nombre, coleccion: "reportes", ok: r.ok, motivo: r.motivo, cuantos: r.docs.length });
    if (!r.ok) continue;
    const { nuevos, yaTraidos } = cruzar(nombre, r.docs, pendientes);
    reportes.push({ proyecto: nombre, nuevos, yaTraidos });
  }

  return {
    fecha: new Date().toISOString().slice(0, 10),
    pendientes,
    proyectos: proy.ok ? proy.docs : [],
    reportes,
    fuentes
  };
}

/* ── La pantalla ─────────────────────────────────────────────────────────────*/
const corto = (t, n = 96) => {
  const s = String(t || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
};

function imprimir(d) {
  const L = [];
  const ti = tocados(d.pendientes);
  const sr = sinResponder(d.pendientes);
  const nuevos = d.reportes.flatMap((r) => r.nuevos.map((x) => ({ ...x, _proy: r.proyecto })));
  const abiertos = ordenarAbiertos(d.pendientes);

  L.push(`\n  RONDA · ${d.fecha}`);
  L.push(`  ${d.pendientes.length} pendientes · ${abiertos.length} abiertos · ` +
         `${ti.length} tocados · ${sr.length} sin responder · ${nuevos.length} reportes nuevos`);

  L.push(`\n  1 · TOCADOS — Mauro los editó desde el último parte`);
  if (!ti.length) L.push(`      (ninguno)`);
  for (const p of ti) {
    L.push(`      ${p.id}  [${p.estado}]  ${corto(p.titulo)}`);
    if (p.respuesta) L.push(`          respondió: ${corto(p.respuesta, 140)}`);
  }

  L.push(`\n  2 · SIN RESPONDER — lo están esperando a él`);
  if (!sr.length) L.push(`      (ninguna)`);
  for (const p of sr) {
    L.push(`      ${p.id}  [${p.estado}]  ${corto(p.titulo)}`);
    L.push(`          pregunta: ${corto(p.pregunta, 140)}`);
  }

  L.push(`\n  3 · REPORTES NUEVOS — fallas de un sitio sin pendiente que las traiga`);
  if (!nuevos.length) L.push(`      (ninguno)`);
  for (const r of nuevos) {
    L.push(`      ${r._proy}:reportes/${r.id}  [${r.gravedad || "sin gravedad"}]  ${r.pagina || "?"}`);
    L.push(`          qué pasó : ${corto(r.texto, 140)}`);
    if (r.esperaba) L.push(`          esperaba : ${corto(r.esperaba, 140)}`);
    L.push(`          origen   : ${origenDe(r._proy, r.id)}`);
  }

  L.push(`\n  4 · ABIERTOS — por proyecto, por prioridad, las trabas al final`);
  for (const g of porProyecto(abiertos, d.proyectos)) {
    L.push(`      ── ${g.proyecto}`);
    for (const p of ordenarAbiertos(g.items)) {
      const traba = (p.esperaA || []).length ? `  ⟵ espera ${p.esperaA.join(", ")}` : "";
      L.push(`      ${p.id}  [${p.prioridad || "sin prioridad"}/${p.quien || "?"}]  ${corto(p.titulo, 70)}${traba}`);
    }
  }

  L.push(`\n  5 · FUENTES`);
  for (const f of d.fuentes) {
    L.push(`      ${f.ok ? "✓" : "✖"} ${f.base}/${f.coleccion}` +
           (f.ok ? `  ${f.cuantos}` : `  ${f.motivo}`));
  }
  const caidas = d.fuentes.filter((f) => !f.ok);
  if (caidas.length) {
    L.push(`\n      ⚠ ${caidas.length} fuente(s) no contestaron. Eso es un bloqueo y se dice:`);
    L.push(`        la ronda salió con menos de lo que hay.`);
  }
  L.push("");
  return L.join("\n");
}

/* ── La línea de comandos ────────────────────────────────────────────────────*/
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , cmd, ...args] = process.argv;

  if (cmd === "abrir") {
    const d = await juntar();
    if (d.fatal) {
      console.error(`\n✖ ${d.fatal}\n`);
      process.exit(1);
    }
    console.log(args.includes("--json") ? JSON.stringify(d, null, 2) : imprimir(d));

  } else if (cmd === "claves") {
    const proyecto = args[0];
    if (!proyecto) { console.error("\n✖ falta el proyecto\n"); process.exit(1); }
    const cfg = PROYECTOS.panel;
    const sesion = await entrar(cfg);
    const r = await listarSuave(cfg, sesion, "pendientes");
    if (!r.ok) { console.error(`\n✖ ${r.motivo}\n`); process.exit(1); }
    const letras = letrasEnUso(r.docs, proyecto);
    if (!letras.length) {
      console.log(`\n  ${proyecto}: no hay claves con forma letra+número todavía.\n`);
    } else {
      console.log(`\n  ${proyecto} — letras en uso y la próxima libre de cada una:`);
      for (const l of letras) console.log(`      ${l.letra}  hasta ${l.letra}${l.alto}  →  ${l.proxima}`);
      console.log(`\n  La letra es temática y no se deduce: elegila mirando de qué trata.\n`);
    }

  } else {
    console.log(`
  node herramientas/ronda.mjs abrir [--json]
      Junta el panel y los reportes de los sitios, los cruza y los ordena
      como pide el § 8 del PROTOCOLO-GENERAL. No escribe nada.

  node herramientas/ronda.mjs claves <proyecto>
      Las letras de clave en uso en ese proyecto y la próxima libre de cada
      una, para escribir un pendiente nuevo sin pisar otro.

  Lo que se hace con esto: RUTINA-AUTOMATICA.md
`);
  }
}
