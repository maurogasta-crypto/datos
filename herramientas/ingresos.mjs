#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// herramientas/ingresos.mjs — Lo que entró a la familia, desde los negocios.
//
// 8-oct-2026, tiempos:V9. Mauro: «cruzar la información con el dinero que se
// registra en RemateTaller y en Casa Verde, así se puede llevar un control
// centralizado de las finanzas» — y lo que cuenta como ingreso de la familia:
// «mis honorarios + los de Flor + el dinero neto registrado luego de pagar
// todos los gastos».
//
// Lee el mes en las dos bases y deja PROPUESTAS de ingreso en Tiempos (clase
// "gasto", categoría `honorarios` o `negocio`): el agente nunca escribe plata,
// una persona aprueba en Plata. Una propuesta por fuente, persona y moneda, con
// id fijo: correrlo dos veces no duplica, y lo ya aprobado o descartado no se
// vuelve a proponer.
//
//   · Honorarios de Casa Verde PAGADOS en el mes, de Mauro y de Florencia
//     (los demás son de otras personas y no son de la familia).
//   · El NETO de Casa Verde del mes: lo que entró menos lo que salió en sus
//     movimientos, por moneda. Ya descuenta los honorarios de todos —incluidos
//     los de ellos dos—, así que sumarlos aparte no cuenta nada dos veces.
//   · Lo COBRADO en remate en el mes (los registros de pago de sus ventas).
//     Remate no anota sus gastos: es bruto, y la propuesta lo dice.
//
//   node herramientas/ingresos.mjs <AAAA-MM>            muestra lo que propondría
//   node herramientas/ingresos.mjs <AAAA-MM> --escribir lo deja en Tiempos
// ─────────────────────────────────────────────────────────────────────────────

import { PROYECTOS, entrar, listar, leerUno, escribir } from "./firestore.mjs";

const ex = (m) => { console.error("\n✖ " + m + "\n"); process.exit(1); };
const MONEDAS = ["BRL", "UYU", "USD"];
const r2 = (n) => Math.round(n * 100) / 100;
const pliega = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Un instante (ms, ISO o Timestamp ya leído) → «AAAA-MM-DD» en Uruguay (UTC−3). */
export function diaUY(v) {
  const ms = typeof v === "number" ? v : Date.parse(v);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms - 3 * 3600000).toISOString().slice(0, 10);
}
const ultimoDia = (mes) => `${mes}-${String(new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate()).padStart(2, "0")}`;

/* La persona de Tiempos que es ese honorario: por el uid de Casa Verde
   (`miembros.cvUid`) o, si no está, por el nombre ("Flor" es Florencia). */
export function quienDe(h, miembros) {
  const porUid = (miembros || []).find((m) => m.cvUid && m.cvUid === h.uid);
  if (porUid) return porUid;
  const n = pliega(h.nombre);
  if (!n) return null;
  return (miembros || []).find((m) => { const x = pliega(m.nombre); return x && (x === n || x.startsWith(n) || n.startsWith(x)); }) || null;
}

