#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// herramientas/analisis.mjs — El análisis que se le pide a Claude desde Tiempos.
// Sello: analisis-5 (11-oct-2026, tiempos:V11, V12 y V13)
//
// Mauro: «se tiene que interpretar y explicar la información registrada de
// forma coherente para poder analizar la inversión y evaluar los planes de
// trabajo… contemplando que puede haber registrado monedas diferentes y que
// pueden faltar declaraciones de gastos».
//
// En Tiempos, «📊 Análisis de Claude» deja un reporte con el campo `analisis`
// ({que, cuenta, desde, hasta, categorias}) y despierta la rutina «Consulta en
// vivo». Esto hace las dos mitades que no son de la IA:
//
//   node herramientas/analisis.mjs datos <reporteId>
//       Junta los NÚMEROS: el balance de Tiempos con la MISMA cuenta que la app
//       (`balanceDe` y `cuentasDe` de tiempos/nucleo.js, que se carga del sitio
//       publicado o de ../tiempos: no se copia), y si corresponde lo de Casa
//       Verde (su libro, por moneda y categoría, y honorarios sin pagar) y lo
//       cobrado en remate. Por moneda, sin convertir. Imprime un JSON.
//
//       Si lo pedido es el TRIMESTRE (`que: "trimestre"`, analisis-2), suma el
//       ajuste: el neto contra los fijos, el costo de funcionamiento del Año y
//       lo estimado contra lo pagado (`ajusteTrimestral` y `posiblesFijos`).
//
//       Y los EXTRACTOS de las cuentas (analisis-3, tiempos:V12, Mauro: «cuando
//       se haga un análisis de gastos habrá que incluir esta información»): lo
//       que dicen Prex o BTG y todavía NO se registró como movimiento
//       (`resumenExtractos` con `soloPendientes`), aparte, para no contar dos
//       veces lo que ya está en los movimientos.
//
//       Y los DESTINOS (analisis-4, tiempos:V13, Mauro: «analizar el
//       funcionamiento de cada proyecto y su viabilidad: cuántos recursos se le
//       dedican y si es rentable»): `economiaFamiliar` de nucleo.js, la misma
//       cuenta que Plata → Proyectos, con los movimientos y lo de los extractos
//       que ya tiene categoría; y el libro propio de Casa Verde por moneda.
//
//   node herramientas/analisis.mjs responder <reporteId> <archivo.txt> --titulo "…"
//       Deja el texto que escribió Claude como propuesta de clase «analisis»
//       para quien lo pidió (aparece en su Pizarra y en Plata → Cuentas), y un
//       aviso corto en su buzón. Id fijo: correrlo dos veces no lo duplica.
//
// El agente no escribe plata: esto sólo LEE movimientos y ESCRIBE una propuesta
// (lo que las reglas de Tiempos le dejan crear) y un aviso.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROYECTOS, entrar, entrarSuave, listar, leerUno, escribir, crearAviso } from "./firestore.mjs";
import { idAviso } from "./avisos.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ex = (m) => { console.error("\n✖ " + m + "\n"); process.exit(1); };
const r2 = (n) => Math.round(n * 100) / 100;
const NUCLEO_WEB = "https://maurogasta-crypto.github.io/tiempos/nucleo.js";

/** tiempos/nucleo.js: el de al lado si está; si no, el publicado. No tiene imports. */
export async function cargarNucleo() {
  for (const p of [path.join(AQUI, "../../tiempos/nucleo.js"), "/home/user/tiempos/nucleo.js"]) {
    if (fs.existsSync(p)) return import(p);
  }
  const r = await fetch(NUCLEO_WEB);
  if (!r.ok) throw new Error("no pude traer nucleo.js de Tiempos (" + r.status + ")");
  return import("data:text/javascript;base64," + Buffer.from(await r.text()).toString("base64"));
}

const plano = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const enRango = (iso, d, h) => !!iso && (!d || iso >= d) && (!h || iso <= h);
const diaUY = (v) => { const ms = typeof v === "number" ? v : Date.parse(v); return Number.isFinite(ms) ? new Date(ms - 3 * 3600000).toISOString().slice(0, 10) : ""; };

