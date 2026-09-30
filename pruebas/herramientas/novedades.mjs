// ─────────────────────────────────────────────────────────────────────────────
// pruebas/herramientas/novedades.mjs — Banco de las novedades para Mauro.
//
//   node pruebas/herramientas/novedades.mjs
//
// Sin red. Lo que importa: que la primera corrida no mande el año entero, que
// nada se avise dos veces, que el texto no lleve plata ni teléfonos aunque los
// traiga el dato, y que un mensaje largo se recorte diciendo cuánto falta.
// ─────────────────────────────────────────────────────────────────────────────

import assert from "node:assert/strict";
import { armarNovedades, textoNovedades, limpiarParaAviso, vistoVacio } from "../../herramientas/novedades.mjs";
import { validarTexto, LARGO_MAX, TEMAS } from "../../herramientas/avisos.mjs";

let pasadas = 0, fallidas = 0;
const prueba = (n, f) => { try { f(); pasadas++; console.log("  ✓ " + n); }
  catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };

const HOY = "2026-10-01";
const CAB = [{ id: "c1", nombre: { es: "Cabaña con vista al bosque" } }, { id: "c2", nombre: "Loft con terraza" }];
const R = (id, ci, co, extra = {}) => ({ id, estado: "confirmada", checkIn: ci, checkOut: co, cabanaId: "c2", clienteNombre: "Airbnb · HM2DNEZXSP Natalia", ...extra });
const base = { cabanas: CAB, reservas: [R("r1", "2026-11-20", "2026-11-22")], actividades: [], reportes: [], mensajes: [] };

