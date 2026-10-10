#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// herramientas/extractos.mjs — Cargar el extracto de una cuenta en Tiempos.
// Sello: extractos-1 (10-oct-2026, tiempos:V12)
//
// Mauro: «vamos integrando esta información para tener datos estadísticos…
// revisá si ya hay cargados datos de las cuentas BTG de Mauro y Florencia… así
// como datos anteriores de Prex, para dejar un registro vivo y unificado».
//
// Un extracto —capturas de Prex, el archivo de BTG— lo lee el chat y lo deja
// en un JSON (afuera de todo repositorio: son datos de la familia):
//
//   { "medio": "prex-mauro", "uid": "<uid de quien es la cuenta>",
//     "lineas": [ { "fecha": "2026-07-24", "desc": "MACROMERCADO", "moneda": "UYU",
//                   "monto": 7478.61, "sentido": "salio", "clase": "gasto",
//                   "categoria": "comida", "cuenta": "", "nota": "", "dudas": [] } ] }
//
//   node herramientas/extractos.mjs cargar <archivo.json>            (mira, no escribe)
//   node herramientas/extractos.mjs cargar <archivo.json> --aplicar  (crea lo que falta)
//   node herramientas/extractos.mjs resumen [--medio prex-mauro] [--desde AAAA-MM-DD] [--hasta …]
//
// Cada línea va a `extractos/<id>` de Tiempos con el id que sale de ella misma
// (`idExtracto` de tiempos/nucleo.js): cargar dos veces el mismo archivo, o dos
// lotes de capturas que se pisan, no duplica nada. Se CREA y nada más: una
// línea que ya estaba —y que quizás alguien ya registró o corrigió— no se toca.
//
// Lo que NO hace, a propósito: escribir movimientos. Registrar una línea es de
// una persona, desde Plata → Extractos. Y nunca guarda un número de cuenta o de
// tarjeta: de la línea van fecha, comercio, monto y moneda.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import { PROYECTOS, entrar, listar, crearNuevo } from "./firestore.mjs";
import { cargarNucleo } from "./analisis.mjs";

const ex = (m) => { console.error("\n✖ " + m + "\n"); process.exit(1); };
// Un número de cuenta, de tarjeta o de operación no viaja: 6 dígitos seguidos o más.
const sinNumeros = (t) => String(t || "").replace(/\d[\d .\-/]{5,}\d/g, "…").replace(/\s+/g, " ").trim().slice(0, 120);

/** Las líneas del archivo, con su id y la forma que piden las reglas v14.
    Dos líneas idénticas el mismo día (tres débitos de 19,46 en Brasil) son
    tres líneas: el orden dentro del archivo las distingue. */
export function armarLineas(nucleo, { medio, uid = "", lineas = [] }) {
  if (!medio) throw new Error("falta el medio (p. ej. prex-mauro)");
  const vistos = {}, out = [], malas = [];
  for (const [i, l] of lineas.entries()) {
    const monto = Math.round(Number(l.monto) * 100) / 100;
    const sentido = l.sentido === "entro" ? "entro" : l.sentido === "salio" ? "salio" : "";
    const clase = nucleo.CLASES_EXTRACTO[l.clase] ? l.clase : "revisar";
    if (!(monto > 0) || !nucleo.MONEDAS.includes(l.moneda) || !nucleo.esISO(l.fecha) || !sentido) { malas.push(i + 1); continue; }
    const base = nucleo.idExtracto(medio, l.fecha, l.moneda, monto, sentido);
    const n = vistos[base] = (vistos[base] || 0) + 1;
    const doc = { medio, fecha: l.fecha, moneda: l.moneda, monto, sentido, desc: sinNumeros(l.desc), clase,
                  estado: "pendiente", uid: l.uid || uid || "" };
    if ((clase === "gasto" || clase === "entrada") && nucleo.CATEGORIAS[l.categoria]) doc.categoria = l.categoria;
    for (const k of ["cuenta", "para"]) if (l[k]) doc[k] = String(l[k]);
    if (l.nota) doc.nota = String(l.nota).slice(0, 200);
    if ((l.dudas || []).length) doc.dudas = l.dudas.map((d) => String(d).slice(0, 160)).slice(0, 4);
    out.push({ id: nucleo.idExtracto(medio, l.fecha, l.moneda, monto, sentido, n), doc });
  }
  return { lineas: out, malas };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , cmd, archivo] = process.argv;
  const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : ""; };
  const nucleo = await cargarNucleo();
  if (!nucleo.idExtracto) ex("el nucleo.js de Tiempos todavía no tiene extractos (nucleo-27)");
  const ti = PROYECTOS.tiempos, s = await entrar(ti);
  if (cmd === "cargar") {
    if (!archivo || !fs.existsSync(archivo)) ex("uso: extractos.mjs cargar <archivo.json> [--aplicar]");
    const { lineas, malas } = armarLineas(nucleo, JSON.parse(fs.readFileSync(archivo, "utf8")));
    if (malas.length) console.log(`  ⚠ ${malas.length} línea(s) sin monto, moneda, fecha o sentido: ${malas.slice(0, 20).join(", ")}`);
    const ya = new Set((await listar(ti, s, "extractos")).map((d) => d.id));
    const nuevas = lineas.filter((l) => !ya.has(l.id));
    const porClase = {};
    for (const l of nuevas) porClase[l.doc.clase] = (porClase[l.doc.clase] || 0) + 1;
    console.log(`  ${lineas.length} líneas en el archivo · ${lineas.length - nuevas.length} ya estaban · ${nuevas.length} nuevas ${JSON.stringify(porClase)}`);
    if (!process.argv.includes("--aplicar")) { console.log("  (no escribí nada: agregá --aplicar)"); process.exit(0); }
    let ok = 0; const fallas = [];
    for (const l of nuevas) {
      const r = await crearNuevo(ti, s, "extractos", l.id, { ...l.doc, cargadoEn: { $timestamp: new Date().toISOString() } });
      if (r.ok) ok++; else fallas.push(l.id + ": " + r.motivo);
    }
    console.log(`  + ${ok} creadas` + (fallas.length ? ` · ✖ ${fallas.length} fallaron:\n    ` + fallas.slice(0, 10).join("\n    ") : ""));
    process.exit(fallas.length ? 1 : 0);
  } else if (cmd === "resumen") {
    const r = nucleo.resumenExtractos(await listar(ti, s, "extractos"), { medio: opt("--medio"), desde: opt("--desde"), hasta: opt("--hasta") });
    console.log(JSON.stringify(r, null, 2));
  } else ex("uso: extractos.mjs cargar <archivo.json> [--aplicar] | resumen [--medio …] [--desde …] [--hasta …]");
}