/** El libro de Casa Verde en el período: por moneda y por categoría, y lo que falta. */
export function libroCasaVerde({ movimientos = [], honorarios = [], desde = "", hasta = "" }) {
  const porMoneda = {};
  for (const m of movimientos) {
    if (!m || !(Number(m.monto) > 0) || !m.moneda || !enRango(String(m.fecha || "").slice(0, 10), desde, hasta)) continue;
    const s = m.tipo === "entro" ? 1 : m.tipo === "salio" ? -1 : 0;
    if (!s) continue;
    const o = (porMoneda[m.moneda] = porMoneda[m.moneda] || { entro: 0, salio: 0, saldo: 0, porCategoria: {} });
    const v = Number(m.monto);
    if (s > 0) o.entro += v; else o.salio += v;
    o.saldo += s * v;
    const c = m.categoria || "sin categoría";
    o.porCategoria[c] = (o.porCategoria[c] || 0) + s * v;
  }
  for (const o of Object.values(porMoneda)) {
    o.entro = r2(o.entro); o.salio = r2(o.salio); o.saldo = r2(o.saldo);
    for (const k of Object.keys(o.porCategoria)) o.porCategoria[k] = r2(o.porCategoria[k]);
  }
  const sinPagar = honorarios.filter((h) => h && h.estado !== "pagado" && Number(h.monto) > 0);
  const faltan = [];
  if (sinPagar.length) faltan.push(`${sinPagar.length} honorario(s) sin pagar en Casa Verde (${r2(sinPagar.reduce((t, h) => t + Number(h.monto), 0))} BRL)`);
  const sinCat = movimientos.filter((m) => m && !m.categoria && enRango(String(m.fecha || "").slice(0, 10), desde, hasta)).length;
  if (sinCat) faltan.push(`${sinCat} movimiento(s) de Casa Verde sin categoría`);
  return { porMoneda, faltan };
}

/** Lo cobrado en remate en el período, por moneda (bruto: remate no anota sus gastos). */
export function cobradoRemate({ ventas = [], desde = "", hasta = "" }) {
  const out = {};
  for (const v of ventas) for (const p of (v && v.pago && v.pago.registros) || []) {
    if (!p || !(Number(p.monto) > 0) || !p.moneda || !enRango(diaUY(p.fecha), desde, hasta)) continue;
    out[p.moneda] = r2((out[p.moneda] || 0) + Number(p.monto));
  }
  return out;
}

/** Qué libros entran: Casa Verde si la cuenta es Casa Verde o no hay cuenta; remate, si no hay cuenta o es Santa Fe. */
export function librosDe(cuenta) {
  const c = plano(cuenta);
  return { casaVerde: !c || c.includes("casa verde"), remate: !c || c.includes("santa fe") };
}

