// ─────────────────────────────────────────────────────────────────────────────
// pruebas/herramientas/analisis.mjs — Banco del análisis que se pide desde Tiempos.
//
//   node pruebas/herramientas/analisis.mjs
//
// Sin npm ni red (usa ../tiempos/nucleo.js si está al lado; si no, el
// publicado). Prueba sobre todo lo que NO tiene que pasar: mezclar monedas,
// tomar otro período, meter Casa Verde o remate donde no corresponde, o
// esconder lo que falta.
// ─────────────────────────────────────────────────────────────────────────────
import assert from "node:assert/strict";
import fs from "node:fs";
import { armarDatos, libroCasaVerde, cobradoRemate, librosDe, cargarNucleo } from "../../herramientas/analisis.mjs";

let pasadas = 0, fallidas = 0;
const prueba = async (n, f) => { try { await f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };
const nucleo = await cargarNucleo();
const CUENTAS = { cuentas: { gf: { nombre: "General Flores", clase: "lugar", orden: 1 }, dgf: { nombre: "Depósito", padre: "gf" }, hx: { nombre: "Hilux", clase: "vehiculo", orden: 2 },
  sf: { nombre: "Santa Fe", clase: "lugar", orden: 3 }, cv: { nombre: "Casa Verde", clase: "lugar", orden: 4 } } };
const MOVS = [
  { monto: 1000, moneda: "UYU", fecha: "2026-09-03", categoria: "materiales", cuenta: "dgf" },
  { monto: 500, moneda: "USD", fecha: "2026-09-10", categoria: "alquileres", cuenta: "gf", comprobanteUrl: "x" },
  { monto: 2400, moneda: "UYU", fecha: "2026-09-12", categoria: "combustible", cuenta: "hx" },
  { monto: 300, moneda: "UYU", fecha: "2026-09-15", categoria: "comida" },
  { monto: 99, moneda: "UYU", fecha: "2026-10-01", categoria: "materiales", cuenta: "gf" },
];

await prueba("una cuenta: sus números y los de su depósito, en su período, por moneda", () => {
  const d = armarDatos({ nucleo, analisis: { que: "balance", cuenta: "general flores", desde: "2026-09-01", hasta: "2026-09-30" }, movs: MOVS, cuentasDoc: CUENTAS });
  assert.equal(d.pedido.cuenta, "General Flores");
  assert.deepEqual(d.tiempos.porMoneda.UYU.porCategoria, { materiales: -1000 });
  assert.equal(d.tiempos.porMoneda.USD.saldo, 500);
  assert.equal(d.tiempos.registros, 2);
  assert.deepEqual(d.tiempos.porCuenta, {}, "con una cuenta pedida no se desglosa el resto");
  assert.equal(d.casaVerde, null); assert.equal(d.remate, null);
});
await prueba("sin cuenta: todo, desglosado por cuenta, y dice cuántos no tienen cuenta", () => {
  const d = armarDatos({ nucleo, analisis: { desde: "2026-09-01", hasta: "2026-09-30" }, movs: MOVS, cuentasDoc: CUENTAS });
  assert.deepEqual(Object.keys(d.tiempos.porCuenta), ["General Flores", "General Flores › Depósito", "Hilux"]);
  assert.equal(d.tiempos.sinCuenta, 1);
  assert.ok(d.reglas.includes("no se suman ni se convierten"));
});
await prueba("una cuenta que no existe se dice, no se adivina", () => {
  const d = armarDatos({ nucleo, analisis: { cuenta: "Pisquito" }, movs: MOVS, cuentasDoc: CUENTAS });
  assert.equal(d.cuentaEncontrada, false);
});
await prueba("Casa Verde entra si se pide Casa Verde o todo; remate, si se pide todo o Santa Fe", () => {
  assert.deepEqual(librosDe(""), { casaVerde: true, remate: true });
  assert.deepEqual(librosDe("Casa Verde"), { casaVerde: true, remate: false });
  assert.deepEqual(librosDe("Santa Fe › Depósito"), { casaVerde: false, remate: true });
  assert.deepEqual(librosDe("Hilux"), { casaVerde: false, remate: false });
});
await prueba("el libro de Casa Verde: por moneda y categoría, en el período, con lo que falta", () => {
  const l = libroCasaVerde({ desde: "2026-09-01", hasta: "2026-09-30", movimientos: [
    { tipo: "entro", monto: 1000, moneda: "USD", fecha: "2026-09-04", categoria: "Reservas" }, { tipo: "salio", monto: 200, moneda: "BRL", fecha: "2026-09-05", categoria: "Compras" },
    { tipo: "entro", monto: 7, moneda: "USD", fecha: "2026-10-04", categoria: "Reservas" }, { tipo: "salio", monto: 50, moneda: "BRL", fecha: "2026-09-06" }],
    honorarios: [{ estado: "pendiente", monto: 120 }, { estado: "pagado", monto: 999 }] });
  assert.deepEqual(l.porMoneda.USD, { entro: 1000, salio: 0, saldo: 1000, porCategoria: { Reservas: 1000 } });
  assert.deepEqual(l.porMoneda.BRL.porCategoria, { Compras: -200, "sin categoría": -50 });
  assert.equal(l.faltan.length, 2);
});
await prueba("lo cobrado en remate, por moneda y en el período (día de Uruguay)", () => {
  const c = cobradoRemate({ desde: "2026-09-01", hasta: "2026-09-30", ventas: [{ pago: { registros: [
    { fecha: Date.parse("2026-09-30T23:30:00Z"), monto: 100, moneda: "UYU" }, { fecha: Date.parse("2026-10-01T02:00:00Z"), monto: 50, moneda: "UYU" },
    { fecha: Date.parse("2026-10-01T04:00:00Z"), monto: 9, moneda: "USD" }] } }] });
  assert.deepEqual(c, { UYU: 150 });
});
await prueba("el trimestre: el ajuste de Tiempos (neto, fijos y costo de funcionamiento) viaja con los datos", () => {
  const conceptos = { luz: { nombre: "UTE", monto: 3000, moneda: "UYU", categoria: "casa", cada: 1, mes: 1 } };
  const movs = [{ monto: 3200, moneda: "UYU", fecha: "2026-10-05", categoria: "casa", fijo: "luz" }, { monto: 50000, moneda: "UYU", fecha: "2026-10-10", categoria: "trabajos" }];
  const d = armarDatos({ nucleo, analisis: { que: "trimestre", desde: "2026-10-01", hasta: "2026-12-31" }, movs, cuentasDoc: CUENTAS, conceptos, hoyMes: "2026-11" });
  assert.equal(d.trimestre.ajuste.trimestre, "2026-T4");
  assert.deepEqual([d.trimestre.ajuste.porMoneda.UYU.entro, d.trimestre.ajuste.porMoneda.UYU.fijos, d.trimestre.ajuste.porMoneda.UYU.costoEstimado], [50000, 3200, 9000]);
  assert.equal(armarDatos({ nucleo, analisis: { que: "balance" }, movs, cuentasDoc: CUENTAS }).trimestre, null);
});
await prueba("responder escribe una propuesta «analisis» con id fijo y un aviso; no escribe plata", () => {
  const src = fs.readFileSync(new URL("../../herramientas/analisis.mjs", import.meta.url), "utf8");
  assert.match(src, /const id = "an-" \+ reporteId/);
  assert.match(src, /clase: "analisis", estado: "pendiente"/);
  assert.ok(!/"movimientos", [a-z]+, \{/.test(src) && !/escribir\(ti, sTi, "movimientos"/.test(src));
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