/** Todo lo que se propondría para el mes, sin tocar ninguna base. */
export function armarIngresos({ mes, honorarios = [], movsCV = [], ventas = [], miembros = [] }) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(mes))) throw new Error("el mes va como AAAA-MM");
  const fecha = ultimoDia(mes);
  const mauro = (miembros || []).find((m) => pliega(m.nombre) === "mauro") || miembros[0] || {};
  const out = [];
  const prop = (id, resumen, datos, dudas = []) => out.push({ id, doc: { clase: "gasto", estado: "pendiente", fuente: "cuentas",
    resumen, datos: { ...datos, monto: r2(datos.monto), fecha }, dudas } });

  // 1 · Honorarios pagados en el mes, de los de la familia.
  const hon = {};
  for (const h of honorarios) {
    if (!h || h.estado !== "pagado" || !(Number(h.monto) > 0)) continue;
    const dia = h.pagadoFecha || diaUY(h.pagadoEn);
    if (String(dia).slice(0, 7) !== mes) continue;
    const m = quienDe(h, miembros); if (!m) continue;
    const mon = MONEDAS.includes(h.moneda) ? h.moneda : "BRL";      // Casa Verde paga honorarios en reales
    const k = m.id + "|" + mon;
    (hon[k] = hon[k] || { m, mon, monto: 0, n: 0 }).monto += Number(h.monto); hon[k].n++;
  }
  for (const { m, mon, monto, n } of Object.values(hon))
    prop(`ing-${mes}-cvhon-${m.id}-${mon}`, `Honorarios de Casa Verde de ${m.nombre} en ${mes} (${n})`,
      { monto, moneda: mon, categoria: "honorarios", comercio: "Casa Verde", detalle: `honorarios pagados en ${mes}`, uid: m.id });

  // 2 · El neto de Casa Verde: entró − salió, por moneda.
  const neto = {};
  for (const x of movsCV) {
    if (!x || String(x.fecha || "").slice(0, 7) !== mes || !MONEDAS.includes(x.moneda) || !(Number(x.monto) > 0)) continue;
    neto[x.moneda] = (neto[x.moneda] || 0) + (x.tipo === "entro" ? 1 : x.tipo === "salio" ? -1 : 0) * Number(x.monto);
  }
  for (const [mon, monto] of Object.entries(neto)) {
    if (!(r2(monto) > 0)) continue;     // un mes en rojo no es un ingreso; se ve en Casa Verde
    prop(`ing-${mes}-cvneto-${mon}`, `Neto de Casa Verde en ${mes}: lo que entró menos lo que salió`,
      { monto, moneda: mon, categoria: "negocio", comercio: "Casa Verde", detalle: `neto de ${mes} (ya descontados gastos y honorarios)`, uid: mauro.id || "" },
      ["si todo el neto es de la familia o hay que separar algo"]);
  }

  // 3 · Lo cobrado en remate en el mes.
  const rem = {};
  for (const v of ventas) for (const p of (v && v.pago && v.pago.registros) || []) {
    if (!p || diaUY(p.fecha).slice(0, 7) !== mes || !MONEDAS.includes(p.moneda) || !(Number(p.monto) > 0)) continue;
    rem[p.moneda] = (rem[p.moneda] || 0) + Number(p.monto);
  }
  for (const [mon, monto] of Object.entries(rem))
    prop(`ing-${mes}-remate-${mon}`, `Cobrado en remate en ${mes}`,
      { monto, moneda: mon, categoria: "negocio", comercio: "remateTaller", detalle: `cobrado en ${mes} (bruto: remate no anota sus gastos)`, uid: mauro.id || "" },
      ["es bruto: si hubo gastos de remate, corregí el monto antes de aprobar"]);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , mes, bandera] = process.argv;
  if (!mes) ex("falta el mes: node herramientas/ingresos.mjs AAAA-MM [--escribir]");
  const [ti, cv, re] = [PROYECTOS.tiempos, PROYECTOS.casaverde, PROYECTOS.remate];
  const [sTi, sCv, sRe] = [await entrar(ti), await entrar(cv), await entrar(re)];
  const props = armarIngresos({ mes, miembros: await listar(ti, sTi, "miembros"),
    honorarios: await listar(cv, sCv, "honorarios"), movsCV: await listar(cv, sCv, "movimientos"), ventas: await listar(re, sRe, "ventas") });
  if (!props.length) console.log(`\n  ${mes}: nada que proponer.\n`);
  for (const p of props) {
    const ya = await leerUno(ti, sTi, "propuestas", p.id);
    const linea = `${p.doc.datos.monto} ${p.doc.datos.moneda} · ${p.doc.resumen}`;
    if (ya) { console.log(`  = ya está (${ya.estado}): ${linea}`); continue; }
    if (bandera === "--escribir") {
      await escribir(ti, sTi, "propuestas", p.id, { ...p.doc, creadoEn: { $timestamp: new Date().toISOString() } });
      console.log(`  + propuesta: ${linea}`);
    } else console.log(`  · propondría: ${linea}`);
  }
  if (bandera !== "--escribir" && props.length) console.log("\n  (con --escribir quedan en Tiempos → Plata, para aprobar)\n");
}