prueba("la primera corrida anota todo y no manda nada", () => {
  const r = armarNovedades(base, null, HOY);
  assert.equal(r.primera, true); assert.equal(r.items.length, 0);
  assert.deepEqual(r.visto.reservas, ["r1"]);
});
prueba("pero un check-in de mañana que existía en la primera corrida se avisa en la segunda", () => {
  const d = { ...base, reservas: [R("m", "2026-10-02", "2026-10-05")] };
  const v = armarNovedades(d, null, HOY).visto;
  assert.deepEqual(armarNovedades(d, v, HOY).items.map((i) => i.texto), ["Llega mañana: Natalia · Loft con terraza"]);
});
prueba("una reserva nueva se avisa una vez, sin el código de Airbnb", () => {
  const v = armarNovedades(base, null, HOY).visto;
  const d = { ...base, reservas: [...base.reservas, R("r2", "2026-12-01", "2026-12-05")] };
  const r = armarNovedades(d, v, HOY);
  assert.equal(r.items.length, 1);
  assert.match(r.items[0].texto, /^Reserva nueva: Natalia · Loft con terraza · 01\/12–05\/12$/);
  assert.equal(armarNovedades(d, r.visto, HOY).items.length, 0, "la segunda vez no");
});
prueba("una anulada o una que ya se fue no es reserva nueva", () => {
  const v = armarNovedades(base, null, HOY).visto;
  const d = { ...base, reservas: [R("x", "2026-12-01", "2026-12-02", { estado: "anulada" }), R("y", "2026-09-01", "2026-09-03")] };
  assert.equal(armarNovedades(d, v, HOY).items.filter((i) => i.clase === "reserva").length, 0);
});
prueba("check-in y check-out de hoy y mañana, una vez cada uno", () => {
  const d = { ...base, reservas: [R("a", HOY, "2026-10-04"), R("b", "2026-09-28", "2026-10-02"), R("c", "2026-10-03", "2026-10-05")] };
  const v = armarNovedades(d, null, "2026-09-20").visto;          // ya conocidas como reservas
  const r = armarNovedades(d, v, HOY);
  const t = r.items.map((i) => i.texto);
  assert.ok(t.includes("Llega hoy: Natalia · Loft con terraza"), t.join(" | "));
  assert.ok(t.includes("Sale mañana: Natalia · Loft con terraza"), t.join(" | "));
  assert.ok(!t.some((x) => /03\/10|pasado/.test(x)), "la de pasado mañana todavía no");
  assert.equal(armarNovedades(d, r.visto, HOY).items.length, 0, "no se repite");
});
prueba("tareas: las nuevas sí; limpiezas automáticas, borradas y las propias no", () => {
  const v = armarNovedades(base, null, HOY).visto;
  const d = { ...base, actividades: [
    { id: "t1", titulo: "Arreglar la canilla del loft", creadoNombre: "Florencia", estado: "pendiente" },
    { id: "limp-r9", titulo: "Limpieza Loft", creadoNombre: "CasaVerde", estado: "pendiente" },
    { id: "t2", titulo: "Algo borrado", eliminado: true, estado: "pendiente" },
    { id: "t3", titulo: "Mía", creadoNombre: "Mauro", estado: "pendiente" }] };
  const r = armarNovedades(d, v, HOY, { para: "Mauro" });
  assert.deepEqual(r.items.map((i) => i.texto), ["Tarea nueva: Arreglar la canilla del loft (de Florencia)"]);
  assert.equal(r.visto.actividades.length, 4, "igual quedan todas vistas");
});
prueba("pedidos y fallas de los sitios: sólo los nuevos, con el sitio y quién", () => {
  const v = armarNovedades(base, null, HOY).visto;
  const d = { ...base, reportes: [
    { base: "casayourte", id: "p1", tipo: "pedido", nombre: "Romi", texto: "Que las ofertas vayan antes", estado: "nuevo" },
    { base: "remate", id: "f1", texto: "Toqué cobrar y no hizo nada", estado: "tomado" },
    { base: "casaverde", id: "f2", texto: "No carga el calendario" }] };
  const t = armarNovedades(d, v, HOY).items.map((i) => i.texto);
  assert.deepEqual(t, ["Pedido en CasaYourte (Romi): «Que las ofertas vayan antes»", "Falla en Casa Verde: «No carga el calendario»"]);
});
prueba("mensajes: por chat, sólo los que llegaron después del último aviso, y nunca los propios avisos", () => {
  const v = { ...vistoVacio(), mensajesHasta: "2026-09-30T10:00:00Z" };
  const d = { ...base, mensajes: [
    { app: "whatsapp", chat: "Flor Brasil", texto: "hola", captado: "2026-09-30T09:00:00Z" },
    { app: "airbnb", chat: "Natalia", texto: "a qué hora?", captado: "2026-09-30T11:00:00Z" },
    { app: "airbnb", chat: "Natalia", texto: "gracias", captado: "2026-09-30T11:05:00Z" },
    { app: "whatsapp", chat: "CasaVerde Notificaciones", texto: "🔧 Claude · Casa Verde", captado: "2026-09-30T12:00:00Z" }] };
  const r = armarNovedades(d, v, HOY);
  const m = r.items.filter((i) => i.clase === "mensajes");
  assert.deepEqual(m.map((i) => i.texto), ["Mensajes nuevos de Airbnb: 2"]);
  assert.equal(r.visto.mensajesHasta, "2026-09-30T12:00:00Z");
});
prueba("lo que trae plata, teléfonos o mails en el dato sale limpio", () => {
  assert.equal(limpiarParaAviso("Pagar R$ 450 a Juan +55 48 99926-4723"), "Pagar [monto] a Juan …723");
  assert.equal(limpiarParaAviso("escribile a juan@ejemplo.com"), "escribile a [mail]");
  assert.equal(limpiarParaAviso("Podrías ganar 637,94 R$ si hospedas"), "Podrías ganar [monto] si hospedas");
  assert.equal(limpiarParaAviso("x".repeat(80)).length, 60);
});
prueba("el texto armado pasa el control de avisos.mjs, aunque el dato venga sucio", () => {
  const items = [{ clase: "tarea", texto: "Tarea nueva: " + limpiarParaAviso("Cobrar 300 reales al +598 99 123 456") },
                 { clase: "reserva", texto: "Reserva nueva: Natalia · Loft · 20/11–22/11" }];
  const v = validarTexto(textoNovedades(items));
  assert.ok(v.ok, v.motivos.join("; "));
});
prueba("sólo Airbnb, y se cuenta sin nombrar (el «chat» puede ser un título con plata); WhatsApp no entra", () => {
  const d = { ...base, mensajes: [
    { app: "airbnb", chat: "Podrías ganar 637,94 R$ si hospedas a Natalia", captado: "2026-09-30T11:00:00Z" },
    { app: "whatsapp", chat: "Flor Brasil", captado: "2026-09-30T11:01:00Z" }] };
  const t = armarNovedades(d, { ...vistoVacio(), mensajesHasta: "2026-09-30T10:00:00Z" }, HOY).items
    .filter((i) => i.clase === "mensajes").map((i) => i.texto);
  assert.deepEqual(t, ["Mensajes nuevos de Airbnb: 1"]);
});
prueba("26 h sin latido del teléfono se avisa, una sola vez por silencio", () => {
  const v = { ...vistoVacio(), reservas: ["r1"] };
  const ahora = Date.parse("2026-09-30T11:00:00Z");
  const r = armarNovedades(base, v, HOY, { ahora, latido: "2026-09-29T08:00:00Z" });
  assert.deepEqual(r.items.map((i) => i.clase), ["telefono"]);
  assert.match(r.items[0].texto, /hace 27 h/);
  assert.equal(armarNovedades(base, r.visto, HOY, { ahora: ahora + 86400e3, latido: "2026-09-29T08:00:00Z" }).items.length, 0, "no se repite");
  assert.equal(armarNovedades(base, v, HOY, { ahora, latido: "2026-09-30T00:00:00Z" }).items.length, 0, "con 11 h no");
});
prueba("sin ningún latido todavía no se avisa, aunque no haya mensajes en días", () => {
  const v = { ...vistoVacio(), reservas: ["r1"], mensajesHasta: "2026-09-20T00:00:00Z" };
  assert.equal(armarNovedades(base, v, HOY, { ahora: Date.parse("2026-09-30T11:00:00Z") }).items.length, 0);
});
prueba("lo más urgente primero: fallas y pedidos, después check-in/out", () => {
  const t = textoNovedades([{ clase: "mensajes", texto: "M" }, { clase: "reserva", texto: "R" }, { clase: "reporte", texto: "F" }, { clase: "entrada", texto: "E" }]);
  assert.ok(t.startsWith("• F\n• E\n• R\n• M"), t);
});
prueba("si no entra, se recorta diciendo cuántas faltan, y nunca pasa el tope", () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ clase: "tarea", texto: `Tarea nueva: una tarea bastante larga número ${i}` }));
  const t = textoNovedades(items);
  assert.ok(t.length <= LARGO_MAX, String(t.length));
  assert.match(t, /…y \d+ más/);
});
prueba("«novedades» es un tema de avisos.mjs", () => assert.ok(TEMAS.novedades));

console.log(`\n${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
