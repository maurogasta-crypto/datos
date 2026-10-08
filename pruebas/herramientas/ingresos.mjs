// ─────────────────────────────────────────────────────────────────────────────
// pruebas/herramientas/ingresos.mjs — Banco de lo que entra a la familia.
//
//   node pruebas/herramientas/ingresos.mjs
//
// Sin npm ni red: corre `armarIngresos` con datos de mentira. Prueba sobre todo
// lo que NO tiene que pasar: proponer los honorarios de otra persona, contar
// dos veces lo mismo, mezclar monedas, tomar otro mes, o proponer un mes en
// rojo como si fuera un ingreso.
// ─────────────────────────────────────────────────────────────────────────────
import assert from "node:assert/strict";
import { armarIngresos, quienDe, diaUY } from "../../herramientas/ingresos.mjs";

let pasadas = 0, fallidas = 0;
const prueba = (n, f) => { try { f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };

const MIEMBROS = [{ id: "tm", nombre: "Mauro", cvUid: "cv-m" }, { id: "tf", nombre: "Florencia" }];
const HON = [
  { uid: "cv-m", nombre: "Mauro", monto: 120, estado: "pagado", pagadoFecha: "2026-10-03" },
  { uid: "cv-m", nombre: "Mauro", monto: 80, estado: "pagado", pagadoFecha: "2026-10-20" },
  { uid: "cv-f", nombre: "Flor", monto: 300, estado: "pagado", pagadoEn: "2026-10-31T23:30:00.000Z" },   // 31-oct en UY
  { uid: "cv-e", nombre: "Esteban", monto: 999, estado: "pagado", pagadoFecha: "2026-10-05" },          // no es de la familia
  { uid: "cv-m", nombre: "Mauro", monto: 50, estado: "pendiente", pagadoFecha: "2026-10-05" },          // no pagado
  { uid: "cv-m", nombre: "Mauro", monto: 70, estado: "pagado", pagadoFecha: "2026-09-30" },             // otro mes
];
const MOVS = [
  { tipo: "entro", monto: 1000, moneda: "USD", fecha: "2026-10-04" },
  { tipo: "salio", monto: 200, moneda: "USD", fecha: "2026-10-10" },
  { tipo: "entro", monto: 500, moneda: "BRL", fecha: "2026-10-04" },
  { tipo: "salio", monto: 900, moneda: "BRL", fecha: "2026-10-04" },   // rojo en BRL
  { tipo: "entro", monto: 5000, moneda: "USD", fecha: "2026-11-01" },  // otro mes
];
const VENTAS = [{ pago: { registros: [{ fecha: Date.UTC(2026, 9, 15, 15), monto: 1500, moneda: "UYU" }, { fecha: Date.UTC(2026, 10, 1, 2), monto: 7, moneda: "UYU" }] } }];
const props = armarIngresos({ mes: "2026-10", honorarios: HON, movsCV: MOVS, ventas: VENTAS, miembros: MIEMBROS });
const por = (id) => props.find((p) => p.id === id);

prueba("los honorarios pagados en el mes, de Mauro y de Flor, sumados por persona y moneda", () => {
  assert.equal(por("ing-2026-10-cvhon-tm-BRL").doc.datos.monto, 200);
  assert.equal(por("ing-2026-10-cvhon-tf-BRL").doc.datos.monto, 300);
  assert.equal(por("ing-2026-10-cvhon-tf-BRL").doc.datos.uid, "tf");
});
prueba("nunca los de otra persona, ni los pendientes, ni los de otro mes", () => {
  assert.ok(!props.some((p) => p.doc.datos.monto === 999));
  assert.equal(props.filter((p) => p.id.includes("cvhon")).length, 2);
});
prueba("el neto de Casa Verde por moneda, y un mes en rojo no se propone", () => {
  assert.equal(por("ing-2026-10-cvneto-USD").doc.datos.monto, 800);
  assert.equal(por("ing-2026-10-cvneto-BRL"), undefined);
});
prueba("lo cobrado en remate, en hora de Uruguay, y avisando que es bruto", () => {
  const r = por("ing-2026-10-remate-UYU");
  assert.equal(r.doc.datos.monto, 1507, "el 1-nov 02:00 UTC todavía es 31-oct en Uruguay");
  assert.ok(r.doc.dudas[0].includes("bruto"));
});
prueba("todo es una PROPUESTA de ingreso, para aprobar, con la forma que Plata ya sabe aprobar", () => {
  for (const p of props) {
    assert.equal(p.doc.clase, "gasto"); assert.equal(p.doc.estado, "pendiente"); assert.equal(p.doc.fuente, "cuentas");
    assert.ok(["honorarios", "negocio"].includes(p.doc.datos.categoria));
    assert.equal(p.doc.datos.fecha, "2026-10-31");
    for (const k of ["monto", "moneda", "fecha", "categoria", "comercio", "detalle", "uid"]) assert.ok(k in p.doc.datos, k);
  }
});
prueba("el id es fijo: correrlo dos veces da los mismos ids", () => {
  const otra = armarIngresos({ mes: "2026-10", honorarios: HON, movsCV: MOVS, ventas: VENTAS, miembros: MIEMBROS });
  assert.deepEqual(otra.map((p) => p.id), props.map((p) => p.id));
});
prueba("quién es: por el uid de Casa Verde o por el nombre; si no, nadie", () => {
  assert.equal(quienDe({ uid: "cv-m" }, MIEMBROS).id, "tm");
  assert.equal(quienDe({ uid: "x", nombre: "Flor" }, MIEMBROS).id, "tf");
  assert.equal(quienDe({ uid: "x", nombre: "Esteban" }, MIEMBROS), null);
  assert.equal(quienDe({ uid: "x", nombre: "" }, MIEMBROS), null);
});
prueba("el mes mal escrito se rechaza, y diaUY entiende ms e ISO", () => {
  assert.throws(() => armarIngresos({ mes: "octubre" }));
  assert.equal(diaUY("2026-11-01T02:00:00Z"), "2026-10-31"); assert.equal(diaUY("nada"), "");
});
console.log(`\n${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
