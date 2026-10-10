// ─────────────────────────────────────────────────────────────────────────────
// pruebas/herramientas/extractos.mjs — Banco de la carga de extractos a Tiempos.
//
//   node pruebas/herramientas/extractos.mjs
//
// Sin npm ni red. Prueba lo que NO tiene que pasar: duplicar una línea al
// cargar dos veces, perder una de tres iguales el mismo día, guardar un número
// de cuenta o de tarjeta, o dejar pasar una línea sin monto o sin sentido.
// ─────────────────────────────────────────────────────────────────────────────
import assert from "node:assert/strict";
import { armarLineas } from "../../herramientas/extractos.mjs";
import { cargarNucleo } from "../../herramientas/analisis.mjs";

let pasadas = 0, fallidas = 0;
const prueba = (n, f) => { try { f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };
const nucleo = await cargarNucleo();
const L = (o = {}) => ({ fecha: "2025-12-02", desc: "Débito Prex Brasil", moneda: "USD", monto: 19.46, sentido: "salio", clase: "revisar", ...o });

prueba("tres débitos iguales el mismo día son tres líneas, y el archivo cargado dos veces da los mismos ids", () => {
  const a = armarLineas(nucleo, { medio: "prex-mauro", lineas: [L(), L(), L(), L({ monto: 14.2 })] });
  assert.equal(new Set(a.lineas.map((l) => l.id)).size, 4);
  const b = armarLineas(nucleo, { medio: "prex-mauro", lineas: [L(), L(), L(), L({ monto: 14.2 })] });
  assert.deepEqual(a.lineas.map((l) => l.id), b.lineas.map((l) => l.id));
});
prueba("un número de cuenta, de tarjeta o de operación no se guarda; el nombre del comercio sí", () => {
  const { lineas } = armarLineas(nucleo, { medio: "prex-mauro", lineas: [
    L({ desc: "Prex a Prex a Cuenta 1541779" }), L({ desc: "CARGA TRANSFERENCIA BANCARIA / 36272021" }), L({ desc: "TA TA 403" }), L({ desc: "Envío Prex a Prex ARG 11158452" })] });
  assert.ok(lineas.every((l) => !/\d{6,}/.test(l.doc.desc)), lineas.map((l) => l.doc.desc).join(" | "));
  assert.equal(lineas[2].doc.desc, "TA TA 403");
});
prueba("una línea sin monto, moneda, fecha o sentido no entra, y se dice cuál", () => {
  const r = armarLineas(nucleo, { medio: "prex-mauro", lineas: [L(), L({ monto: 0 }), L({ moneda: "ARS" }), L({ fecha: "2/12" }), L({ sentido: "" })] });
  assert.equal(r.lineas.length, 1); assert.deepEqual(r.malas, [2, 3, 4, 5]);
});
prueba("la categoría sólo va con un gasto o una entrada; una clase inventada queda «revisar»; todo nace pendiente", () => {
  const { lineas } = armarLineas(nucleo, { medio: "prex-mauro", uid: "m", lineas: [
    L({ clase: "gasto", categoria: "comida" }), L({ clase: "interno", categoria: "comida" }), L({ clase: "cualquiera" }), L({ clase: "gasto", categoria: "inventada" })] });
  assert.equal(lineas[0].doc.categoria, "comida");
  assert.ok(!("categoria" in lineas[1].doc));
  assert.equal(lineas[2].doc.clase, "revisar");
  assert.ok(!("categoria" in lineas[3].doc));
  assert.ok(lineas.every((l) => l.doc.estado === "pendiente" && l.doc.uid === "m"));
});
prueba("sin medio no se carga nada", () => {
  assert.throws(() => armarLineas(nucleo, { lineas: [L()] }), /medio/);
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