/** Todo lo que el análisis necesita, ya calculado. */
export function armarDatos({ nucleo, analisis = {}, movs = [], extractos = [], ninos = [], personas = [], cuentasDoc = {}, cv = null, remate = null, conceptos = {}, hoyMes = "9999-12" }) {
  const cuentas = nucleo.cuentasDe(cuentasDoc);
  const { que = "balance", cuenta = "", desde = "", hasta = "", categorias = [] } = analisis;
  const id = cuenta ? nucleo.cuentaPorNombre(cuentas, cuenta) : null;
  const ids = id ? nucleo.idsDeCuenta(cuentas, id) : null;
  const b = nucleo.balanceDe(movs, { cuentas: ids, desde, hasta, categorias });
  // Por cuenta, para ver a qué se fue la plata (sólo si no se pidió una).
  const porCuenta = {};
  if (!id) for (const c of cuentas) {
    const x = nucleo.balanceDe(movs, { cuentas: c.nivel ? new Set([c.id]) : nucleo.idsDeCuenta(cuentas, c.id), desde, hasta, categorias });
    if (x.lista.length) porCuenta[c.ruta] = x.porMoneda;
  }
  const sinCuenta = movs.filter((m) => m && !m.cuenta && enRango(m.fecha, desde, hasta)).length;
  const libros = librosDe(cuenta);
  return {
    pedido: { que, cuenta: id ? cuentas.find((c) => c.id === id).ruta : cuenta || "todas", desde: desde || "el principio", hasta: hasta || "hoy", categorias },
    cuentaEncontrada: !cuenta || !!id,
    tiempos: { porMoneda: b.porMoneda, registros: b.lista.length, faltan: b.faltan, porCuenta, sinCuenta,
      categorias: Object.fromEntries(Object.entries(nucleo.CATEGORIAS).map(([k, c]) => [k, c.nombre])) },
    casaVerde: libros.casaVerde && cv ? libroCasaVerde({ ...cv, desde, hasta }) : null,
    remate: libros.remate && remate ? { cobrado: cobradoRemate({ ...remate, desde, hasta }), nota: "bruto: remate no anota sus gastos" } : null,
    trimestre: que === "trimestre" && desde ? {
      ajuste: nucleo.ajusteTrimestral({ conceptos, movs, trimestre: nucleo.trimestreDe(desde.slice(0, 7)), hoyMes }),
      seRepitenSinSerFijos: nucleo.posiblesFijos(movs, conceptos, hoyMes),
    } : null,
    destinos: nucleo.economiaFamiliar && !id ? {
      ...nucleo.economiaFamiliar({ movs: [...movs, ...nucleo.pendientesComoMovs(extractos)], cuentas, ninos, personas, desde, hasta }),
      casaVerdeLibroPropio: cv && nucleo.libroDeNegocio ? nucleo.libroDeNegocio(cv.movimientos, { desde, hasta }) : null,
      nota: "Toda la plata es de la familia. Cada movimiento va a UN destino (proyecto de su cuenta → chico → persona → la casa). `parte` = % de lo que salió en esa moneda. Casa Verde es rentable en una moneda si el neto de su libro propio menos lo que la familia le puso en esa moneda queda positivo.",
    } : null,
    // analisis-5: lo que costó vivir un año (baseAnual), de todo lo cargado.
    baseAnual: nucleo.baseAnual ? nucleo.baseAnual([...movs, ...(nucleo.pendientesComoMovs ? nucleo.pendientesComoMovs(extractos) : [])], { hasta: hasta || new Date().toISOString().slice(0, 10) }) : null,
    extractos: nucleo.resumenExtractos && extractos.length ? {
      ...nucleo.resumenExtractos(ids ? extractos.filter((l) => ids.has(l.cuenta)) : extractos, { desde, hasta, soloPendientes: true }),
      nota: "Lo que dicen los bancos (Prex, BTG…) y todavía NO está registrado como movimiento: va APARTE de «tiempos». Montos con signo (− salió, + entró). «revisar» es lo que no se sabe qué es: se dice, no se adivina. Cargas, cambios de moneda y señas que ya están en Casa Verde no cuentan.",
    } : null,
    reglas: "Cada moneda es aparte: no se suman ni se convierten. La plata es toda de la familia; la cuenta sólo dice a qué fue. El costo de funcionamiento es lo del Año ÷ 4 por trimestre.",
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , cmd, reporteId, archivo] = process.argv;
  const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : ""; };
  if (!["datos", "responder"].includes(cmd) || !reporteId) ex("uso: analisis.mjs datos <reporteId> | responder <reporteId> <archivo.txt> --titulo \"…\"");
  const ti = PROYECTOS.tiempos, sTi = await entrar(ti);
  const rep = await leerUno(ti, sTi, "reportes", reporteId);
  if (!rep) ex("no existe reportes/" + reporteId + " en Tiempos");
  if (cmd === "datos") {
    const nucleo = await cargarNucleo();
    const an = rep.analisis || {};
    const libros = librosDe(an.cuenta);
    let cv = null, remate = null;
    if (libros.casaVerde) {
      const c = PROYECTOS.casaverde, s = await entrarSuave(c);
      if (s.ok) cv = { movimientos: await listar(c, s.sesion, "movimientos", true).catch(() => []), honorarios: await listar(c, s.sesion, "honorarios", true).catch(() => []) };
    }
    if (libros.remate) {
      const c = PROYECTOS.remate, s = await entrarSuave(c);
      if (s.ok) remate = { ventas: await listar(c, s.sesion, "ventas", true).catch(() => []) };
    }
    const d = armarDatos({ nucleo, analisis: an, movs: await listar(ti, sTi, "movimientos"),
      extractos: await listar(ti, sTi, "extractos").catch(() => []),
      ninos: (((await leerUno(ti, sTi, "familia", "config")) || {}).ninos) || [],
      personas: (await listar(ti, sTi, "miembros")).map((m) => ({ id: m.id, nombre: m.nombre || "" })),
      cuentasDoc: (await leerUno(ti, sTi, "familia", "cuentas")) || {}, cv, remate,
      conceptos: (((await leerUno(ti, sTi, "familia", "presupuesto")) || {}).conceptos) || {},
      hoyMes: new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 7) });
    console.log(JSON.stringify({ pregunta: rep.texto, para: rep.nombre, ...d }, null, 2));
  } else {
    if (!archivo || !fs.existsSync(archivo)) ex("falta el archivo con el texto del análisis");
    const texto = fs.readFileSync(archivo, "utf8").trim().slice(0, 6000);
    if (texto.length < 40) ex("el análisis está vacío o es demasiado corto");
    const titulo = (opt("--titulo") || String(rep.texto || "Análisis").replace(/^Análisis:\s*/, "")).slice(0, 120);
    const id = "an-" + reporteId;
    const ya = await leerUno(ti, sTi, "propuestas", id);
    if (ya) { console.log("  = ya estaba: propuestas/" + id); process.exit(0); }
    await escribir(ti, sTi, "propuestas", id, { clase: "analisis", estado: "pendiente", fuente: "claude", resumen: titulo, texto,
      reporteId, datos: { para: rep.uid }, creadoEn: { $timestamp: new Date().toISOString() } });
    const dia = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
    const aviso = `📊 Tu análisis «${titulo.slice(0, 60)}» está listo: Tiempos → Pizarra (y queda en Plata → Cuentas).`;
    const r = await crearAviso(ti, sTi, idAviso(rep.uid, "pedido", aviso, dia), { uid: rep.uid, sitio: "tiempos", tema: "pedido", texto: aviso,
      creadoEn: { $timestamp: new Date().toISOString() }, leido: false });
    console.log(`  + propuestas/${id} para ${rep.nombre || rep.uid}` + (r.ok ? " · aviso en su buzón" : " · el aviso no salió: " + r.motivo));
  }
}
