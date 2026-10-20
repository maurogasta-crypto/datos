// ─────────────────────────────────────────────────────────────────────────────
// pruebas/herramientas/notificaciones.mjs — Banco de las notificaciones del
// teléfono de captura que la ronda clasifica (herramientas/notificaciones.mjs,
// pizarra-42, 19-oct-2026).
//
//   node pruebas/herramientas/notificaciones.mjs
//
// Sin npm ni red. Prueba qué entra a «sin revisar», qué vence, y lo que más
// importa: que borrar o marcar una notificación NO deje copia en `_historial`,
// porque esa copia la leen los administradores y desharía el descarte.
// ─────────────────────────────────────────────────────────────────────────────
import assert from "node:assert/strict";
import fs from "node:fs";
import { sinRevisar, vencidas, porApp, renglon, nombreApp, COLECCION, DIAS_VENCE } from "../../herramientas/notificaciones.mjs";

let pasadas = 0, fallidas = 0;
const prueba = (n, f) => { try { f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };

const AHORA = Date.parse("2026-10-19T18:00:00Z");
const N = (id, horasAtras, o = {}) => ({ id, app: "com.whatsapp", titulo: "Juan", texto: "Hola", lineas: [], cuando: AHORA - horasAtras * 36e5, ...o });
const L = [N("a", 1), N("b", 30), N("c", 2, { revisado: true, destino: "reserva" }), N("d", 200), N("e", 3, { app: "com.airbnb.android" })];

prueba("la colección es notificaciones y vence a los 7 días", () => { assert.equal(COLECCION, "notificaciones"); assert.equal(DIAS_VENCE, 7); });

prueba("sin revisar: las no marcadas, las más viejas primero", () => {
  assert.deepEqual(sinRevisar(L, 0, AHORA).map((n) => n.id), ["d", "b", "e", "a"]);
});
prueba("…de las últimas N horas, y de una app si se pide", () => {
  assert.deepEqual(sinRevisar(L, 24, AHORA).map((n) => n.id), ["e", "a"]);
  assert.deepEqual(sinRevisar(L, 0, AHORA, "com.airbnb.android").map((n) => n.id), ["e"]);
});
prueba("…y hasta una hora: lo que llegó después de leer no entra (notificaciones-3)", () => {
  assert.deepEqual(sinRevisar(L, 0, AHORA, "", AHORA - 2 * 36e5).map((n) => n.id), ["d", "b", "e"]);
});
prueba("descartar una app entera exige --hasta", () => {
  const t = fs.readFileSync(new URL("../../herramientas/notificaciones.mjs", import.meta.url), "utf8");
  assert.match(t, /if \(app && !hasta\) throw/);
});
prueba("vencen las de más de 7 días, revisadas o no; sin fecha no vence", () => {
  assert.deepEqual(vencidas(L, 7, AHORA).map((n) => n.id), ["d"]);
  assert.deepEqual(vencidas([N("r", 200, { revisado: true }), { id: "x" }], 7, AHORA).map((n) => n.id), ["r"]);
});
prueba("el resumen cuenta por app y separa las sin revisar", () => {
  const r = porApp(L);
  assert.equal(r[0].nombre, "WhatsApp"); assert.equal(r[0].total, 4); assert.equal(r[0].sinRevisar, 3);
  assert.equal(r[1].nombre, "Airbnb");
});
prueba("un paquete desconocido se muestra tal cual", () => {
  assert.equal(nombreApp("com.ejemplo.app"), "com.ejemplo.app"); assert.equal(nombreApp("com.whatsapp"), "WhatsApp");
});
prueba("lo leído por la pantalla de Facebook se nombra aparte (pizarra-44)", () => {
  assert.equal(nombreApp("com.facebook.katana·pantalla"), "Facebook (pantalla)");
  assert.equal(nombreApp("com.raro·pantalla"), "com.raro (pantalla)");
});
prueba("el renglón trae id, app, título, texto y líneas", () => {
  const t = renglon(N("z", 1, { lineas: ["uno", "dos"] }));
  assert.ok(t.startsWith("── z · 10-19 17:00 · WhatsApp · Juan")); assert.ok(t.includes("Hola")); assert.ok(t.includes("dos"));
});

const fs_ = fs.readFileSync(new URL("../../herramientas/firestore.mjs", import.meta.url), "utf8");
prueba("firestore.mjs: notificaciones es efímera en Casa Verde (sin copia en el historial)", () => {
  assert.match(fs_, /efimeras: \["notificaciones"\]/);
  assert.match(fs_, /if \(\(cfg\.efimeras \|\| \[\]\)\.includes\(String\(coleccion \|\| ""\)\.split\("\/"\)\[0\]\)\) return null;/);
});
prueba("…y no se respalda en la bodega (no está en `colecciones` de casaverde)", () => {
  const bloque = fs_.slice(fs_.indexOf("casaverde: {"), fs_.indexOf("efimeras: [\"notificaciones\"]"));
  const col = bloque.slice(bloque.indexOf("colecciones:"), bloque.indexOf("]", bloque.indexOf("colecciones:")));
  assert.ok(col.length > 20, "no encontré colecciones"); assert.ok(!col.includes("notificaciones"));
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
